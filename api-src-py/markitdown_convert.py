"""
Vercel Python serverless function: /api/markitdown-convert
Converts uploaded documents (PDF, DOCX, XLSX, PPTX) to markdown using Microsoft MarkItDown.

We skip the heavy magika dependency (~200MB ML models) by providing a lightweight stub
that infers file type from the extension. This keeps the function under Vercel's 250MB limit.
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import tempfile
import types
import urllib.request

# Stub out magika before importing markitdown — avoids pulling in ~200MB of ML models.
# MarkItDown uses magika for file-type detection, but we already know the type from the filename.
_EXT_TO_MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".html": "text/html",
    ".htm": "text/html",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
}

class _MagikaResult:
    def __init__(self, mime):
        self.output = types.SimpleNamespace(mime_type=mime, score=1.0)

class _Magika:
    def identify_path(self, path):
        ext = os.path.splitext(str(path))[1].lower()
        return _MagikaResult(_EXT_TO_MIME.get(ext, "application/octet-stream"))
    def identify_stream(self, stream):
        return _MagikaResult("application/octet-stream")

_magika_mod = types.ModuleType("magika")
_magika_mod.Magika = _Magika
sys.modules["magika"] = _magika_mod

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
