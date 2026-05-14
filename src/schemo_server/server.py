"""
Schemo API & MCP Server
=======================
Exposes engineering visualization tools (Bode plots, circuits, waveforms)
to AI assistants via the Model Context Protocol (Claude) and REST (ChatGPT).
"""

import base64
import logging
import io
import os
import argparse
from enum import Enum

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server use
import matplotlib.pyplot as plt
import control as ct
from mcp.server.fastmcp import FastMCP
from mcp.server.sse import TransportSecuritySettings
from mcp.types import ImageContent, TextContent, CallToolResult

from schemo_server.circuit_renderer import CircuitElement, render_circuit_to_image
from schemo_server.chatgpt_widget import register_chatgpt_resources

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

# ---------------------------------------------------------------------------
# Server setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("schemo")

# Allow the production custom domain and Render subdomain through
# the MCP SDK's DNS rebinding protection (default only allows localhost).
mcp = FastMCP(
    "Schemo",
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=[
            "api-schemo.shaniai.tech",
            "api-schemo.shaniai.tech:*",
            "api-schemo.onrender.com",
            "api-schemo.onrender.com:*",
            "localhost:*",
            "127.0.0.1:*",
        ],
    ),
)
app = FastAPI(title="Schemo API", description="Engineering Math API for ChatGPT Custom Actions")

DASHBOARD_BASE_URL = "https://schemo.shaniai.tech"

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PlotType(str, Enum):
    BODE = "bode"
    STEP = "step"
    IMPULSE = "impulse"
    NYQUIST = "nyquist"
    ROOT_LOCUS = "root_locus"

class PlotRequest(BaseModel):
    numerator: list[float]
    denominator: list[float]
    plot_type: PlotType = PlotType.BODE

# ---------------------------------------------------------------------------
# Core Logic Helpers
# ---------------------------------------------------------------------------

def _render_to_base64() -> str:
    """Save the current matplotlib figure(s) to a base64-encoded PNG string."""
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close("all")
    buf.seek(0)
    return base64.standard_b64encode(buf.read()).decode("utf-8")

def core_render_system_plot(numerator: list[float], denominator: list[float], plot_type: PlotType):
    if not numerator or not denominator:
        raise ValueError("Numerator and denominator cannot be empty.")

    if len(denominator) < 2 and plot_type in [PlotType.ROOT_LOCUS, PlotType.BODE]:
        raise ValueError("Denominator must have at least 2 coefficients for meaningful Bode or Root Locus plots.")

    sys = ct.tf(numerator, denominator)

    if plot_type == PlotType.BODE:
        ct.bode_plot(sys, display_margins=True)
        plt.suptitle("Bode Plot with Stability Margins")

    elif plot_type == PlotType.STEP:
        plt.figure(figsize=(8, 6))
        t, y = ct.step_response(sys)
        plt.plot(t, y, linewidth=2, color="blue")
        plt.title("Step Response")
        plt.xlabel("Time (seconds)")
        plt.ylabel("Amplitude")
        plt.grid(True, linestyle=":", alpha=0.7)

    elif plot_type == PlotType.IMPULSE:
        plt.figure(figsize=(8, 6))
        t, y = ct.impulse_response(sys)
        plt.plot(t, y, linewidth=2, color="red")
        plt.title("Impulse Response")
        plt.xlabel("Time (seconds)")
        plt.ylabel("Amplitude")
        plt.grid(True, linestyle=":", alpha=0.7)

    elif plot_type == PlotType.NYQUIST:
        ct.nyquist_plot(sys)
        plt.title("Nyquist Plot")

    elif plot_type == PlotType.ROOT_LOCUS:
        ct.root_locus(sys)
        plt.title("Root Locus")

    else:
        raise ValueError(f"Unsupported plot type '{plot_type}'")

    plt.tight_layout()
    b64_png = _render_to_base64()

    num_str = ",".join(map(str, numerator))
    den_str = ",".join(map(str, denominator))
    dashboard_url = f"{DASHBOARD_BASE_URL}/?system={plot_type.value}&num={num_str}&den={den_str}"

    return b64_png, dashboard_url

# ---------------------------------------------------------------------------
# ChatGPT REST API Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/plot")
def api_plot(req: PlotRequest):
    """REST endpoint for ChatGPT Custom Action to generate plots."""
    try:
        b64_png, dashboard_url = core_render_system_plot(req.numerator, req.denominator, req.plot_type)
        return {
            "success": True,
            "image_base64": b64_png,
            "dashboard_url": dashboard_url,
            "openai_output_template": dashboard_url,
            "message": f"Successfully generated {req.plot_type.value} plot."
        }
    except Exception as e:
        logger.error("api_plot failed: %s", e)
        plt.close("all")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/circuit")
