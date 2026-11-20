"""
Whiteboard Web App - FastAPI Backend
Phase 1: Basic project setup and canvas serving
"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Initialize FastAPI application
app = FastAPI(title="Whiteboard App")

# Mount static directory for CSS, JS, and vendor libraries (offline Fabric.js)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure template directory
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """
    Serve the main whiteboard page.
    """
    return templates.TemplateResponse(request=request, name="index.html")


if __name__ == "__main__":
    import uvicorn
    # Run server on all network interfaces so other devices on Wi-Fi can connect
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
