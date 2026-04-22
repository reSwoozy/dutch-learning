#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import threading
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROGRESS_FILE_NAME = "dutch-progress.json"
PROGRESS_URL_PATH = "/" + PROGRESS_FILE_NAME
MAX_BODY_BYTES = 10 * 1024 * 1024


class DutchRequestHandler(SimpleHTTPRequestHandler):
    server_version = "DutchServer/1.0"
    _write_lock = threading.Lock()

    def handle(self) -> None:
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def handle_one_request(self) -> None:
        try:
            super().handle_one_request()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            self.close_connection = True

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_PUT(self) -> None:
        if self.path != PROGRESS_URL_PATH:
            self.send_error(HTTPStatus.NOT_FOUND, "Only /%s accepts PUT" % PROGRESS_FILE_NAME)
            return

        length_raw = self.headers.get("Content-Length")
        if length_raw is None:
            self.send_error(HTTPStatus.LENGTH_REQUIRED, "Content-Length is required")
            return
        try:
            length = int(length_raw)
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Content-Length")
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Body too large or empty")
            return

        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(HTTPStatus.BAD_REQUEST, "Body is not valid JSON")
            return
        if not isinstance(payload, dict):
            self.send_error(HTTPStatus.BAD_REQUEST, "Root JSON value must be an object")
            return

        target = Path(self.server.root_directory) / PROGRESS_FILE_NAME
        try:
            with self._write_lock:
                self._atomic_write(target, body)
        except OSError as exc:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"Write failed: {exc}")
            return

        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Allow", "GET, HEAD, PUT, OPTIONS")
        self.end_headers()

    @staticmethod
    def _atomic_write(target: Path, body: bytes) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(
            prefix=target.name + ".",
            suffix=".tmp",
            dir=str(target.parent),
        )
        try:
            with os.fdopen(fd, "wb") as fh:
                fh.write(body)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp_path, target)
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


class DutchHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, server_address, handler_cls, root_directory: Path):
        self.root_directory = str(root_directory)
        super().__init__(server_address, handler_cls)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Dutch Learning local HTTP server.")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--directory", default=".")
    args = parser.parse_args(argv)

    root = Path(args.directory).resolve()
    if not root.is_dir():
        print(f"Directory not found: {root}", file=sys.stderr)
        return 2

    handler_cls = partial(DutchRequestHandler, directory=str(root))
    server = DutchHTTPServer((args.bind, args.port), handler_cls, root)

    try:
        print(f"Dutch server on http://{args.bind}:{args.port}/ (root: {root})")
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
