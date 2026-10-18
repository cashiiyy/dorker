import ipaddress
import logging
import socket
from urllib.parse import urlparse, urljoin
from typing import Dict, Any, Optional, Tuple
import httpx
from bs4 import BeautifulSoup
from ..config import settings
from ..models.schemas import PreviewResponse

logger = logging.getLogger(__name__)

# Disallowed IP networks for SSRF prevention
BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("10.0.0.0/8"),        # Private network
    ipaddress.ip_network("172.16.0.0/12"),     # Private network
    ipaddress.ip_network("192.168.0.0/16"),    # Private network
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local / Cloud metadata (AWS, GCP, Azure)
    ipaddress.ip_network("0.0.0.0/8"),         # Broadcast
    ipaddress.ip_network("224.0.0.0/4"),       # Multicast
    ipaddress.ip_network("240.0.0.0/4"),       # Reserved
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),         # IPv6 link-local
]

class PreviewService:
    @staticmethod
    def is_ip_allowed(ip_str: str) -> bool:
        """Check if resolved IP belongs to any private or reserved network."""
        try:
            ip = ipaddress.ip_address(ip_str)
            for net in BLOCKED_NETWORKS:
                if ip in net:
                    return False
            # Check for standard global/public
            return ip.is_global
        except ValueError:
            return False

    @classmethod
    def validate_destination(cls, url: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Validate URL protocol and resolve hostname to ensure it's not SSRF."""
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, None, f"Unsupported URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted."

        hostname = parsed.hostname
        if not hostname:
            return False, None, "Invalid URL: missing hostname."

        # Block literal localhost keywords
        if hostname.lower() in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
            return False, None, f"Access to '{hostname}' is blocked by SSRF policy."

        # Resolve DNS
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            ips = {info[4][0] for info in addr_info}
            if not ips:
                return False, None, f"Could not resolve hostname '{hostname}'."

            for resolved_ip in ips:
                if not cls.is_ip_allowed(resolved_ip):
                    return False, None, f"Destination IP {resolved_ip} for '{hostname}' is a private or restricted network."
            
            return True, list(ips)[0], None
        except socket.gaierror as e:
            return False, None, f"DNS resolution failed for '{hostname}': {e}"

    @classmethod
    def sanitize_html(cls, raw_html: str) -> Tuple[str, str, Optional[str], str]:
        """Strip dangerous elements and extract title, meta description, and clean readable content."""
        soup = BeautifulSoup(raw_html, "html.parser")

        # 1. Extract title
        title = soup.title.string.strip() if soup.title and soup.title.string else "Preview Document"

        # 2. Extract meta description
        meta_desc = None
        desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if desc_tag and desc_tag.get("content"):
            meta_desc = desc_tag["content"].strip()

        # 3. Strip all active executable tags
        for dangerous_tag in soup(["script", "style", "iframe", "object", "embed", "form", "svg", "button", "input", "textarea"]):
            dangerous_tag.decompose()

        # 4. Remove inline event handlers & dangerous attributes
        for tag in soup.find_all(True):
            attrs = dict(tag.attrs)
            for attr in attrs:
                if attr.lower().startswith("on") or attr.lower() in ("href", "src", "action"):
                    val = str(tag[attr]).lower()
                    if "javascript:" in val or "data:" in val or attr.lower().startswith("on"):
                        del tag[attr]

        # 5. Extract text excerpt
        text_content = soup.get_text(separator=" ", strip=True)
        excerpt = " ".join(text_content.split()[:120])
        if len(text_content) > len(excerpt):
            excerpt += "..."

        # 6. Render sanitized inner content (up to 40KB for preview safety)
        body = soup.body if soup.body else soup
        clean_html = str(body)[:40000]

        return title, excerpt, meta_desc, clean_html

    async def fetch_preview(self, url: str) -> PreviewResponse:
        """Safely fetch and sanitize a remote public research page."""
        # Step 1: Initial SSRF destination validation
        is_valid, resolved_ip, err = self.validate_destination(url)
        if not is_valid:
            return PreviewResponse(
                url=url,
                title="SSRF Blocked",
                domain=urlparse(url).netloc,
                content_excerpt="",
                sanitized_html="",
                status="blocked",
                error=err
            )

        current_url = url
        redirect_count = 0
        timeout = settings.PREVIEW_TIMEOUT_SECONDS
        max_bytes = settings.PREVIEW_MAX_BYTES

        try:
            # Custom client without auto-following redirects to revalidate every redirect target
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
                while redirect_count <= settings.PREVIEW_MAX_REDIRECTS:
                    headers = {
                        "User-Agent": "SearchLensAI-PreviewBot/1.0 (+https://github.com/dorker/searchlens)",
                        "Accept": "text/html,text/plain"
                    }
                    resp = await client.get(current_url, headers=headers)

                    # Handle redirects with SSRF check on target
                    if resp.status_code in (301, 302, 303, 307, 308):
                        redirect_url = resp.headers.get("Location")
                        if not redirect_url:
                            break
                        # Resolve relative URLs
                        current_url = urljoin(current_url, redirect_url)
                        redirect_count += 1
                        
                        # Re-validate target
                        target_valid, _, redirect_err = self.validate_destination(current_url)
                        if not target_valid:
                            return PreviewResponse(
                                url=url,
                                title="Redirect Blocked",
                                domain=urlparse(current_url).netloc,
                                content_excerpt="",
                                sanitized_html="",
                                status="blocked",
                                error=f"Redirect target blocked: {redirect_err}"
                            )
                        continue

                    # Validate Content-Type
                    content_type = resp.headers.get("content-type", "").lower()
                    if not any(allowed in content_type for allowed in ("text/html", "text/plain", "application/xhtml+xml")):
                        return PreviewResponse(
                            url=current_url,
                            title="Unsupported Content Type",
                            domain=urlparse(current_url).netloc,
                            content_excerpt="",
                            sanitized_html="",
                            status="error",
                            error=f"Disallowed content-type: '{content_type}'. Previews restricted to HTML and Plain text."
                        )

                    # Check response size
                    raw_content = resp.content[:max_bytes].decode("utf-8", errors="replace")
                    title, excerpt, meta_desc, clean_html = self.sanitize_html(raw_content)

                    return PreviewResponse(
                        url=current_url,
                        title=title,
                        description=meta_desc,
                        domain=urlparse(current_url).netloc,
                        content_excerpt=excerpt,
                        sanitized_html=clean_html,
                        status="success"
                    )

                return PreviewResponse(
                    url=url,
                    title="Excessive Redirects",
                    domain=urlparse(url).netloc,
                    content_excerpt="",
                    sanitized_html="",
                    status="error",
                    error="Exceeded maximum allowed redirects (3)."
                )

        except httpx.TimeoutException:
            return PreviewResponse(
                url=url,
                title="Request Timeout",
                domain=urlparse(url).netloc,
                content_excerpt="",
                sanitized_html="",
                status="error",
                error=f"Connection timed out after {timeout}s while fetching preview."
            )
        except Exception as e:
            return PreviewResponse(
                url=url,
                title="Preview Error",
                domain=urlparse(url).netloc,
                content_excerpt="",
                sanitized_html="",
                status="error",
                error=str(e)
            )
