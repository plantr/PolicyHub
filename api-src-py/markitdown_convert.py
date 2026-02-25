"""
Vercel Python serverless function: /api/markitdown-convert
Converts uploaded documents (PDF, DOCX, XLSX, PPTX) to markdown using Microsoft MarkItDown.
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import tempfile
import urllib.request
from markitdown import MarkItDown


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length))

            url = body.get("url")
            filename = body.get("filename", "document.pdf")

            if not url:
                self._send_json(400, {"error": "Missing 'url' in request body"})
                return

            # Download file to temp directory
            ext = os.path.splitext(filename)[1] or ".pdf"
            tmp_path = None
            try:
                fd, tmp_path = tempfile.mkstemp(suffix=ext, dir="/tmp")
                os.close(fd)

                urllib.request.urlretrieve(url, tmp_path)

                md = MarkItDown()
                result = md.convert(tmp_path)
                markdown = result.text_content or ""

                self._send_json(200, {"markdown": markdown})
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)

        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _send_json(self, status_code, data):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
