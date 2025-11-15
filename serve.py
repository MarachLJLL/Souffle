#!/usr/bin/env python3
"""
Simple HTTP server to serve the frontend files.
This is needed because browsers block fetch() requests from file:// URLs due to CORS.
"""

import http.server
import socketserver
import os
import sys

PORT = 8000

# Change to the frontend directory
os.chdir(os.path.join(os.path.dirname(__file__), 'frontend'))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, format, *args):
        # Optional: customize logging
        super().log_message(format, *args)

if __name__ == "__main__":
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"Server running at http://localhost:{PORT}/")
            print(f"Serving files from: {os.getcwd()}")
            print(f"\nOpen your browser to:")
            print(f"  - Main page: http://localhost:{PORT}/index.html")
            print(f"  - Product page: http://localhost:{PORT}/product.html?id=1")
            print(f"\nPress Ctrl+C to stop the server.")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 98:  # Address already in use
            print(f"Error: Port {PORT} is already in use.")
            print(f"Try using a different port or stop the process using port {PORT}.")
        else:
            print(f"Error starting server: {e}")
        sys.exit(1)

