#!/usr/bin/env python3
"""Serve only compiled ABYSSAL HTML/assets with versioned HTTP caching."""

import argparse
import hashlib
import ipaddress
import json
import mimetypes
import os
import re
import shutil
import stat
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from socketserver import TCPServer
from urllib.parse import unquote

HASHED_ASSET = re.compile(r"^assets/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\.[a-z0-9]+$")


def request_path(target):
    """Return a permitted relative runtime path, or reject it."""
    raw = target.split("?", 1)[0]
    if not raw.startswith("/") or re.search(r"%(?![0-9a-fA-F]{2})|%(?:2f|5c|25)", raw, re.I):
        raise ValueError("Invalid path")
    path = unquote(raw, errors="strict")[1:] or "index.html"
    parts = path.split("/")
    if any(not p or p.startswith(".") for p in parts) or "\\" in path:
        raise ValueError("Invalid path")
    if any(ord(c) < 32 or ord(c) == 127 for c in path):
        raise ValueError("Invalid path")
    if path != "index.html" and not (len(parts) == 2 and parts[0] == "assets"):
        raise ValueError("Outside runtime scope")
    return path


def open_runtime(root, name):
    """Open a regular runtime file without traversing any symbolic links."""
    path = root / name
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    fd = os.open(path.anchor, flags)
    try:
        for part in path.parts[1:-1]:
            next_fd = os.open(part, flags, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        child = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        try:
            if not stat.S_ISREG(os.fstat(child).st_mode):
                raise ValueError("Not a regular file")
            return os.fdopen(child, "rb")
        except BaseException:
            os.close(child)
            raise
    finally:
        os.close(fd)


def allows_gzip(value):
    """Honor explicit gzip refusal even when a wildcard is present."""
    options = {}
    for part in value.lower().split(","):
        pieces = part.strip().split(";")
        try:
            q = next((float(v.strip()[2:]) for v in pieces[1:] if v.strip().startswith("q=")), 1)
        except ValueError:
            q = 0
        options[pieces[0]] = q
    return options.get("gzip", options.get("*", 0)) > 0


class RuntimeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self.serve(False)

    def do_HEAD(self):
        self.serve(True)

    def log_message(self, *_args):
        # 不把请求查询串或本地路径写入日志。
        pass

    def serve(self, head):
        stream = None
        try:
            path = request_path(self.path)
            stream = open_runtime(self.server.root, path)
            immutable = bool(HASHED_ASSET.fullmatch(path))
            compressed = False
            if immutable and path.endswith((".js", ".css")) and allows_gzip(self.headers.get("Accept-Encoding", "")):
                try:
                    zipped = open_runtime(self.server.root, path + ".gz")
                except (OSError, ValueError):
                    pass
                else:
                    stream.close()
                    stream = zipped
                    compressed = True
            # 指纹文件永不原地覆盖；表示格式纳入ETag，避免gzip/原文混用。
            etag = '"' + hashlib.sha256((path + (":gzip" if compressed else ":identity")).encode()).hexdigest() + '"'
            tags = self.headers.get("If-None-Match", "").replace("W/", "").split(",")
            unchanged = immutable and any(t.strip() in (etag, "*") for t in tags)
            self.send_response(304 if unchanged else 200)
            self.send_header("Cache-Control", "public, max-age=31536000, immutable" if immutable else "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if immutable:
                self.send_header("ETag", etag)
            if path.endswith((".js", ".css")):
                self.send_header("Vary", "Accept-Encoding")
            if compressed:
                self.send_header("Content-Encoding", "gzip")
            if not unchanged:
                self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")
                self.send_header("Content-Length", str(os.fstat(stream.fileno()).st_size))
            self.end_headers()
            if not head and not unchanged:
                shutil.copyfileobj(stream, self.wfile)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except (OSError, ValueError, UnicodeError):
            self.send_response(404)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
        finally:
            if stream:
                stream.close()


class RuntimeServer(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True

    def server_bind(self):
        TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[:2]

    def handle_error(self, *_args):
        print("Runtime request failed", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7188)
    parser.add_argument("--allow", action="append")
    args = parser.parse_args()
    if args.allow and set(args.allow) != {"index.html", "assets"}:
        parser.error("Only index.html and assets may be exposed")
    root = Path(args.root).resolve(strict=True)
    if not root.is_dir():
        parser.error("Root must be a built runtime directory")
    with RuntimeServer((str(ipaddress.IPv4Address(args.bind)), args.port), RuntimeHandler) as server:
        server.root = root
        print(json.dumps({"bind": server.server_address[0], "port": server.server_address[1], "root": str(root)}), flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
