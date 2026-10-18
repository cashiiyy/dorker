import json
import logging
import re
import uuid
from typing import Dict, Any, List, Optional, Set
from ..models.schemas import GenerateQueriesRequest, GenerateQueriesResponse, GeneratedQuery
from .lm_studio import LMStudioClient
from .query_validator import QueryValidator

logger = logging.getLogger(__name__)

PRESET_PROMPT_INSTRUCTIONS = {
    "public_documentation": "Focus on locating official guides, API specs, architectural diagrams, and whitepapers. Use site:, filetype:pdf, intitle:documentation, inurl:docs.",
    "security_advisories": "Focus on locating vendor security advisories, CVE analyses, vulnerability disclosures, and defense bulletins. Use site:, intitle:advisory, intitle:CVE, inurl:security.",
    "code_repositories": "Focus on public open-source implementations, sample code, and GitHub/GitLab repositories. Use site:github.com OR site:gitlab.com, inurl:blob OR inurl:tree.",
    "datasets_papers": "Focus on public academic papers, preprints, and open datasets. Use site:arxiv.org OR site:huggingface.co OR site:kaggle.com, filetype:pdf.",
    "domain_exposure_audit": "Focus on assessing public indexing exposure for an authorized target domain (e.g. accidentally exposed test endpoints, staging paths, swagger docs). MUST strictly use site:<target_domain> and never stray outside scope.",
    "pdf_technical_docs": "Focus on locating deep technical PDF documentation, manuals, blueprints, and standards. Use filetype:pdf with specific technical terminology.",
    "indexing_diagnostics": "Focus on discovering indexed subdomains, legacy paths, and indexing hygiene. Use site:<target_domain> with negative filters (-inurl:www).",
    "academic_osint": "Focus on lawful open-source research across educational, governmental, and scientific open repositories."
}

STOPWORDS = {
    "find", "search", "give", "me", "the", "a", "an", "and", "or", "for", "in", "on", "at", "to",
    "with", "from", "by", "about", "as", "into", "like", "through", "after", "over", "between",
    "out", "against", "during", "without", "before", "under", "around", "among", "exposed", "open",
    "public", "all", "look", "show", "list", "check", "detect", "discover", "audit", "scan", "test",
    "please", "can", "you", "using", "query", "queries", "dork", "dorks", "google"
}

