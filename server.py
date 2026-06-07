import http.server
import socketserver
import json
import os
import urllib.parse

PORT = 8080
MODELS_DIR = "models"
POSITIONS_FILE = "model_positions.json"

# Ensure directories exist
os.makedirs(MODELS_DIR, exist_ok=True)

# Initialize positions file if it doesn't exist
if not os.path.exists(POSITIONS_FILE):
    with open(POSITIONS_FILE, 'w') as f:
        json.dump([], f)


class OceanHandler(http.server.SimpleHTTPRequestHandler):

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        # --- Upload a GLB file ---
        if parsed.path == '/upload':
            params = urllib.parse.parse_qs(parsed.query)
            filename = params.get('filename', ['model.glb'])[0]
            
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            
            filepath = os.path.join(MODELS_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(body)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "path": filepath}).encode())
            return

        # --- Save model positions ---
        if parsed.path == '/save-positions':
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            
            with open(POSITIONS_FILE, 'w') as f:
                f.write(body.decode('utf-8'))
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "saved"}).encode())
            return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # --- Load saved positions ---
        if parsed.path == '/load-positions':
            try:
                with open(POSITIONS_FILE, 'r') as f:
                    data = f.read()
            except FileNotFoundError:
                data = "[]"

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(data.encode())
            return

        # --- List all models in the models directory ---
        if parsed.path == '/list-models':
            files = [f for f in os.listdir(MODELS_DIR) if f.endswith('.glb')]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(files).encode())
            return

        # --- Delete a model ---
        if parsed.path.startswith('/delete-model'):
            params = urllib.parse.parse_qs(parsed.query)
            filename = params.get('filename', [None])[0]
            if filename:
                filepath = os.path.join(MODELS_DIR, filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "deleted"}).encode())
            return

        # Default: serve static files
        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()


with socketserver.TCPServer(("", PORT), OceanHandler) as httpd:
    print(f"Ocean Server running at http://localhost:{PORT}")
    httpd.serve_forever()
