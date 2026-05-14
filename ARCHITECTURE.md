# Schemo Architecture & File Map

This document breaks down the core components of the Schemo repository. To provide a zero-friction experience for students, the architecture is split into a Python backend API and a static React frontend dashboard.

---

## 1. The Engine: API & MCP Server (`src/schemo_server/`)

### `server.py`
- **Purpose:** The core entry point for the backend. It uses `FastMCP` to serve Model Context Protocol endpoints over SSE (Server-Sent Events) for both Claude and ChatGPT Apps.
- **Connections:** This server runs on a cloud provider (e.g., Render) at `api-schemo.shaniai.tech`.
- **Logic:** 
  - **MCP SSE:** Mounts a FastMCP SSE app at `/mcp` allowing AI clients to connect remotely.
  - **Math Engine:** Uses `python-control` and `matplotlib` to generate static fallback PNGs encoded in Base64.
  - **ChatGPT Widget Linking:** Returns the `openai/outputTemplate` metadata tag pointing to an internal `ui://` resource to trigger ChatGPT's interactive iframe widgets.

### `chatgpt_widget.py`
- **Purpose:** An isolated bridge designed strictly to satisfy ChatGPT's UI security requirements.
- **Logic:** It registers a `ui://dashboard/{plot_type}/{num}/{den}` MCP Resource. When ChatGPT requests this resource, the backend returns a lightweight HTML wrapper containing an `<iframe>` that secretly loads the actual Cloudflare Pages React dashboard. This keeps the backend logic totally separated from the frontend.

### `circuit_renderer.py`
- **Purpose:** A utility module dedicated to interfacing with the `schemdraw` library to draw PNG circuit schematics.

---

## 2. The Dashboard: React Client (`widget/`)

- **Purpose:** An interactive, dark-mode engineering dashboard for exploring generated plots. Hosted globally on Cloudflare Pages (`schemo.shaniai.tech`).
- **Logic:** 
  - Entirely stateless. It receives transfer function data via URL parameters.
  - Calculates complex math (Bode, Nyquist, Root Locus) entirely client-side using a custom TypeScript library (`widget/src/lib/control.ts`), eliminating latency and the need to communicate with the Python backend.
  - Renders professional SVG charts using `Plotly.js`.

---

## 3. Configuration

### `Dockerfile`
- Used to easily containerize and deploy the Python backend to cloud platforms like Render or Railway.

### `pyproject.toml`
- Defines the Python backend dependencies. It includes math libraries (`control`, `numpy`, `scipy`, `matplotlib`) and web server infrastructure (`fastapi`, `uvicorn`, `sse-starlette`).

### `widget/package.json`
- Defines the React frontend. Intentionally stripped of heavy libraries to keep the bundle size small, utilizing only `react`, `react-dom`, and `plotly.js`.