class QueryGeneratorService:
    def __init__(self, lm_client: Optional[LMStudioClient] = None):
        self.lm_client = lm_client or LMStudioClient()

    async def generate_queries(self, req: GenerateQueriesRequest) -> GenerateQueriesResponse:
        """Generate structured Google search queries using local Qwen model or elite deterministic synthesizer."""
        # 1. Safety check on objective
        is_safe, warning_msg, benign_alt = QueryValidator.sanitize_or_suggest_benign(req.objective)
        if not is_safe:
            alt_query = f"site:nvd.nist.gov OR site:cve.org {req.keywords[0] if req.keywords else 'vulnerability advisory'}"
            v_res = QueryValidator.validate_query(alt_query, req.target_domains, req.category.value, req.authorized_domain_confirmed)
            q_obj = GeneratedQuery(
                id=f"q-{uuid.uuid4().hex[:6]}",
                label="Benign Security Advisory Alternative",
                query=alt_query,
                purpose="Lawful security research alternative to prohibited objective",
                operators=v_res["operators_found"],
                risk_level="low",
                requires_scope_confirmation=False,
                is_valid=True,
                validation_notes=[warning_msg]
            )
            return GenerateQueriesResponse(
                research_title="Safety Redirection Notice",
                objective_summary=warning_msg,
                scope={
                    "domains": req.target_domains,
                    "category": req.category.value,
                    "authorized": req.authorized_domain_confirmed
                },
                queries=[q_obj],
                limitations=[
                    "Direct credential/secret harvesting objectives are strictly blocked by security guardrails.",
                    f"Recommended benign alternative: {benign_alt}"
                ],
                model_used=self.lm_client.model_id,
                is_local=True
            )

        # 2. Check if LM Studio is reachable; if not, immediately use the deterministic engine
        parsed_data = None
        model_used = self.lm_client.model_id
        is_local = True

        lm_online = await self.lm_client.is_reachable()
        if lm_online:
            try:
                category_instruction = PRESET_PROMPT_INSTRUCTIONS.get(req.category.value, "Generate high-precision search queries.")
                scope_str = ", ".join(req.target_domains) if req.target_domains else "Open Web (No domain restriction)"
                kw_str = ", ".join(req.keywords) if req.keywords else "None"
                ft_str = ", ".join(req.file_types) if req.file_types else "None"

                system_prompt = (
                    "You are an elite Google Dorking and OSINT specialist.\n"
                    "Transform the research objective into 4 to 6 precise, syntactically correct Google search operator queries.\n\n"
                    "STRICT OPERATOR SYNTAX RULES:\n"
                    "- site:domain.com — restricts to a specific domain (NO space after colon)\n"
                    "- filetype:pdf or ext:sql — restricts to file type (NO space after colon)\n"
                    "- intitle:\"keyword\" — page title must contain keyword\n"
                    "- inurl:keyword — URL must contain keyword\n"
                    "- intext:\"exact phrase\" — body text contains exact phrase\n"
                    "- \"exact phrase\" — exact match\n"
                    "- -keyword or -inurl:test — exclude keyword (dash prefix, NO space)\n"
                    "- OR — boolean alternative in capital letters\n\n"
                    "OUTPUT FORMAT (STRICT JSON ONLY):\n"
                    "{\n"
                    '  "research_title": "...",\n'
                    '  "objective_summary": "...",\n'
                    '  "queries": [\n'
                    '    {\n'
                    '      "label": "Brief descriptive label",\n'
                    '      "query": "exact copy-pasteable google dork query",\n'
                    '      "purpose": "What this query specifically targets and isolates",\n'
                    '      "operators": ["site:", "intitle:"],\n'
                    '      "risk_level": "low"\n'
                    "    }\n"
                    "  ],\n"
                    '  "limitations": ["..."]\n'
                    "}\n"
                    "Do NOT wrap in markdown fences. Output raw JSON only."
                )

                user_content = (
                    f"Research Objective: {req.objective}\n"
                    f"Category Preset: {req.category.value}\n"
                    f"Category Guidance: {category_instruction}\n"
                    f"Target Domains: {scope_str}\n"
                    f"Keywords: {kw_str}\n"
                    f"File Types: {ft_str}\n"
                    f"Date Range: {req.date_range or 'Any time'}\n"
                    f"Domain Owner Authorization Confirmed: {req.authorized_domain_confirmed}\n\n"
                    "Formulate 4 to 6 diverse, high-precision Google Dork queries."
                )

                raw_response = await self.lm_client.generate_chat([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ], max_tokens=2500, temperature=0.3)
                parsed_data = self._parse_json(raw_response)
            except Exception as e:
                logger.warning(f"LM Studio chat generation failed: {e}. Falling back to deterministic synthesizer.")
                parsed_data = None

        if not parsed_data or not parsed_data.get("queries"):
            parsed_data = self._synthesize_elite_dorks(req)
            model_used = "DORKER Neural Synthesizer (Rule Engine)" if not lm_online else f"{self.lm_client.model_id} (Enhanced Synthesizer)"

        # 3. Validate and sanitize each generated query
        validated_queries: List[GeneratedQuery] = []
        seen_queries = set()

        for idx, item in enumerate(parsed_data.get("queries", [])):
            raw_q = item.get("query", "").strip()
            # Only unwrap outer quotes if the entire string was mistakenly wrapped in outer quotes
            if (raw_q.startswith('"') and raw_q.endswith('"') and raw_q.count('"') % 2 != 0) or \
               (raw_q.startswith("'") and raw_q.endswith("'") and not raw_q.endswith("''")):
                raw_q = raw_q[1:-1].strip()
            
            # Ensure balanced double quotes if any operator used unclosed quote
            if raw_q.count('"') % 2 != 0:
                raw_q = raw_q + '"'

            if not raw_q:
                continue


            normalized_key = raw_q.lower()
            if normalized_key in seen_queries:
                continue
            seen_queries.add(normalized_key)

            v_result = QueryValidator.validate_query(
                raw_q,
                target_domains=req.target_domains,
                category=req.category.value,
                authorized_domain_confirmed=req.authorized_domain_confirmed
            )

            q_obj = GeneratedQuery(
                id=f"q-{uuid.uuid4().hex[:6]}",
                label=item.get("label", f"Dork Query {idx + 1}"),
                query=raw_q,
                purpose=item.get("purpose", "Precision Google search operator discovery"),
                operators=v_result["operators_found"],
                risk_level=v_result["risk_level"],
                requires_scope_confirmation=v_result["requires_scope_confirmation"],
                is_valid=v_result["is_valid"],
                validation_notes=v_result["notes"]
            )
            validated_queries.append(q_obj)

        return GenerateQueriesResponse(
            research_title=parsed_data.get("research_title", f"Dork Intelligence: {req.objective[:45]}"),
            objective_summary=parsed_data.get("objective_summary", req.objective),
            scope={
                "domains": req.target_domains,
                "category": req.category.value,
                "authorized": req.authorized_domain_confirmed
            },
            queries=validated_queries,
            limitations=parsed_data.get("limitations", [
                "Google operator behavior respects standard web indexing policies.",
                "Target domains and syntax validated by DORKER local security engine."
            ]),
            model_used=model_used,
            is_local=is_local
        )

    def _extract_core_terms(self, text: str) -> List[str]:
        """Extract meaningful keywords stripped of filler stopwords."""
        words = re.findall(r'[a-zA-Z0-9_\-\.]+', text)
        clean = []
        for w in words:
            lw = w.lower().strip(".-_")
            if len(lw) >= 2 and lw not in STOPWORDS:
                clean.append(lw)
        return clean

    def _synthesize_elite_dorks(self, req: GenerateQueriesRequest) -> Dict[str, Any]:
        """Synthesize authentic, highly effective Google Dorking commands based on intent and scope."""
        queries = []
        domain_scope = req.target_domains[0] if req.target_domains else ""
        domain_prefix = f"site:{domain_scope} " if domain_scope else ""
        obj_lower = req.objective.lower()
        terms = self._extract_core_terms(req.objective)
        
        # Incorporate explicit keywords if supplied
        if req.keywords:
            for kw in req.keywords:
                clean_kw = kw.strip().lower()
                if clean_kw and clean_kw not in terms:
                    terms.insert(0, clean_kw)

        primary_term = terms[0] if terms else "documentation"
        secondary_term = terms[1] if len(terms) > 1 else primary_term
        joint_terms = " ".join([f'"{t}"' for t in terms[:3]]) if len(terms) >= 2 else f'"{primary_term}"'

        ft_list = req.file_types if req.file_types else ["pdf"]
        ft_combined = " OR ".join([f"filetype:{ft}" for ft in ft_list[:3]])

        cat = req.category.value

        # Intent detection
        is_api = any(k in obj_lower for k in ["api", "swagger", "openapi", "endpoint", "rest", "graphql", "postman"])
        is_config = any(k in obj_lower for k in ["config", "env", "secret", "token", "key", "password", "leak", "exposed", "credential"])
        is_admin = any(k in obj_lower for k in ["admin", "login", "portal", "dashboard", "panel", "cpanel", "auth", "signin"])
        is_directory = any(k in obj_lower for k in ["index of", "directory", "folder", "parent directory", "traversal", "listing"])
        is_db = any(k in obj_lower for k in ["database", "sql", "dump", "sqlite", "postgres", "mysql", "backup", "db"])
        is_vuln = any(k in obj_lower for k in ["cve", "vulnerability", "advisory", "exploit", "bulletin", "patch"])
        is_cloud = any(k in obj_lower for k in ["s3", "bucket", "aws", "azure", "storage", "blob", "gcp", "firebase"])

        # ── 1. Primary Precision Dork ──
        if is_api:
            q1 = f"{domain_prefix}inurl:api OR inurl:swagger OR inurl:api-docs intitle:\"API\""
            desc1 = "Locates designated API document hubs, Swagger UI endpoints, and OpenAPI schemas"
        elif is_admin:
            q1 = f"{domain_prefix}inurl:admin OR inurl:login OR inurl:portal intitle:\"login\""
            desc1 = "Filters for administrative gateways, SSO login portals, and control dashboards"
        elif is_directory:
            q1 = f"{domain_prefix}intitle:\"index of /\" \"parent directory\""
            desc1 = "Detects open web directory listings with indexed folder hierarchies"
        elif is_config:
            q1 = f"{domain_prefix}(filetype:env OR filetype:ini OR filetype:conf) \"DB_\" OR \"API_\""
            desc1 = "Discovers indexed application configuration and environment parameter files"
        elif is_db:
            q1 = f"{domain_prefix}(filetype:sql OR filetype:dump OR filetype:bak) \"INSERT INTO\""
            desc1 = "Identifies indexed SQL database dumps, schema definitions, and table exports"
        elif is_vuln:
            q1 = f"{domain_prefix}intitle:\"security advisory\" OR intitle:\"CVE-\" {primary_term}"
            desc1 = "Isolates published vendor security advisories and official CVE disclosures"
        else:
            q1 = f"{domain_prefix}intitle:\"{primary_term}\" inurl:{secondary_term}"
            desc1 = f"Precision operator pairing page title '{primary_term}' with URL directory structure"

        queries.append({
            "label": "Precision Operator Alignment",
            "query": q1.strip(),
            "purpose": desc1,
            "operators": QueryValidator.extract_operators(q1)
        })

        # ── 2. Structural & Path Footprint ──
        if is_api:
            q2 = f"{domain_prefix}(inurl:v1 OR inurl:v2 OR inurl:v3) inurl:endpoints OR inurl:docs"
            desc2 = "Pins down versioned API path trees and developer endpoint references"
        elif is_admin:
            q2 = f"{domain_prefix}inurl:dashboard OR inurl:controlpanel -inurl:support"
            desc2 = "Discovers internal control panels while suppressing standard customer support pages"
        elif is_directory:
            q2 = f"{domain_prefix}intitle:\"index of\" \"last modified\" \"size\""
            desc2 = "Targets raw Apache, Nginx, or IIS server directory auto-indexing tables"
        elif is_cloud:
            q2 = f"site:s3.amazonaws.com OR site:storage.googleapis.com \"{primary_term}\""
            desc2 = "Queries public Amazon S3 and Google Cloud Storage buckets for target references"
        else:
            q2 = f"{domain_prefix}inurl:{primary_term} intitle:\"index\" -inurl:www"
            desc2 = "Explores shadow hosts and non-standard root directory paths"

        queries.append({
            "label": "Structural Path & Endpoint Mapping",
            "query": q2.strip(),
            "purpose": desc2,
            "operators": QueryValidator.extract_operators(q2)
        })

        # ── 3. Filetype & Document Harvest ──
        if is_config or is_db:
            exts = "filetype:log OR filetype:txt OR filetype:json"
            q3 = f"{domain_prefix}({exts}) \"{primary_term}\""
            desc3 = f"Harvests plaintext logs, manifests, and structured data containing {primary_term}"
        else:
            q3 = f"{domain_prefix}({ft_combined}) {joint_terms}"
            desc3 = f"Extracts technical downloadable assets ({', '.join(ft_list)}) matching core terminology"

        queries.append({
            "label": "Targeted Artifact & Filetype Extraction",
            "query": q3.strip(),
            "purpose": desc3,
            "operators": QueryValidator.extract_operators(q3)
        })

        # ── 4. Subdomain, Exclusion & Shadow Surface ──
        if domain_scope:
            q4 = f"site:{domain_scope} -inurl:www -inurl:help inurl:test OR inurl:dev OR inurl:staging"
            desc4 = f"Discovers hidden subdomains and pre-production staging environments on {domain_scope}"
        else:
            q4 = f"{domain_prefix}\"{primary_term}\" intext:\"documentation\" -inurl:blog -inurl:forum"
            desc4 = f"Isolates dedicated primary documentation by filtering conversational forum and blog noise"

        queries.append({
            "label": "Subdomain & Exclusion Hardening",
            "query": q4.strip(),
            "purpose": desc4,
            "operators": QueryValidator.extract_operators(q4)
        })

        # ── 5. Cross-Source & Open Source Footprint ──
        if is_api or "code" in cat or "repository" in cat:
            q5 = f"site:github.com OR site:gitlab.com inurl:blob \"{primary_term}\" {secondary_term}"
            desc5 = f"Scans public code hosting platforms for open source implementations and blueprints"
        elif is_vuln or "security" in cat:
            q5 = f"site:nvd.nist.gov OR site:cve.org \"{primary_term}\""
            desc5 = "Queries official National Vulnerability Database and CVE authority records"
        elif is_cloud:
            q5 = f"site:blob.core.windows.net OR site:firebaseio.com \"{primary_term}\""
            desc5 = "Probes Azure Blob storage and Firebase real-time database endpoints"
        else:
            q5 = f"site:github.com (filetype:json OR filetype:yaml) \"{primary_term}\""
            desc5 = "Discovers configuration templates, OpenAPI definitions, and schemas on GitHub"

        queries.append({
            "label": "Ecosystem & Repository Reconnaissance",
            "query": q5.strip(),
            "purpose": desc5,
            "operators": QueryValidator.extract_operators(q5)
        })

        return {
            "research_title": f"DORKER Intelligence: {req.objective[:45]}",
            "objective_summary": f"Deconstructed research objective with 5 high-precision operator vectors for '{req.objective}'",
            "queries": queries,
            "limitations": [
                "Generated via DORKER High-Precision Query Synthesizer.",
                "All Google search operators follow RFC & Google search indexing grammar.",
                "Ensure compliance with target terms of service and authorization guidelines."
            ]
        }

    def _parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON from model response text, stripping reasoning tags and markdown."""
        if not text:
            return None

        # Strip Qwen / DeepSeek <think>...</think> reasoning blocks
        cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Try markdown fences
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', cleaned, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

        # Try greedy outermost braces
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start:end+1]
            try:
                return json.loads(candidate)
            except Exception:
                # Remove trailing commas before closing braces/brackets
                candidate_fixed = re.sub(r',\s*([\}\]])', r'\1', candidate)
                try:
                    return json.loads(candidate_fixed)
                except Exception:
                    pass

        return None

