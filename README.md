# SearchLens AI — Google Search Operator Workbench

SearchLens AI is an advanced, AI-assisted research dashboard that converts natural-language research requests into verified Google search queries (`site:`, `filetype:`, `intitle:`, `inurl:`, `intext:`, `"exact quotes"`, `OR`, `-exclusion`). It performs client- and server-side validation, executes search retrieval through a configurable SERP provider adapter (with built-in zero-cost Mock Mode), safely previews public research documents behind an SSRF protection layer, and persists research sessions locally in SQLite.

---

## 🌟 Key Features

1. **Local-First AI Query Synthesis**
   - Integrates with local **LM Studio** running the uncensored **Qwen 3.5 9B** model (`qwen3.5-9b-uncensored-hauhaucs-aggressive`).
   - Deep model spec inspection via `lms` CLI: model identifier, parameter count (9B), context length (68,225 tokens), size (6.55 GB), and architecture (`qwen35`).
   - Zero telemetry: research objectives never leave your machine.
   - Robust heuristic query fallback: workbench remains 100% operational even when LM Studio is offline or under heavy load.

2. **8 Specialized Research Presets**
   - **Public Documentation Discovery**: API specs, developer portals, architecture manuals.
   - **Security Advisories & Vulnerability Research**: CVE disclosures, vendor bulletins, security patches.
   - **Public Code & Repository Research**: GitHub & GitLab trees, blobs, release archives.
   - **Public Datasets & Research Papers**: arXiv, HuggingFace, Kaggle datasets, OpenData repositories.
   - **Authorized Domain Exposure Audits**: Scope-constrained enumeration of accidentally indexed subdomains or test routes.
   - **Technical PDF Extraction**: Whitepapers, schematics, technical specifications.
   - **Website Indexing Diagnostics**: Negative filters (`-inurl:www`), index hygiene, directory structures.
   - **Academic OSINT**: Lawfully accessible open-source intelligence across educational and governmental resources.

3. **Strict Security Guardrails & Prohibited Content Prevention**
   - Blocks illicit credential dumps, password leaks (`ext:sql`, `ext:env`, `id_rsa`), and private PII harvesting.
   - Automatic benign redirection: transforms unsafe harvesting objectives into lawful security advisories, synthetic datasets, or defensive OWASP guides.
   - Mandatory authorization confirmation gate for domain exposure audits.

4. **Configurable SERP Provider with Mock Mode**
   - Provider adapter decoupling backend from proprietary APIs.
   - Supports SerpApi with server-side API key management.
   - Built-in realistic Mock Mode when `SERPAPI_API_KEY` is omitted, eliminating test API credit consumption.
   - Searches only fire upon explicit user interaction.

5. **SSRF-Safe Public Document Preview Sandbox**
   - Strictly validates target URLs against loopback (127.0.0.1, ::1), RFC1918 private subnets (10.x, 172.16.x, 192.168.x), and cloud metadata (169.254.169.254).
   - Re-resolves and validates DNS on every redirect hop (max 3 redirects).
   - Sanitizes remote HTML: completely strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, inline event handlers, and active macros.

6. **Persistence & Markdown Export**
   - SQLite persistence (`searchlens.db`) stores sessions, queries, results, and analyst notes.
   - One-click export to structured Markdown reports.

---

## 🏗️ Architecture

```
SearchLens AI
├── backend/
│   ├── app/
│   │   ├── config.py              # Pydantic settings & env management
│   │   ├── main.py                # FastAPI app & static file mounting
│   │   ├── models/schemas.py      # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── lm_studio.py       # LM Studio OpenAI-compatible client & CLI inspector
│   │   │   ├── query_validator.py # Operator syntax, scope, and safety guardrails
│   │   │   ├── query_generator.py # Qwen prompt orchestrator & heuristic fallback
│   │   │   ├── serp_adapter.py    # SERP provider adapter (SerpApi & Mock)
│   │   │   ├── preview_service.py # SSRF protection & BeautifulSoup sanitizer
│   │   │   └── research_session.py# SQLite research persistence & export
│   │   └── api/routes.py          # REST endpoints
│   └── tests/                     # 20 automated pytest test cases
├── frontend/                      # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── components/            # Sidebar, TopBar, Workbench, QueryCard, Results, Preview
│   │   ├── api.ts                 # Typed fetch client
│   │   └── types.ts               # Shared TypeScript interfaces
└── searchlens.db                  # Local SQLite database
```

---

## 🚀 Setup & Startup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- LM Studio (optional for local Qwen inference; heuristic fallback works without it)

### 1. Backend Setup

```bash
# In project root:
python -m pip install fastapi uvicorn pydantic pydantic-settings httpx beautifulsoup4 pytest
```

### 2. Configure Environment (`.env`)

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key configuration options:
```ini
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_MODEL=qwen3.5-9b-uncensored-hauhaucs-aggressive
LM_STUDIO_TIMEOUT_SECONDS=15.0

# SERP Settings (Leave empty for zero-cost Mock Mode)
SERP_PROVIDER=serpapi
SERPAPI_API_KEY=
SERP_RESULT_LIMIT=10

DATABASE_URL=sqlite:///./searchlens.db
APP_ENV=development
LOG_LEVEL=INFO
```

### 3. Frontend Build

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Run Application

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Open your browser to: **`http://127.0.0.1:8000`**

---

## 🤖 LM Studio Model Loading

1. Launch **LM Studio**.
2. Download or select model: `qwen3.5-9b-uncensored-hauhaucs-aggressive` (or set `LM_STUDIO_MODEL` in `.env`).
3. Under the **Developer** tab, start the local server on port **1234**.
4. Verify with CLI:
   ```bash
   lms ps
   ```

---

## 🧪 Automated Test Suite

Run all 20 backend unit and integration tests:
```bash
python -m pytest backend/tests
```

### Test Coverage Highlights:
- `backend/tests/test_validation.py`: Google search operator extraction, unbalanced quote handling, scope boundary enforcement, prohibited credential detection, benign redirection.
- `backend/tests/test_preview_ssrf.py`: SSRF prevention for loopback, private RFC1918 subnets, cloud metadata endpoints, and HTML script sanitization.
- `backend/tests/test_serp_adapter.py`: Mock provider behavior, result limits, and response normalization.
- `backend/tests/test_api_endpoints.py`: End-to-end FastAPI endpoint testing including `/api/health`, `/api/models`, `/api/queries/validate`, `/api/search`, and `/api/research` session lifecycle.
