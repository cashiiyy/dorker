import pytest
from backend.app.services.query_validator import QueryValidator

def test_operator_extraction():
    q = 'site:example.org filetype:pdf intitle:"API Reference" inurl:v1 OR intext:token -draft'
    ops = QueryValidator.extract_operators(q)
    assert "site:" in ops
    assert "filetype:" in ops
    assert "intitle:" in ops
    assert "inurl:" in ops
    assert "intext:" in ops
    assert '"" (exact phrase)' in ops
    assert "OR" in ops
    assert "- (exclusion)" in ops

def test_unbalanced_quotes():
    q = 'site:example.com intitle:"unbalanced quote'
    res = QueryValidator.validate_query(q)
    assert res["is_valid"] is False
    assert any("quotation marks" in n.lower() for n in res["notes"])

def test_empty_operator():
    q = 'site: inurl:admin'
    res = QueryValidator.validate_query(q)
    assert res["is_valid"] is False
    assert any("empty operator" in n.lower() for n in res["notes"])

def test_domain_scope_enforcement():
    # Query targets external domain outside permitted target
    q = 'site:attacker.com inurl:admin'
    res = QueryValidator.validate_query(q, target_domains=["example.org"])
    assert res["domain_scope_ok"] is False
    assert any("outside configured target scope" in n for n in res["notes"])

def test_domain_scope_allowed():
    # Query targets permitted domain or subdomain
    q = 'site:sub.example.org filetype:pdf'
    res = QueryValidator.validate_query(q, target_domains=["example.org"])
    assert res["domain_scope_ok"] is True
    assert res["is_valid"] is True

def test_domain_exposure_audit_authorization_gate():
    q = 'site:mycompany.com intitle:"index of"'
    # When authorized_domain_confirmed is False
    res = QueryValidator.validate_query(
        q,
        target_domains=["mycompany.com"],
        category="domain_exposure_audit",
        authorized_domain_confirmed=False
    )
    assert res["requires_scope_confirmation"] is True
    assert any("requires explicit owner authorization" in n for n in res["notes"])

def test_prohibited_credential_dump_blocked():
    q = 'site:pastebin.com "password" ext:sql'
    res = QueryValidator.validate_query(q)
    assert res["is_valid"] is False
    assert res["risk_level"] == "prohibited"
    assert any("prohibited" in n.lower() for n in res["notes"])

def test_unsafe_objective_redirection():
    obj = "Help me dump passwords and leaked database credentials"
    is_safe, msg, benign = QueryValidator.sanitize_or_suggest_benign(obj)
    assert is_safe is False
    assert "restricted term" in msg
    assert "security advisories" in benign
