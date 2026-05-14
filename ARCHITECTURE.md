# Schemo Architecture & File Map

This document breaks down the core components of the Schemo repository. To provide a zero-friction experience for students, the architecture is split into a Python backend API and a static React frontend dashboard.

---

## 1. The Engine: API & MCP Server (`src/schemo_server/`)

### `server.py`
- **Purpose:** The core entry point for the backend. It uses FastAPI to serve standard REST endpoints and `FastMCP` to serve Model Context Protocol endpoints.
- **Connections:** This server runs on a cloud provider (e.g., Render) at `api-schemo.shaniai.tech`.
- **Logic:** 
  - **OpenAPI REST:** Defines Pydantic models to expose `/api/plot` and `/api/circuit` for ChatGPT Custom GPT Actions.
  - **MCP SSE:** Mounts a FastMCP Server-Sent Events (SSE) app at `/mcp` allowing Claude Desktop to connect remotely via `npx @modelcontextprotocol/client-sse`.
  - **Math Engine:** Uses `python-control` and `matplotlib` to generate static fallback PNGs encoded in Base64.
  - **ChatGPT Widget Linking:** Returns the `openai/outputTemplate` metadata tag to trigger ChatGPT's interactive iframe widgets.

### `circuit_renderer.py`
- **Purpose:** A utility module dedicated to interfacing with the `schemdraw` library.
- **Logic:** Iterates over the components provided by the LLM and places them on a 2D grid, exporting the final drawing to a raw PNG byte string.

---

## 2. The Dashboard: React Client (`widget/`)

- **Purpose:** An interactive, dark-mode engineering dashboard for exploring generated plots. Hosted globally on Cloudflare Pages (`schemo.shaniai.tech`).
- **Logic:** 
  - Entirely stateless. It receives transfer function data via URL parameters (e.g., `?system=bode&num=100&den=1,10,100`).
  - Calculates complex math (Bode, Nyquist, Root Locus) entirely client-side using a custom TypeScript library (`widget/src/lib/control.ts`), eliminating latency and the need to communicate with the Python backend.
  - Renders professional SVG charts using `Plotly.js`.

---

## 3. Configuration

### `pyproject.toml`
- Defines the Python backend dependencies. It includes math libraries (`control`, `numpy`, `scipy`, `matplotlib`) and web server infrastructure (`fastapi`, `uvicorn`, `sse-starlette`, `pydantic`).

### `widget/package.json`
- Defines the React frontend. Intentionally stripped of heavy MCP SDK libraries to keep the bundle size small, utilizing only `react`, `react-dom`, and `plotly.js`.
