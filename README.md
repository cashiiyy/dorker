# 🎯 DORKER — OSINT & Search Intelligence Platform

> **Think. Dork. Discover.**  
> Turning natural language objectives into razor-sharp Google search operators with private local AI, safety guardrails, live SERP verification, and one-click Discord intelligence dispatch.

---

## 💡 What is DORKER?

Most people only scratch the surface of Google by typing ordinary keywords. Deep within Google’s indexing engine lies an advanced syntax called **Google Dorking** (`site:`, `filetype:`, `intitle:`, `inurl:`, `intext:`, `-exclusions`, boolean `OR`). When crafted correctly, these queries can locate exact technical documents, discover hidden endpoints, audit domain hygiene, uncover security advisories, and isolate research datasets in seconds.

**DORKER** is an AI workbench built for researchers, security analysts, and developers. You simply describe what you want to find in plain English, and DORKER:
1. **Understands your intent** using a private, local artificial intelligence model (no queries ever leave your computer).
2. **Translates it into professional search operators** adhering to strict Google syntax rules.
3. **Validates every command** against safety guardrails to ensure lawful, ethical research.
4. **Executes the search** using a live Google search engine (with built-in Mock Mode for zero-cost testing).
5. **Previews the discovered sources** safely in an isolated reader sandbox.
6. **Dispatches the intelligence report directly to your Discord channel** with a single click.

---

## ⚡ The 5-Step Workflow

DORKER tracks your mission every step of the way with an interactive **Workflow Checkpoints** panel in the left sidebar:

| Step | Milestone | Description |
|:---:|:---|:---|
| **1** | **Objective Defined** | Describe your target goal in natural English (e.g., *"Find API documentation and swagger endpoints for payment gateways"*). |
| **2** | **Dorks Synthesized** | The local AI formulates 4–6 specialized Google search operator queries tailored to your objective. |
| **3** | **Syntax Validated** | DORKER verifies quotation pairing, operator colons, target domain scopes, and checks against harmful patterns. |
| **4** | **SERP Executed** | Run any query against live Google results with real-time snippets, publication dates, and source links. |
| **5** | **Dispatched to Discord** | Review findings and transmit formatted embeds directly to your team’s Discord channel via webhook. |

---

## 🛡️ Key Highlights

- **🔒 100% Local-First Privacy**: Powered by local AI via LM Studio (Qwen 3.5 9B). Your queries, company names, and sensitive research objectives never leave your machine.
- **🎯 8 Research Presets**:
  - 📖 **Public Documentation**: Pinpoint developer portals, API schemas, and architecture whitepapers.
  - 🛡️ **Security Advisories**: Discover official CVE records, vendor security bulletins, and patch notes.
  - 💾 **Code & Repositories**: Scour open-source repositories on GitHub and GitLab for blueprinted implementations.
  - 📊 **Datasets & Papers**: Isolate academic research papers on arXiv, Kaggle, and HuggingFace.
  - 📡 **Domain Audit**: Authorized exposure analysis to verify what paths search engines have indexed.
  - 📑 **Technical PDFs**: Extract whitepapers, user manuals, and technical schematics.
  - 🖥️ **Indexing Diagnostics**: Audit subdomains and filter out standard landing pages (`-inurl:www`).
  - 🧭 **Academic OSINT**: Explore legitimate public institutional and scientific archives.
- **⚡ One-Click Discord Delivery**: Instant formatted webhook alerts with neat title cards, direct Google links, and source summaries.
- **🛡️ Built-in Ethical Guardrails**: Automatically blocks prohibited harvesting (passwords, private keys, database dumps) and redirects to lawful defensive advisories.
- **🔄 Live SERP & Free Mock Mode**: Supports live Google search via SerpApi, with a zero-cost realistic Mock Mode toggle in the top bar.
- **👓 Safe Document Preview**: Read public web pages safely in an SSRF-protected, script-sanitized modal without opening external browser tabs.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ (with npm)
- *(Optional)* [LM Studio](https://lmstudio.ai/) running locally for AI query synthesis (DORKER includes a built-in neural rule engine fallback if LM Studio is offline).

### 1. Clone & Configure
```bash
git clone https://github.com/cashiiyy/dorker.git
cd dorker
```

Create your `.env` file in the project root:
```ini
# Local AI Settings
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_MODEL=qwen3.5-9b-uncensored-hauhaucs-aggressive

# Google Search Settings (Leave blank to use free Mock Mode)
SERP_PROVIDER=serpapi
SERPAPI_API_KEY=your_serpapi_key_here
SERP_RESULT_LIMIT=10

# Discord Webhook Delivery (Optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
DISCORD_ENABLED=true
```

### 2. Build Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Launch DORKER
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Open your browser to: **`http://127.0.0.1:8000`**

*(For active frontend development with Hot Module Replacement, run `npm run dev` inside `frontend/` on port `5173`).*

---

## 💬 Discord Webhook Integration

DORKER delivers professional, color-coded intelligence reports straight to your server:
1. Copy any Discord channel's Webhook URL (*Channel Settings → Integrations → Webhooks*).
2. Paste it in DORKER's **Discord Sync** settings tab (or put it in `.env`).
3. Click **"Test Webhook"** to verify connection.
4. From the Workbench, click **"Send Dorks to Discord"** or select search results and hit **"Send to Discord"**.

---

## 📜 Ethical Use Notice

DORKER is designed for lawful, defensive security audits, academic research, and OSINT investigation. Always obtain explicit authorization before conducting exposure audits against third-party domains.

---

*Think. Dork. Discover.*
