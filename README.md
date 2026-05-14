# Schemo

**Schemo** is a dual-engine engineering math API designed for LLMs (Claude and ChatGPT). It allows AI assistants to perform complex control systems calculations (Bode plots, Nyquist, Step Responses) and draw electrical circuits natively in the chat.

## Features

1. **System Analysis (`render_system_plot`)**: Built on the industry-standard `python-control` library. Pass numerator and denominator polynomials, and it computes:
   - Bode Plots
   - Step / Impulse Responses
   - Root Locus
   - Nyquist Plots
2. **Circuit Schematics (`render_circuit`)**: Give the LLM coordinates, and it renders a professional circuit schematic using `schemdraw`.
3. **Interactive Dashboard**: Math visualizations are accompanied by a deep link to an interactive, client-side Plotly dashboard for zooming, panning, and precise data inspection.

## Architecture & Deployment

Schemo is designed for zero-friction student use. It is split into two cloud-hosted components:

1. **The Math Backend (Python / FastAPI / FastMCP)**: Hosted on Render (or Railway/Heroku).
   - Provides a Server-Sent Events (SSE) endpoint for Claude's native MCP integration (`/mcp/sse`).
   - Provides OpenAPI REST endpoints for ChatGPT Custom Actions (`/api/plot`).
2. **The Dashboard Frontend (React / Vite)**: Hosted on Cloudflare Pages.
   - Computes math client-side using `control.ts` directly from URL parameters.

## Zero-Friction Installation

Because the backend is hosted in the cloud, students do not need to install Python or run any local code.

### 1. Claude Desktop
Add this to your `claude_desktop_config.json` file:
```json
{
  "mcpServers": {
    "schemo": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/client-sse",
        "https://api-schemo.shaniai.tech/mcp/sse"
      ]
    }
  }
}
```

### 2. ChatGPT (Custom GPT)
1. Go to **Explore GPTs** -> **Create**.
2. Under the **Actions** tab, paste the OpenAPI schema pointing to `https://api-schemo.shaniai.tech/api/plot`.
3. ChatGPT's new UI widget standard (`openai/outputTemplate`) will automatically render the interactive dashboard directly inside the chat!

## Local Development (Optional)

If you wish to run the backend locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Run as a local HTTP API (port 8000)
python src/schemo_server/server.py

# Run in stdio mode for local MCP debugging
python src/schemo_server/server.py --stdio
```
