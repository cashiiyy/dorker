import pytest
from backend.app.services.preview_service import PreviewService

def test_ssrf_blocks_loopback_and_metadata():
    assert PreviewService.is_ip_allowed("127.0.0.1") is False
    assert PreviewService.is_ip_allowed("127.0.0.5") is False
    assert PreviewService.is_ip_allowed("169.254.169.254") is False  # AWS/GCP metadata
    assert PreviewService.is_ip_allowed("10.0.0.1") is False         # Private RFC1918
    assert PreviewService.is_ip_allowed("192.168.1.1") is False      # Private RFC1918
    assert PreviewService.is_ip_allowed("172.16.0.1") is False       # Private RFC1918
    assert PreviewService.is_ip_allowed("::1") is False              # IPv6 loopback

def test_ssrf_allows_public_ip():
    # 8.8.8.8 is Google Public DNS
    assert PreviewService.is_ip_allowed("8.8.8.8") is True
    # 1.1.1.1 is Cloudflare Public DNS
    assert PreviewService.is_ip_allowed("1.1.1.1") is True

def test_validate_destination_blocks_localhost():
    is_valid, _, err = PreviewService.validate_destination("http://localhost:8080/secret")
    assert is_valid is False
    assert "blocked by SSRF policy" in err

def test_validate_destination_blocks_metadata():
    is_valid, _, err = PreviewService.validate_destination("http://169.254.169.254/latest/meta-data/")
    assert is_valid is False

def test_html_sanitization_removes_scripts_and_handlers():
    raw_html = """
    <html>
        <head><title>Research Paper Title</title></head>
        <body>
            <h1>Heading 1</h1>
            <p>This is safe public research content.</p>
            <script>alert('XSS');</script>
            <iframe src="http://evil.com"></iframe>
            <a href="javascript:stealToken()" onclick="sendCookies()">Click here</a>
        </body>
    </html>
    """
    title, excerpt, meta_desc, clean_html = PreviewService.sanitize_html(raw_html)
    assert title == "Research Paper Title"
    assert "safe public research content" in excerpt
    assert "<script>" not in clean_html
    assert "<iframe>" not in clean_html
    assert "javascript:" not in clean_html
    assert "onclick" not in clean_html
