import asyncio
import logging
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import urllib.parse
import httpx
from ..config import settings



from ..models.schemas import (
    ResearchSessionItem,
    DiscordMessagePreview,
    DiscordSendResponse,
    DiscordStatusResponse
)

logger = logging.getLogger(__name__)

# Patterns for sensitive tokens and credentials to redact before sending
REDACTION_PATTERNS = [
    (r'(?i)(?:password|passwd|pwd)[\s:=]+["\']?([^\s"\'&,;]+)["\']?', "[REDACTED_PASSWORD]"),
    (r'(?i)(?:api[_-]?key|secret|token|bearer)[\s:=]+["\']?([a-zA-Z0-9_\-\.]{12,})["\']?', "[REDACTED_TOKEN]"),
    (r'(?i)(?:BEGIN PRIVATE KEY|BEGIN RSA PRIVATE KEY)[\s\S]*?(?:END PRIVATE KEY|END RSA PRIVATE KEY)', "[REDACTED_PRIVATE_KEY]"),
    (r'\b(?:\d{3}-\d{2}-\d{4})\b', "[REDACTED_SSN]"),
    (r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b', "[REDACTED_CC]"),
]

class DiscordService:
    def __init__(self):
        self.webhook_url = settings.DISCORD_WEBHOOK_URL
        self.enabled = settings.DISCORD_ENABLED
        self.max_results_per_msg = settings.DISCORD_MAX_RESULTS_PER_MSG
        self.last_delivery: Optional[str] = None
        self.last_error: Optional[str] = None

    def update_config(self, webhook_url: str, enabled: bool = True, max_results: int = 5):
        self.webhook_url = webhook_url.strip()
        self.enabled = enabled
        self.max_results_per_msg = max(1, min(max_results, 10))

    def clear_config(self):
        self.webhook_url = ""
        self.enabled = False
        self.last_error = None

    def is_configured(self) -> bool:
        return bool(self.webhook_url and "discord.com/api/webhooks" in self.webhook_url)

    def get_status(self) -> DiscordStatusResponse:
        configured = self.is_configured()
        masked = "none"
        if configured:
            # Mask middle of webhook URL: https://discord.com/api/webhooks/123...****...xyz
            parts = self.webhook_url.split("/webhooks/")
            if len(parts) == 2:
                wh_id_token = parts[1]
                if "/" in wh_id_token:
                    wh_id, token = wh_id_token.split("/", 1)
                    masked = f"https://discord.com/api/webhooks/{wh_id}/...{token[-4:] if len(token) > 4 else '****'}"
                else:
                    masked = "https://discord.com/api/webhooks/...configured..."
            else:
                masked = "https://discord.com/api/webhooks/...configured..."

        return DiscordStatusResponse(
            configured=configured,
            enabled=self.enabled,
            masked_webhook=masked,
            max_results_per_msg=self.max_results_per_msg,
            last_delivery=self.last_delivery,
            last_error=self.last_error
        )

    def redact_text(self, text: str) -> str:
        """Sanitize sensitive strings and tokens from snippets or summaries."""
        if not text:
            return ""
        cleaned = text
        for pat, repl in REDACTION_PATTERNS:
            cleaned = re.sub(pat, repl, cleaned)
        return cleaned

    def build_payloads(
        self,
        session: ResearchSessionItem,
        selected_indices: List[int],
        custom_title: Optional[str] = None,
        query_executed: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Construct safe, bounded Discord payloads split by result chunks."""
        # Filter selected results
        all_results = session.results or []
        selected_results = []
        for idx in selected_indices:
            if 0 <= idx < len(all_results):
                selected_results.append((idx + 1, all_results[idx]))

        if not selected_results:
            raise ValueError("No valid results selected for delivery.")

        timestamp_iso = datetime.utcnow().isoformat() + "Z"
        title = custom_title or session.title
        title = self.redact_text(title)[:240]
        objective = self.redact_text(session.objective)[:300]
        query_str = self.redact_text(query_executed or (session.queries[0].get("query") if session.queries else "N/A"))[:400]
        category_clean = session.category.replace("_", " ").title()

        messages: List[Dict[str, Any]] = []

        # Split selected results into chunks
        chunk_size = self.max_results_per_msg
        result_chunks = [selected_results[i:i + chunk_size] for i in range(0, len(selected_results), chunk_size)]

        for part_idx, chunk in enumerate(result_chunks):
            embeds: List[Dict[str, Any]] = []

            # 1. Primary Header Embed (only on first chunk or labeled with part)
            header_desc = (
                f"**Objective:** {objective}\n"
                f"**Query:** `{query_str}`\n"
                f"**Category:** {category_clean} | **Scope:** Verified Public Sources\n"
                f"**Selected Results:** {len(selected_results)} (Part {part_idx + 1}/{len(result_chunks)})"
            )
            header_embed = {
                "title": f"Dorker Research Report: {title}" if part_idx == 0 else f"Dorker Report (Part {part_idx + 1}/{len(result_chunks)})",
                "description": header_desc[:4000],
                "color": 0x0EA5E9,  # Sky blue / cyan accent
                "timestamp": timestamp_iso,
                "fields": []
            }

            # Add fields for each result in this chunk
            for pos, res in chunk:
                r_title = self.redact_text(res.get("title", "Untitled"))[:200]
                link = res.get("link", "")
                domain = res.get("domain", "unknown")
                snippet = self.redact_text(res.get("snippet", ""))[:450]
                date_str = f" • {res.get('date')}" if res.get("date") else ""

                field_name = f"#{pos} {r_title}"[:250]
                field_val = (
                    f"**Source:** [{domain}]({link}){date_str}\n"
                    f"> {snippet}\n"
                )
                header_embed["fields"].append({
                    "name": field_name,
                    "value": field_val[:1000],
                    "inline": False
                })

            # Add Dorker standard footer
            header_embed["footer"] = {
                "text": f"Dorker v{settings.APP_VERSION} • Session: {session.id} • AI-assisted report (snippets may be incomplete)",
                "icon_url": "https://raw.githubusercontent.com/favicon.ico"
            }

            embeds.append(header_embed)
            messages.append({"embeds": embeds})

        return messages

    def preview_payload(
        self,
        session: ResearchSessionItem,
        selected_indices: List[int],
        custom_title: Optional[str] = None,
        query_executed: Optional[str] = None
    ) -> DiscordMessagePreview:
        """Generate a preview of the Discord message structure without sending."""
        payloads = self.build_payloads(session, selected_indices, custom_title, query_executed)
        all_embeds = []
        total_chars = 0
        for p in payloads:
            for emb in p.get("embeds", []):
                all_embeds.append(emb)
                total_chars += len(emb.get("title", "")) + len(emb.get("description", ""))
                for f in emb.get("fields", []):
                    total_chars += len(f.get("name", "")) + len(f.get("value", ""))

        return DiscordMessagePreview(
            content=None,
            embeds=all_embeds,
            total_characters=total_chars,
            message_count=len(payloads)
        )

    async def send_report(
        self,
        session: ResearchSessionItem,
        selected_indices: List[int],
        custom_title: Optional[str] = None,
        query_executed: Optional[str] = None
    ) -> DiscordSendResponse:
        """Deliver report payloads to the configured Discord Webhook."""
        if not self.enabled:
            raise ValueError("Discord integration is disabled in settings.")
        if not self.is_configured():
            raise ValueError("No valid Discord webhook URL configured.")

        payloads = self.build_payloads(session, selected_indices, custom_title, query_executed)
        sent_count = 0

        async with httpx.AsyncClient(timeout=10.0) as client:
            for p in payloads:
                retries = 0
                max_retries = 2
                while retries <= max_retries:
                    try:
                        resp = await client.post(self.webhook_url, json=p)

                        # Handle Discord rate limiting
                        if resp.status_code == 429:
                            retry_after = 2.0
                            try:
                                data = resp.json()
                                retry_after = float(data.get("retry_after", 2.0))
                            except Exception:
                                if "Retry-After" in resp.headers:
                                    retry_after = float(resp.headers["Retry-After"])
                            # Cap retry sleep at 5s
                            retry_after = min(retry_after, 5.0)
                            logger.warning(f"Discord rate limited. Backing off for {retry_after}s")
                            await asyncio.sleep(retry_after)
                            retries += 1
                            continue

                        if resp.status_code in (200, 204):
                            sent_count += 1
                            break
                        elif resp.status_code == 404:
                            self.last_error = "Discord webhook not found or deleted (404)."
                            raise RuntimeError(self.last_error)
                        elif resp.status_code == 401:
                            self.last_error = "Discord webhook authentication token invalid (401)."
                            raise RuntimeError(self.last_error)
                        else:
                            self.last_error = f"Discord returned HTTP {resp.status_code}: {resp.text[:100]}"
                            raise RuntimeError(self.last_error)

                    except httpx.TimeoutException:
                        retries += 1
                        if retries > max_retries:
                            self.last_error = "Discord webhook request timed out after 10s."
                            raise RuntimeError(self.last_error)
                        await asyncio.sleep(1.0)
                    except Exception as e:
                        if "429" not in str(e):
                            self.last_error = str(e)
                            raise

        now_str = datetime.utcnow().isoformat() + "Z"
        self.last_delivery = now_str
        self.last_error = None

        return DiscordSendResponse(
            success=True,
            messages_sent=sent_count,
            delivery_timestamp=now_str
        )

    async def test_webhook(self) -> Dict[str, Any]:
        """Send a lightweight test verification ping to Discord."""
        if not self.is_configured():
            return {"success": False, "error": "No Discord webhook URL configured."}

        test_payload = {
            "embeds": [{
                "title": f"Dorker Connection Test",
                "description": "Discord webhook integration successfully configured and verified.",
                "color": 0x10B981,  # Emerald
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "footer": {"text": f"Dorker v{settings.APP_VERSION} • Test Ping"}
            }]
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(self.webhook_url, json=test_payload)
                if resp.status_code in (200, 204):
                    self.last_delivery = datetime.utcnow().isoformat() + "Z"
                    self.last_error = None
                    return {"success": True, "status": resp.status_code}
                else:
                    err = f"Discord error HTTP {resp.status_code}: {resp.text[:120]}"
                    self.last_error = err
                    return {"success": False, "error": err}
        except Exception as e:
            err = f"Connection failed: {str(e)}"
            self.last_error = err
            return {"success": False, "error": err}

    async def send_dork_report(
        self,
        title: str,
        objective: str,
        queries: List[Dict[str, Any]],
        category: Optional[str] = "public_documentation"
    ) -> DiscordSendResponse:
        """Deliver synthesized Google search dorks directly to the Discord webhook."""
        if not self.enabled:
            raise ValueError("Discord integration is disabled in settings.")
        if not self.is_configured():
            raise ValueError("No valid Discord webhook URL configured.")

        now_str = datetime.utcnow().isoformat() + "Z"
        clean_title = self.redact_text(title)[:200]
        clean_obj = self.redact_text(objective)[:300]
        cat_clean = (category or "general").replace("_", " ").title()

        fields = []
        for i, q in enumerate(queries[:8]):
            label = self.redact_text(q.get("label", f"Dork #{i+1}"))
            dork = self.redact_text(q.get("query", ""))
            purpose = self.redact_text(q.get("purpose", ""))
            risk = q.get("risk_level", "low").upper()
            encoded_query = urllib.parse.quote_plus(dork)
            
            field_name = f"⚡ #{i+1} {label} [{risk}]"[:250]
            field_val = (
                f"```bash\n{dork}\n```\n"
                f"> *{purpose}*\n"
                f"[🔗 Run in Google Search](https://www.google.com/search?q={encoded_query})\n"
            )
            fields.append({
                "name": field_name,
                "value": field_val[:1000],
                "inline": False
            })

        embed = {
            "title": f"🎯 DORKER Intelligence: {clean_title}",
            "description": (
                f"**Research Objective:** {clean_obj}\n"
                f"**Category:** `{cat_clean}` • **Synthesized Queries:** `{len(queries)}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ),
            "color": 0x00F0FF,  # Cyan neon
            "timestamp": now_str,
            "fields": fields,
            "footer": {
                "text": f"DORKER v{settings.APP_VERSION} • Live Operator Intelligence Dispatch",
                "icon_url": "https://raw.githubusercontent.com/favicon.ico"
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(self.webhook_url, json={"embeds": [embed]})
            if resp.status_code not in (200, 204):
                self.last_error = f"Discord returned HTTP {resp.status_code}: {resp.text[:120]}"
                raise RuntimeError(self.last_error)

        self.last_delivery = now_str
        self.last_error = None
        return DiscordSendResponse(success=True, messages_sent=1, delivery_timestamp=now_str)

    async def send_direct_results(
        self,
        query: str,
        results: List[Dict[str, Any]],
        title: Optional[str] = None,
        objective: Optional[str] = None
    ) -> DiscordSendResponse:
        """Deliver live search results directly without needing a persistent session ID."""
        if not self.enabled:
            raise ValueError("Discord integration is disabled in settings.")
        if not self.is_configured():
            raise ValueError("No valid Discord webhook URL configured.")

        now_str = datetime.utcnow().isoformat() + "Z"
        clean_query = self.redact_text(query)[:250]
        display_title = title or f"SERP Results for: {clean_query[:50]}"
        
        fields = []
        for i, res in enumerate(results[:self.max_results_per_msg]):
            r_title = self.redact_text(res.get("title", "Untitled Document"))[:180]
            link = res.get("link", "")
            domain = res.get("domain", "web")
            snippet = self.redact_text(res.get("snippet", ""))[:350]
            date_str = f" • {res.get('date')}" if res.get("date") else ""
            
            field_name = f"#{i+1} {r_title}"[:220]
            field_val = (
                f"**Source:** [{domain}]({link}){date_str}\n"
                f"> {snippet}\n"
            )
            fields.append({
                "name": field_name,
                "value": field_val[:1000],
                "inline": False
            })

        embed = {
            "title": f"🌐 DORKER Search Results: {display_title}",
            "description": (
                f"**Executed Operator Query:**\n`{clean_query}`\n"
                + (f"**Objective:** {self.redact_text(objective)[:200]}\n" if objective else "")
                + f"**Captured Findings:** {len(results)} sources returned\n"
                + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ),
            "color": 0x10B981,  # Emerald
            "timestamp": now_str,
            "fields": fields,
            "footer": {
                "text": f"DORKER v{settings.APP_VERSION} • Public Source Intelligence",
                "icon_url": "https://raw.githubusercontent.com/favicon.ico"
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(self.webhook_url, json={"embeds": [embed]})
            if resp.status_code not in (200, 204):
                self.last_error = f"Discord returned HTTP {resp.status_code}: {resp.text[:120]}"
                raise RuntimeError(self.last_error)

        self.last_delivery = now_str
        self.last_error = None
        return DiscordSendResponse(success=True, messages_sent=1, delivery_timestamp=now_str)

