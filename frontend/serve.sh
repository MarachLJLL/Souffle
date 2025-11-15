#!/bin/bash
# Simple HTTP server to serve the frontend files
# This is required because browsers block loading GLB files via file:// protocol (CORS)

echo "Starting HTTP server on http://localhost:8000"
echo "Open http://localhost:8000/index.html in your browser"
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8000

