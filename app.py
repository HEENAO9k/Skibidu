import os
import subprocess
import sys
import threading
import time
import requests
from flask import Flask, request, Response
from werkzeug.middleware.proxy_fix import ProxyFix

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "fallback-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Node.js server configuration
NODE_SERVER_PORT = 5000
NODE_SERVER_URL = f"http://localhost:{NODE_SERVER_PORT}"

# Global variable to track Node.js server process
node_process = None

def start_node_server():
    """Start the Node.js server in a separate process"""
    global node_process
    try:
        print("🚀 Starting Node.js server...")
        node_process = subprocess.Popen(
            ['node', 'server.js'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait longer for the server to start with better error handling
        max_retries = 60  # Increased to 60 seconds
        for i in range(max_retries):
            try:
                response = requests.get(f"{NODE_SERVER_URL}/", timeout=2)
                if response.status_code == 200:
                    print(f"✅ Node.js server started successfully on port {NODE_SERVER_PORT}")
                    return True
            except requests.exceptions.RequestException:
                time.sleep(1)
                continue
        
        print("❌ Node.js server failed to start within 60 seconds")
        return False
        
    except Exception as e:
        print(f"❌ Failed to start Node.js server: {e}")
        return False

# Global flag to track server status
node_server_ready = False

def wait_for_node_server():
    """Wait for Node.js server to be ready"""
    global node_server_ready
    if node_server_ready:
        return True
        
    max_wait = 10  # Wait up to 10 seconds for ongoing startup
    for i in range(max_wait):
        try:
            response = requests.get(f"{NODE_SERVER_URL}/", timeout=1)
            if response.status_code == 200:
                node_server_ready = True
                return True
        except requests.exceptions.RequestException:
            time.sleep(1)
            continue
    return False

def proxy_request(path=""):
    """Proxy requests to the Node.js server"""
    try:
        # Wait for Node.js server to be ready
        if not wait_for_node_server():
            return "Node.js server is starting up, please wait...", 503
            
        # Build the URL for the Node.js server
        url = f"{NODE_SERVER_URL}{path}"
        
        # Prepare headers for forwarding (exclude host)
        headers = {k: v for k, v in request.headers if k.lower() not in ['host', 'content-length']}
        
        # Forward the request to Node.js server
        if request.method == 'GET':
            resp = requests.get(url, params=dict(request.args), headers=headers, stream=True, timeout=30)
        elif request.method == 'POST':
            resp = requests.post(
                url, 
                data=request.get_data(),
                headers=headers,
                params=dict(request.args),
                stream=True,
                timeout=30
            )
        else:
            resp = requests.request(
                request.method,
                url,
                data=request.get_data(),
                headers=headers,
                params=dict(request.args),
                stream=True,
                timeout=30
            )
        
        # Filter response headers to avoid conflicts
        response_headers = dict(resp.headers)
        response_headers.pop('content-encoding', None)  # Let Flask handle encoding
        response_headers.pop('content-length', None)    # Let Flask calculate length
        response_headers.pop('transfer-encoding', None)  # Remove transfer-encoding
        
        # For large files (like ZIP downloads), use streaming
        def generate():
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        
        # Return the response from Node.js server
        return Response(
            generate(),
            status=resp.status_code,
            headers=response_headers
        )
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error proxying request {path}: {e}")
        global node_server_ready
        node_server_ready = False  # Reset flag on connection error
        return f"Error connecting to Node.js server: {e}", 502

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    """Catch all routes and proxy to Node.js server"""
    return proxy_request(f"/{path}" if path else "/")

# Start Node.js server immediately when module loads
print("🚀 Initializing BetMC Texture Generator...")

def initialize_node_server():
    """Initialize the Node.js server and mark as ready"""
    global node_server_ready
    try:
        # Check if Node.js server is already running
        response = requests.get(f"{NODE_SERVER_URL}/", timeout=2)
        if response.status_code == 200:
            print("✅ Node.js server is already running")
            node_server_ready = True
            return
    except requests.exceptions.RequestException:
        pass
    
    if start_node_server():
        node_server_ready = True
    else:
        print("❌ Failed to start Node.js server during initialization")

threading.Thread(target=initialize_node_server, daemon=True).start()