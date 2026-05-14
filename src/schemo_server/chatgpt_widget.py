from mcp.types import TextResourceContents

DASHBOARD_BASE_URL = "https://schemo.shaniai.tech"

def register_chatgpt_resources(mcp):
    """
    Registers the ChatGPT Apps UI widget resource.
    ChatGPT requires interactive widgets to be served as MCP Resources 
    with a ui:// scheme. This acts as a bridge that embeds the Cloudflare 
    dashboard inside a secure iframe for ChatGPT.
    """
    
    # We use a URI template so the parameters can be passed securely
    @mcp.resource("ui://dashboard/{plot_type}/{num}/{den}")
    def get_dashboard_ui(plot_type: str, num: str, den: str) -> str:
        # This HTML wrapper gives ChatGPT exactly what it expects 
        # while keeping our actual React code safely on Cloudflare.
        html_content = f"""<!DOCTYPE html>
<html style="margin:0; padding:0; height:100%; width:100%; background-color:#1e1e1e;">
<head>
    <meta charset="utf-8">
    <title>Schemo</title>
</head>
<body style="margin:0; padding:0; height:100%; width:100%; overflow:hidden;">
    <iframe 
        src="{DASHBOARD_BASE_URL}/?system={plot_type}&num={num}&den={den}" 
        style="border:none; width:100%; height:100%;"
        allowfullscreen
    ></iframe>
</body>
</html>"""
        
        return html_content
