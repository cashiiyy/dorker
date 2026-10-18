import json
import logging
import re
import uuid
from typing import Dict, Any, List, Optional
from ..models.schemas import GenerateQueriesRequest, GenerateQueriesResponse, GeneratedQuery
from .lm_studio import LMStudioClient
from .query_validator import QueryValidator

logger = logging.getLogger(__name__)

PRESET_PROMPT_INSTRUCTIONS = {
    "public_documentation": "Focus on locating official guides, API specs, architectural diagrams, and whitepapers. Use site:, filetype:pdf, intitle:documentation.",
    "security_advisories": "Focus on locating vendor security advisories, CVE analyses, vulnerability disclosures, and defense bulletins. Use site:, intitle:advisory, intitle:CVE.",
    "code_repositories": "Focus on public open-source implementations, sample code, and GitHub/GitLab repositories. Use site:github.com OR site:gitlab.com, inurl:blob OR inurl:tree.",
    "datasets_papers": "Focus on public academic papers, preprints, and open datasets. Use site:arxiv.org OR site:huggingface.co OR site:kaggle.com, filetype:pdf.",
    "domain_exposure_audit": "Focus on assessing public indexing exposure for an authorized target domain (e.g. accidentally exposed test endpoints, staging paths, swagger docs). MUST strictly use site:<target_domain> and never stray outside scope.",
    "pdf_technical_docs": "Focus on locating deep technical PDF documentation, manuals, blueprints, and standards. Use filetype:pdf with specific technical terminology.",
    "indexing_diagnostics": "Focus on discovering indexed subdomains, legacy paths, and indexing hygiene. Use site:<target_domain> with negative filters (-inurl:www).",
    "academic_osint": "Focus on lawful open-source research across educational, governmental, and scientific open repositories."
}

