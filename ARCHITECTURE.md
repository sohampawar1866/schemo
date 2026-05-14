# Schemo Architecture & File Map

This document provides a detailed technical breakdown of the components in the Schemo repository. Schemo is designed as a zero-friction, cloud-native engineering visualization platform for AI assistants.

---

## System Overview

```
Student (Claude/ChatGPT)
        │
        ▼
┌──────────────────────────────────────────────────────┐
│              Python Backend (Render)                 │
│              api-schemo.shaniai.tech                 │
│                                                      │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │   FastAPI App    │  │   FastMCP SSE Server     │  │
│  │                  │  │                          │  │
│  │  POST /api/plot  │  │  GET /mcp/sse (Claude)   │  │
│  │  POST /api/circuit  │  POST /mcp/messages     │  │
│  │  GET /favicon.ico│  │                          │  │
│  │  GET /           │  │  Tools:                  │  │
│  └─────────────────┘  │  - schemo:plot            │  │
│                        │  - schemo:circuit         │  │
│                        │                          │  │
│                        │  Resources:              │  │
│                        │  - ui://dashboard/...    │  │
│                        └──────────────────────────┘  │
│                                                      │
│  Shared Core:                                        │
│  - core_render_system_plot() (matplotlib + control)  │
│  - render_circuit_to_image() (schemdraw)             │
└──────────────────────────────────────────────────────┘
        │
        │ generates dashboard URL with encoded params
        ▼
┌──────────────────────────────────────────────────────┐
│            React Dashboard (Cloudflare Pages)        │
│            schemo.shaniai.tech                       │
│                                                      │
│  URL params: ?system=step&num=100&den=1,10,100       │
│                                                      │
│  - KaTeX LaTeX equation rendering                    │
│  - Plotly.js interactive charts                      │
│  - Client-side math engine (control.ts)              │
│  - Tab switching: Bode/Step/Impulse/Nyquist/RLocus   │
│  - Equation Tweaker (visual polynomial builder)      │
│  - Dark mode, responsive, SEO optimized              │
└──────────────────────────────────────────────────────┘
```

---

## 1. Backend: Python API & MCP Server (`src/schemo_server/`)

### `server.py` - Main Entry Point

Serves both Claude (via MCP/SSE) and ChatGPT (via REST API).

**Key components:**

| Section | Description |
|---------|-------------|
| `FastMCP("Schemo")` | MCP server with DNS rebinding protection configured for the production domain (`api-schemo.shaniai.tech`) and Render subdomain |
| `FastAPI` app | REST API for ChatGPT Custom Actions |
| `core_render_system_plot()` | Shared math engine used by both MCP tools and REST endpoints |
| `@mcp.tool(name="plot")` | Claude MCP tool for generating control system plots |
| `@mcp.tool(name="circuit")` | Claude MCP tool for rendering circuit schematics |
| `@app.post("/api/plot")` | ChatGPT REST endpoint for plots |
| `@app.post("/api/circuit")` | ChatGPT REST endpoint for circuits |
| `@app.get("/favicon.ico")` | Serves the Schemo logo as browser favicon |
| `app.mount("/mcp", ...)` | Mounts the FastMCP SSE app into FastAPI at `/mcp` |

**MCP Transport Security:**
Configures `TransportSecuritySettings` with explicit `allowed_hosts` for the production domain. Without this, the MCP SDK's DNS rebinding protection rejects requests with non-localhost Host headers.

**Tool Naming:**
Tools use `@mcp.tool(name="plot")` instead of inheriting the Python function name to ensure clean display within AI assistants.

### `chatgpt_widget.py` - ChatGPT iframe Bridge

Registers a `ui://dashboard/{plot_type}/{num}/{den}` MCP Resource. Returns an HTML wrapper containing an iframe that loads the Cloudflare Pages dashboard. This satisfies ChatGPT's UI widget security model while keeping frontend code hosted externally.

### `circuit_renderer.py` - Circuit Schematic Engine

Interfaces with the `schemdraw` library to convert a list of `CircuitElement` objects (type, start, end, label) into a PNG image.

---

## 2. Frontend: React Dashboard (`widget/`)

Interactive engineering dashboard for exploring control system plots, hosted on Cloudflare Pages at `schemo.shaniai.tech`.

### `widget/src/App.tsx` - Main Application

| Feature | Implementation |
|---------|---------------|
| URL parsing | Reads `system`, `num`, `den` from URL search params |
| Math rendering | KaTeX renders H(s) as proper LaTeX fractions |
| Plot computation | Computed client-side via `control.ts` (zero backend calls) |
| Plot rendering | Plotly.js interactive charts |
| Tab navigation | Switch between Bode, Step, Impulse, Nyquist, and Root Locus |
| Equation Tweaker | A visual modal to edit transfer function coefficients instantly |
| Modals | Dedicated views for Legal, Support, and Collaboration |

### `widget/src/Pages.tsx` - Supplemental Pages

Contains auxiliary views (Privacy Policy, About Us, Support, Contact, Collaborate) rendered as modals over the primary dashboard.

### `widget/src/lib/control.ts` - Client-Side Math Engine

TypeScript control systems library with zero external dependencies:

| Function | Description |
|----------|-------------|
| `computeBode()` | Frequency response via polynomial evaluation at s=jω |
| `computeStep()` | State-space simulation with RK4 integration |
| `computeImpulse()` | Impulse approximation via short pulse |
| `computeNyquist()` | Complex plane evaluation of H(jω) |
| `computeRootLocus()` | Durand-Kerner root finding for varying K |
| `tfToStateSpace()` | Controllable canonical form conversion |

### `widget/public/` - Static Assets

Standardized icons, favicons, and Open Graph imagery used for browser display and SEO metadata.

---

## 3. Infrastructure & Configuration

### DNS & Domains (Cloudflare)

| Subdomain | Record | Target | Proxy |
|-----------|--------|--------|-------|
| `schemo.shaniai.tech` | CNAME | Cloudflare Pages | Pages-managed |
| `api-schemo.shaniai.tech` | CNAME | Render subdomain | DNS Only (no proxy) |

> **Important:** The API subdomain must use "DNS Only" mode. Cloudflare's proxy buffers SSE connections and disrupts the continuous MCP stream.

### `Dockerfile`

Multi-stage Docker build for the Python backend:
- Base image: `python:3.11-slim`
- Installs system dependencies for matplotlib rendering (`libcairo2`, `pkg-config`)
- Exposes port 10000

### `pyproject.toml`

Python dependencies:
- **Math:** `numpy`, `scipy`, `control`, `matplotlib`
- **Circuits:** `schemdraw`
- **Web:** `fastapi`, `uvicorn`, `sse-starlette`
- **MCP:** `mcp[cli]`

### `widget/package.json`

Frontend dependencies:
- **Core:** `react`, `react-dom`
- **Charts:** `plotly.js`, `react-plotly.js`
- **Math rendering:** `katex`
- **Build:** `vite`, `typescript`

---

## 4. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| DNS rebinding | `TransportSecuritySettings` with explicit allowed hosts |
| SSE connection drops | DNS-Only mode on Cloudflare (bypasses proxy buffering) |
| Host header mismatch | Production domain added to MCP `allowed_hosts` list |
| Cross-origin | ChatGPT widget uses iframe sandbox |
| Data privacy | Stateless architecture; no user equation or usage data stored |
