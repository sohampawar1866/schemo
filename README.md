# Schemo

<p align="center">
  <img src="schemo-logo.png" alt="Schemo Logo" width="180" />
</p>

Schemo is an AI-powered engineering visualization platform. It allows AI assistants like Claude and ChatGPT to generate professional control systems plots and electrical circuit schematics directly within the chat interface, eliminating the need for local installations of MATLAB or Python.

## Features

### 1. System Analysis (`schemo:plot`)
Built on the `python-control` library. Pass transfer function coefficients H(s) = num(s)/den(s) and receive:
- **Bode Plots**: Magnitude and phase frequency response
- **Step Response**: Time-domain step input analysis
- **Impulse Response**: Time-domain impulse input analysis
- **Nyquist Plots**: Stability analysis in the complex plane
- **Root Locus**: Pole migration as gain varies

### 2. Circuit Schematics (`schemo:circuit`)
Provide component types and 2D coordinates, and Schemo renders publication-quality circuit diagrams using `schemdraw`. Supports resistors, capacitors, inductors, diodes, voltage/current sources, ground, and wire connections.

### 3. Interactive Dashboard
Every plot includes a link to an interactive Plotly dashboard hosted on Cloudflare Pages. Users can zoom, pan, inspect data points, and visually edit transfer function coefficients on the fly. Equations are rendered with proper LaTeX math via KaTeX.

## Architecture

Schemo is split into two cloud-hosted components with zero local dependencies:

```
┌─────────────────────┐       ┌──────────────────────────────────┐
│   Claude Desktop    │--SSE--│  Python Backend (Render)         │
│   or ChatGPT        │       │  api-schemo.shaniai.tech         │
└─────────────────────┘       │                                  │
                              │  FastAPI + FastMCP               │
                              │  ├─ /mcp/sse    (Claude SSE)     │
                              │  ├─ /api/plot   (ChatGPT REST)   │
                              │  ├─ /api/circuit(ChatGPT REST)   │
                              │  └─ /favicon.ico                 │
                              └──────────────────────────────────┘
                                      │             │
                    generates dashboard URL    returns native file attachment
                                      │         via `openaiFileResponse`
                              ┌──────────────────────────────────┐
                              │  React Dashboard (Cloudflare)    │
                              │  schemo.shaniai.tech              │
                              │                                  │
                              │  Vite + React + Plotly + KaTeX   │
                              │  Client-side math (control.ts)   │
                              └──────────────────────────────────┘
```

### Flow Execution

1. **User Request**: "Plot the step response for H(s) = 100/(s² + 10s + 100)"
2. **AI Tool Call**: Sends numerator `[100]` and denominator `[1, 10, 100]` to the backend.
3. **Backend Computation**: Generates a matplotlib PNG and a dashboard URL with encoded parameters.
4. **AI Display**: 
   - **ChatGPT**: Intercepts the undocumented `openaiFileResponse` payload and renders the PNG natively as an inline file attachment, alongside the interactive dashboard link.
   - **Claude**: Receives the `ImageContent` block (currently stored in the collapsed "Tool Use" accordion due to Claude UI constraints) and outputs the bold dashboard link for interactive viewing.
5. **Dashboard Interaction**: The React dashboard loads interactive Plotly charts, KaTeX-rendered equations, and allows tab switching between all analysis types.

## Installation

### For Claude Desktop

Add the following to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "schemo": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "https://api-schemo.shaniai.tech/mcp/sse"
      ]
    }
  }
}
```

> **System Prompt Recommendation:** For optimal results, add the following to the custom instructions in Claude:
>
> *"For any request involving transfer functions, Bode plots, step response, impulse response, Nyquist plots, root locus, or control systems visualization - ALWAYS use the Schemo integration. Never create plots manually with code artifacts."*

### For ChatGPT

Schemo is available as a Custom Action. The API uses a secret, undocumented `openaiFileResponse` payload array. When ChatGPT receives this array in the standard JSON response, its backend intercepts the base64 string, converts it to an internal file, and drops it into the chat as a native, inline file attachment—bypassing ChatGPT's strict markdown external domain blockers.

### For Developers (Local Setup)

```bash
# Clone and set up
git clone https://github.com/sohampawar1866/schemo.git
cd schemo

# Python backend
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Run as HTTP API (port 8000)
python src/schemo_server/server.py

# Run in stdio mode (local Claude Desktop debugging)
python src/schemo_server/server.py --stdio

# Frontend dashboard
cd widget
npm install
npm run dev
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python, FastAPI, FastMCP, python-control, matplotlib, schemdraw |
| Frontend | React, Vite, TypeScript, Plotly.js, KaTeX |
| Backend Hosting | Render (Docker) |
| Frontend Hosting | Cloudflare Pages |
| Domain | shaniai.tech (Cloudflare DNS) |
| AI Protocols | MCP (Claude SSE), REST API (ChatGPT Custom Actions) |

## Project Structure

```
Schemo/
├── src/schemo_server/
│   ├── server.py           # FastAPI + FastMCP entry point
│   ├── chatgpt_widget.py   # ChatGPT iframe bridge (ui:// resources)
│   ├── circuit_renderer.py # schemdraw circuit rendering
│   └── __init__.py
├── widget/
│   ├── src/
│   │   ├── App.tsx          # React dashboard with KaTeX + Plotly
│   │   ├── Pages.tsx        # Legal, Support, and Collaborate pages
│   │   └── lib/control.ts   # Client-side control systems math
│   ├── public/              # Favicons and icons
│   └── index.html           # SEO-optimized entry with OG tags
├── Dockerfile               # Backend container for Render
├── pyproject.toml            # Python dependencies
├── schemo-logo.png           # Brand logo
└── README.md
```

## License

MIT