class QueryGeneratorService:
    def __init__(self, lm_client: Optional[LMStudioClient] = None):
        self.lm_client = lm_client or LMStudioClient()

    async def generate_queries(self, req: GenerateQueriesRequest) -> GenerateQueriesResponse:
        """Generate structured Google search queries using local Qwen model with fallback."""
        # 1. Safety check on objective
        is_safe, warning_msg, benign_alt = QueryValidator.sanitize_or_suggest_benign(req.objective)
        if not is_safe:
            # Return safe structured response with explanation and benign alternative
            alt_query = f"site:nvd.nist.gov OR site:cve.org {req.keywords[0] if req.keywords else 'vulnerability advisory'}"
            v_res = QueryValidator.validate_query(alt_query, req.target_domains, req.category.value, req.authorized_domain_confirmed)
            q_obj = GeneratedQuery(
                id=str(uuid.uuid4())[:8],
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

        # 2. Prepare structured prompt for Qwen
        category_instruction = PRESET_PROMPT_INSTRUCTIONS.get(req.category.value, "Generate high-precision search queries.")
        scope_str = ", ".join(req.target_domains) if req.target_domains else "Open Web (No domain restriction)"
        kw_str = ", ".join(req.keywords) if req.keywords else "None"
        ft_str = ", ".join(req.file_types) if req.file_types else "None"
        
        system_prompt = (
            "You are an expert Google Search Operator and OSINT research strategist. "
            "Your mission is to transform the user's research objective into 3 to 6 high-precision, "
            "advanced Google search operator queries.\n"
            "Supported search operators include: site:, filetype:, intitle:, inurl:, intext:, exact quotes \"...\", OR, -negation.\n"
            "Safety Rules:\n"
            "- NEVER generate queries targeting leaked passwords, private keys, database dumps, personal PII, or confidential credentials.\n"
            "- NEVER suggest unauthorized exploitation.\n"
            "You must output STRICT JSON matching this schema:\n"
            "{\n"
            '  "research_title": "Concise title",\n'
            '  "objective_summary": "Summary of research goals",\n'
            '  "queries": [\n'
            "    {\n"
            '      "label": "Brief descriptive label",\n'
            '      "query": "The exact Google query string with operators",\n'
            '      "purpose": "Why this query was formulated",\n'
            '      "operators": ["site:", "filetype:"],\n'
            '      "risk_level": "low"\n'
            "    }\n"
            "  ],\n"
            '  "limitations": ["Any search limitation notes"]\n'
            "}\n"
            "Output ONLY the valid JSON object. Do not enclose in markdown ticks if possible, or use standard json blocks."
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
            "Formulate 3 to 5 distinct queries ranging from broad discovery to deep targeted operator queries."
        )

        # 3. Call Qwen on LM Studio
        model_used = self.lm_client.model_id
        is_local = True
        raw_response = ""
        parsed_data = None

        try:
            raw_response = await self.lm_client.generate_chat([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ], max_tokens=2500, temperature=0.3)
            parsed_data = self._parse_json(raw_response)
        except Exception as e:
            logger.warning(f"LM Studio generation failed ({e}). Using deterministic rule-based query synthesizer fallback.")
            parsed_data = self._heuristic_fallback(req)
            model_used = f"{self.lm_client.model_id} (fallback active: {str(e)[:60]})"

        if not parsed_data or not parsed_data.get("queries"):
            parsed_data = self._heuristic_fallback(req)

        # 4. Validate and sanitize each generated query
        validated_queries: List[GeneratedQuery] = []
        seen_queries = set()

        for idx, item in enumerate(parsed_data.get("queries", [])):
            raw_q = item.get("query", "").strip()
            if not raw_q:
                continue

            # Deduplication
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
                label=item.get("label", f"Query {idx + 1}"),
                query=raw_q,
                purpose=item.get("purpose", "Targeted search discovery"),
                operators=v_result["operators_found"],
                risk_level=v_result["risk_level"],
                requires_scope_confirmation=v_result["requires_scope_confirmation"],
                is_valid=v_result["is_valid"],
                validation_notes=v_result["notes"]
            )
            validated_queries.append(q_obj)

        return GenerateQueriesResponse(
            research_title=parsed_data.get("research_title", f"Research: {req.objective[:40]}"),
            objective_summary=parsed_data.get("objective_summary", req.objective),
            scope={
                "domains": req.target_domains,
                "category": req.category.value,
                "authorized": req.authorized_domain_confirmed
            },
            queries=validated_queries,
            limitations=parsed_data.get("limitations", [
                "Search engine index freshness may vary.",
                "Google operator behavior respects standard indexing permissions."
            ]),
            model_used=model_used,
            is_local=is_local
        )

    def _parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON from model response text."""
        # Try direct parse
        try:
            return json.loads(text.strip())
        except Exception:
            pass

        # Try to extract ```json ... ``` block
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

        # Try to find leftmost { and rightmost }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                pass

        return None

    def _heuristic_fallback(self, req: GenerateQueriesRequest) -> Dict[str, Any]:
        """Deterministic high-quality query builder when LM Studio is offline."""
        queries = []
        domain_part = f"site:{req.target_domains[0]} " if req.target_domains else ""
        obj = req.objective.strip()

        # 1. Broad objective query
        queries.append({
            "label": "Broad Research Discovery",
            "query": f"{domain_part}\"{obj}\"".strip(),
            "purpose": "Locate exact phrases matching the core objective",
            "operators": ["site:", '"" (exact phrase)'] if domain_part else ['"" (exact phrase)']
        })

        # 2. Targeted inurl/intitle
        first_kw = req.keywords[0] if req.keywords else obj.split()[0]
        queries.append({
            "label": "Targeted Title & URL Matching",
            "query": f"{domain_part}intitle:{first_kw} inurl:{first_kw}".strip(),
            "purpose": "Filter for dedicated subject pages and directories",
            "operators": ["site:", "intitle:", "inurl:"] if domain_part else ["intitle:", "inurl:"]
        })

        # 3. File type documentation
        ft = req.file_types[0] if req.file_types else "pdf"
        queries.append({
            "label": f"Technical Document Extraction ({ft.upper()})",
            "query": f"{domain_part}filetype:{ft} {obj}".strip(),
            "purpose": f"Discover downloadable technical {ft.upper()} documents",
            "operators": ["site:", "filetype:"] if domain_part else ["filetype:"]
        })

        # 4. Scope specific query
        if req.category.value == "domain_exposure_audit" and req.target_domains:
            queries.append({
                "label": "Authorized Subdomain & Path Exposure",
                "query": f"site:{req.target_domains[0]} -inurl:www intitle:\"index of\"",
                "purpose": "Identify exposed directory indexing outside standard www hosts",
                "operators": ["site:", "- (exclusion)", "intitle:"]
            })
        elif req.category.value == "security_advisories":
            queries.append({
                "label": "Security Bulletins & CVE Analysis",
                "query": f"{domain_part}intitle:\"security advisory\" OR intitle:CVE {obj}".strip(),
                "purpose": "Isolate official security advisories and vulnerability bulletins",
                "operators": ["site:", "intitle:", "OR"] if domain_part else ["intitle:", "OR"]
            })

        return {
            "research_title": f"Investigation: {obj[:40]}",
            "objective_summary": f"Structured query decomposition for {obj}",
            "queries": queries,
            "limitations": [
                "Queries generated using local heuristic engine (LM Studio inference was unavailable or offline).",
                "All Google search operators remain fully functional."
            ]
        }
