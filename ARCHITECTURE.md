# Schemo Architecture & File Map

Here is a detailed breakdown of every component in the Schemo repository. I designed Schemo as a zero-friction, cloud-native engineering visualization platform for AI assistants.

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

This is the core of Schemo. I built it as a single file that serves both Claude (via MCP/SSE) and ChatGPT (via REST API).

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
I configured `TransportSecuritySettings` with explicit `allowed_hosts` for the production domain. Without this, the MCP SDK's DNS rebinding protection rejects requests with non-localhost Host headers (causing annoying 421 errors).

**Tool naming:**
Tools use `@mcp.tool(name="plot")` instead of inheriting the Python function name. This makes them display cleanly as "Plot" under the "Schemo" integration in Claude Desktop, rather than a verbose function name.

**Plot type handling:**
I added a null guard for the `plot_type` parameter because Claude sometimes sends `null` instead of a valid enum string for optional parameters.

### `chatgpt_widget.py` - ChatGPT iframe Bridge

This registers a `ui://dashboard/{plot_type}/{num}/{den}` MCP Resource. When ChatGPT requests this resource, it returns an HTML wrapper containing an iframe that loads the Cloudflare Pages dashboard. This satisfies ChatGPT's UI widget security model while keeping frontend code hosted on Cloudflare.

### `circuit_renderer.py` - Circuit Schematic Engine

Interfaces with the `schemdraw` library to convert a list of `CircuitElement` objects (type, start, end, label) into a PNG image. It supports resistors, capacitors, inductors, diodes, voltage sources, current sources, ground, and wires.

---

## 2. Frontend: React Dashboard (`widget/`)

This is the interactive engineering dashboard for exploring control system plots, hosted on Cloudflare Pages at `schemo.shaniai.tech`.

### `widget/src/App.tsx` - Main Application

| Feature | Implementation |
|---------|---------------|
| URL parsing | Reads `system`, `num`, `den` from URL search params |
| Math rendering | KaTeX renders H(s) as proper LaTeX fractions |
| Plot computation | All math is computed client-side via `control.ts` (zero backend calls) |
| Plot rendering | Plotly.js interactive charts with a custom dark theme |
| Tab navigation | Switch between Bode, Step, Impulse, Nyquist, and Root Locus |
| Equation Tweaker | A visual modal to edit transfer function coefficients instantly |
| Pages | Dedicated pages for Support, About, Privacy, etc. managed via modals |

### `widget/src/Pages.tsx` - Supplemental Pages

Contains all the informational pages (Privacy Policy, About Us, Support, Contact, Collaborate) and the "Buy Me A Coffee" links.

### `widget/src/lib/control.ts` - Client-Side Math Engine

My pure TypeScript control systems library with zero external dependencies:

| Function | Description |
|----------|-------------|
| `computeBode()` | Frequency response via polynomial evaluation at s=jω |
| `computeStep()` | State-space simulation with RK4 integration |
| `computeImpulse()` | Impulse approximation via short pulse |
| `computeNyquist()` | Complex plane evaluation of H(jω) |
| `computeRootLocus()` | Durand-Kerner root finding for varying K |
| `tfToStateSpace()` | Controllable canonical form conversion |

### `widget/public/` - Static Assets

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | 16/32/48px | Browser tab icon |
| `favicon-16.png` | 16px | Small PNG fallback |
| `favicon-32.png` | 32px | Standard PNG favicon |
| `apple-touch-icon.png` | 180px | iOS home screen |
| `icon-192.png` | 192px | Android/PWA |
| `icon-512.png` | 512px | OG image / splash |
| `schemo-logo.png` | Full res | Source logo |

### `widget/index.html` - Entry Point

SEO-optimized HTML with:
- Proper favicon links for all sizes
- Open Graph meta tags
- Theme color for mobile browsers
- Descriptive title and meta description

---

## 3. Infrastructure & Configuration

### DNS & Domains (Cloudflare)

| Subdomain | Record | Target | Proxy |
|-----------|--------|--------|-------|
| `schemo.shaniai.tech` | CNAME | Cloudflare Pages | Pages-managed |
| `api-schemo.shaniai.tech` | CNAME | Render subdomain | DNS Only (no proxy) |

> **Important:** The API subdomain MUST use "DNS Only" mode (grey cloud). Cloudflare's proxy buffers SSE connections and kills long-running streams, which breaks the MCP protocol.

### `Dockerfile`

Multi-stage Docker build for the Python backend:
- Base image: `python:3.11-slim`
- Installs system deps for matplotlib rendering (`libcairo2`, `pkg-config`)
- Sets `PYTHONPATH=/app/src` for module resolution
- Exposes port 10000 (Render default)

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
- **Icons:** `lucide-react`
- **Build:** `vite`, `typescript`

---

## 4. Claude Desktop Configuration

Students add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "schemo": {
      "command": "npx",
      "args": ["-y", "supergateway", "--sse", "https://api-schemo.shaniai.tech/mcp/sse"]
    }
  }
}
```

I'm using the `supergateway` package to act as a local SSE-to-stdio bridge. Claude Desktop spawns it as a subprocess, and it maintains a persistent SSE connection to the cloud backend.

> **Note:** My previous approach using `@modelcontextprotocol/inspector` was abandoned because it outputs non-JSON diagnostic text to stdout, breaking the MCP JSON-RPC protocol.

---

## 5. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| DNS rebinding | `TransportSecuritySettings` with explicit allowed hosts |
| SSE connection drops | DNS-Only mode on Cloudflare (bypasses proxy buffering) |
| Host header mismatch | Production domain added to MCP `allowed_hosts` list |
| Cross-origin | ChatGPT widget uses iframe sandbox |
| No authentication | Acceptable for read-only engineering tools; no user data stored |
