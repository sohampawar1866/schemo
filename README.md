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

1. **The Math Backend (Python / FastMCP)**: Hosted on Render (or Railway/Heroku).
   - Provides a Server-Sent Events (SSE) endpoint for native MCP integrations (`/mcp/sse`).
2. **The Dashboard Frontend (React / Vite)**: Hosted on Cloudflare Pages.
   - Computes math client-side using `control.ts` directly from URL parameters.

### How the Flow Works (Example)
Imagine a student asks the AI: *"Plot the Bode response for numerator 100 and denominator 1, 10, 100."*

1. **The Request:** The AI (Claude or ChatGPT) sends this request to the **Python Backend**.
2. **The Calculation:** The Backend solves the math and draws a physical PNG image of the graph. It also generates a "Smart Link" containing the math data.
3. **The Response:** The Backend sends the PNG image and the Smart Link back to the AI.
4. **The Display (Claude):** Claude displays the static PNG image natively in the chat, along with a link. The student clicks the link, which opens the **React Dashboard** in a new tab for interactive zooming.
5. **The Display (ChatGPT):** ChatGPT recognizes the Smart Link as a special UI widget. It takes the **React Dashboard** and embeds it directly *inside* the chat window as an interactive mini-app!

## Zero-Friction Installation

Because the backend is hosted in the cloud, students do not need to install Python or run any local code!

### 1. ChatGPT (For Students)
Students **do not** need to edit any configuration files or write code to use Schemo in ChatGPT! Once you (the developer) publish Schemo as a "ChatGPT App", students can simply search for it in the store and use it instantly.

### 2. Claude Desktop (For Students)
To use Schemo inside the Claude Desktop application, students simply add this snippet to their `claude_desktop_config.json` file. It will securely connect to the cloud API over SSE:

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

## Local Development (Optional)

If you wish to run the backend locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Run as a local HTTP API (port 8000)
python src/schemo_server/server.py

# Run in stdio mode for local Claude desktop debugging
python src/schemo_server/server.py --stdio
```
