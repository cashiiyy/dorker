import re
from typing import List, Dict, Any, Tuple
from urllib.parse import urlparse

# Recognized Google search operators
RECOGNIZED_OPERATORS = [
    "site:",
    "filetype:",
    "ext:",
    "intitle:",
    "allintitle:",
    "inurl:",
    "allinurl:",
    "intext:",
    "allintext:",
    "before:",
    "after:",
    "source:",
    "related:",
    "cache:"
]

# Sensitive patterns that indicate illicit credential/PII harvesting
SENSITIVE_PATTERNS = [
    (r'("password"|"passwd"|"pwd"|"secret_key"|"api_key")\s+ext:(sql|dump|env|ini|log)', "credential_dump"),
    (r'site:(pastebin\.com|ghostbin\.com|controlc\.com)\s+.*("password"|"token")', "paste_credential_hunt"),
    (r'(id_rsa|id_dsa|\.aws/credentials|\.bash_history)\s+filetype:', "private_key_leak"),
    (r'("BEGIN PRIVATE KEY"|"BEGIN RSA PRIVATE KEY")', "private_key_leak"),
    (r'("cvv"|"ssn"|"credit\s*card"|"social\s*security")', "pii_harvesting"),
    (r'filetype:(env|cfg|ini)\s+("DB_PASSWORD"|"AWS_SECRET")', "env_secret_harvesting")
]

class QueryValidator:
    @staticmethod
    def extract_operators(query: str) -> List[str]:
        """Detect standard Google search operators used in the query."""
        found = []
        lower = query.lower()
        for op in RECOGNIZED_OPERATORS:
            if op in lower:
                found.append(op)
        if '"' in query:
            found.append('"" (exact phrase)')
        if " OR " in query or " | " in query:
            found.append("OR")
        if re.search(r'(^|\s)-[a-zA-Z0-9]', query):
            found.append("- (exclusion)")
        return list(dict.fromkeys(found))

    @staticmethod
    def extract_domains(query: str) -> List[str]:
        """Extract domains specified via site: operator."""
        matches = re.findall(r'site:([^\s]+)', query, flags=re.IGNORECASE)
        cleaned = []
        for m in matches:
            d = m.strip().lower().rstrip("/").lstrip("https://").lstrip("http://")
            # Remove any trailing operator or quote
            d = re.sub(r'["\')\]]+$', '', d)
            if d:
                cleaned.append(d)
        return cleaned

    @classmethod
    def validate_query(
        cls,
        query: str,
        target_domains: List[str] = None,
        category: str = None,
        authorized_domain_confirmed: bool = False
    ) -> Dict[str, Any]:
        """Validate query syntax, scope, and safety."""
        notes = []
        is_valid = True
        risk_level = "low"
        requires_scope_confirmation = False
        domain_scope_ok = True
        
        target_domains = [d.strip().lower().lstrip("https://").lstrip("http://") for d in (target_domains or []) if d.strip()]
        operators_found = cls.extract_operators(query)
        extracted_domains = cls.extract_domains(query)

        # 1. Syntax checks
        # Check quotes balance
        if query.count('"') % 2 != 0:
            notes.append("Warning: Unbalanced quotation marks in query.")
            is_valid = False

        # Check for empty operators like 'site:' with trailing space or end of string
        empty_ops = re.findall(r'\b(site|filetype|ext|intitle|inurl|intext):(?:\s|$)', query, flags=re.IGNORECASE)
        if empty_ops:
            for op in empty_ops:
                notes.append(f"Error: Empty operator '{op}:' without value.")
            is_valid = False

        # 2. Safety & prohibited content checks
        for pattern, label in SENSITIVE_PATTERNS:
            if re.search(pattern, query, flags=re.IGNORECASE):
                risk_level = "prohibited"
                is_valid = False
                notes.append(f"Prohibited pattern detected ({label}): Attempting to harvest sensitive secrets/credentials or private PII.")
                break

        # 3. Domain scope check
        if target_domains:
            if not extracted_domains:
                notes.append("Notice: Configured target domain not explicitly present in site: operator.")
                requires_scope_confirmation = True
            else:
                for ed in extracted_domains:
                    # Check if extracted domain matches or is subdomain of any target domain
                    matched = any(ed == td or ed.endswith(f".{td}") for td in target_domains)
                    if not matched:
                        domain_scope_ok = False
                        notes.append(f"Scope Alert: Domain '{ed}' is outside configured target scope: {target_domains}")
                        if category == "domain_exposure_audit":
                            risk_level = "high"
                            is_valid = False

        # 4. Domain Exposure Audit authorization gate
        if category == "domain_exposure_audit":
            if not authorized_domain_confirmed:
                requires_scope_confirmation = True
                notes.append("Audit Policy: Domain exposure audit requires explicit owner authorization confirmation.")
                if not target_domains and not extracted_domains:
                    is_valid = False
                    notes.append("Audit Policy: Audit queries must be constrained to explicit authorized target domains.")

        # If medium risk flags
        if risk_level == "low":
            if any(term in query.lower() for term in ["vulnerability", "exploit", "cve", "security advisory"]):
                risk_level = "medium"
            if "domain_exposure_audit" in (category or ""):
                risk_level = "medium"

        return {
            "is_valid": is_valid,
            "normalized_query": query.strip(),
            "operators_found": operators_found,
            "risk_level": risk_level,
            "domain_scope_ok": domain_scope_ok,
            "requires_scope_confirmation": requires_scope_confirmation,
            "notes": notes
        }

    @classmethod
    def sanitize_or_suggest_benign(cls, objective: str) -> Tuple[bool, str, str]:
        """Check if research objective is illicit and propose benign alternative."""
        lower = objective.lower()
        illicit_terms = [
            "dump passwords", "harvest credentials", "steal tokens",
            "find leaked database", "hack", "dump ssn", "credit cards leaked"
        ]
        for term in illicit_terms:
            if term in lower:
                benign = (
                    "Search for official security advisories, public CVE disclosures, "
                    "or OWASP defense guides regarding authentication hardening."
                )
                return False, f"Objective contains restricted term '{term}'. In accordance with safety policies, direct credential/leak harvesting is blocked.", benign
        return True, "", ""