def api_circuit(elements: list[CircuitElement]):
    """REST endpoint for ChatGPT Custom Action to render circuits."""
    try:
        if not elements:
            raise ValueError("Elements list cannot be empty.")
        png_bytes = render_circuit_to_image(elements)
        b64_png = base64.standard_b64encode(png_bytes).decode("utf-8")
        return {
            "success": True,
            "image_base64": b64_png,
            "message": f"Rendered circuit with {len(elements)} elements."
        }
    except Exception as e:
        logger.error("api_circuit failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------------------------
# Claude MCP Tools
# ---------------------------------------------------------------------------

@mcp.tool(name="plot")
def render_system_plot(
    numerator: list[float],
    denominator: list[float],
    plot_type: PlotType = PlotType.BODE,
):
    """Analyze a Linear Time-Invariant (LTI) system and generate professional plots.

    Accepts numerator and denominator polynomial coefficients for a transfer function H(s).
    Returns a PNG image of the requested plot type, displayed natively in the LLM chat,
    along with a link to an interactive dashboard.

    CRITICAL FORMATTING INSTRUCTIONS FOR CLAUDE:
    After showing the plot image, you MUST include the interactive dashboard link 
    as a PROMINENT, clearly clickable markdown link in your response. Format it 
    EXACTLY like this (on its own separate line, with blank lines above and below):

    **👉 [Open Interactive Dashboard - zoom, pan & explore this plot](URL_HERE)**

    Do NOT hide it as inline text like "Full interactive plot" - students will miss it.
    The link must stand out visually as a bold call-to-action on its own line.

    Supported plot_types:
    - "bode": Frequency response (magnitude and phase)
    - "step": Time-domain step response
    - "impulse": Time-domain impulse response
    - "nyquist": Nyquist stability plot
    - "root_locus": Root locus plot of the system poles
    """
    try:
        # Guard: Claude sometimes sends null for plot_type
        if plot_type is None:
            plot_type = PlotType.BODE
        b64_png, dashboard_url = core_render_system_plot(numerator, denominator, plot_type)
        logger.info("render_system_plot (MCP): Generated %s plot.", plot_type.value)

        num_str = ",".join(map(str, numerator))
        den_str = ",".join(map(str, denominator))

        return CallToolResult(
            content=[
                ImageContent(
                    type="image",
                    data=b64_png,
                    mimeType="image/png",
                ),
                TextContent(
                    type="text",
                    text=(
                        f"👉 **[Open Interactive Dashboard - zoom, pan & explore this plot]({dashboard_url})**\n\n"
                        f"Direct link: {dashboard_url}"
                    ),
                ),
            ],
            meta={
                "openai/outputTemplate": f"ui://dashboard/{plot_type.value}/{num_str}/{den_str}"
            }
        )
    except Exception as e:
        logger.error("render_system_plot failed: %s", e)
        plt.close("all")
        return f"Error plotting system: {str(e)}"

@mcp.tool(name="circuit")
def render_circuit(elements: list[CircuitElement]):
    """Render a circuit schematic and return a PNG image.

    The LLM MUST provide components plotted on a 2D coordinate grid.
    Start and end coordinates dictating the placement of each component.
    """
    try:
        if not elements:
            return "Error: Elements list cannot be empty."

        png_bytes = render_circuit_to_image(elements)
        logger.info("render_circuit (MCP): Generated Image with %d elements", len(elements))

        b64_png = base64.standard_b64encode(png_bytes).decode("utf-8")

        return [
            ImageContent(
                type="image",
                data=b64_png,
                mimeType="image/png",
            ),
        ]
    except Exception as e:
        logger.error("render_circuit failed: %s", e)
        return f"Error rendering circuit: {str(e)}"

@app.get("/")
def health_check():
    return {"status": "Schemo API is running. MCP SSE available at /mcp/sse."}

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Serve the Schemo logo as favicon for browser tabs."""
    icon_path = os.path.join(os.path.dirname(__file__), "..", "..", "schemo-logo.png")
    if os.path.exists(icon_path):
        return FileResponse(icon_path, media_type="image/png")
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "..", "widget", "public", "favicon.ico"), media_type="image/x-icon")

# Register ChatGPT MCP Resources before mounting
register_chatgpt_resources(mcp)

# Mount MCP SSE app into FastAPI
# This allows Claude to connect via SSE at /mcp/sse and /mcp/messages
app.mount("/mcp", mcp.sse_app())

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Schemo API Server.")
    parser.add_argument("--stdio", action="store_true", help="Run strictly using standard IO for local Claude desktop")
    args = parser.parse_args()

    if args.stdio:
        logger.info("Starting Schemo Server using stdio transport (Local Claude Mode)")
        mcp.run(transport="stdio")
    else:
        logger.info("Starting Schemo Cloud Server (REST + SSE) on 0.0.0.0:8000")
        uvicorn.run(app, host="0.0.0.0", port=8000)
