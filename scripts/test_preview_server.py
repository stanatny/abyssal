"""Exercise actual HTTP cache negotiation and the compiled-file boundary."""

import gzip
import http.client
import tempfile
import threading
import unittest
from pathlib import Path

from preview_server import RuntimeHandler, RuntimeServer


class PreviewServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        (self.root / "assets").mkdir()
        (self.root / "index.html").write_bytes(b"first build")
        self.name = "/assets/model-1234abcd.js"
        self.body = b"export default 'model';" * 100
        (self.root / self.name[1:]).write_bytes(self.body)
        (self.root / (self.name[1:] + ".gz")).write_bytes(gzip.compress(self.body))
        (self.root / "secret").write_bytes(b"not public")
        (self.root / "assets/leak-1234abcd.js").symlink_to(self.root / "secret")
        self.server = RuntimeServer(("127.0.0.1", 0), RuntimeHandler)
        self.server.root = self.root
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, headers=None, method="GET"):
        conn = http.client.HTTPConnection(*self.server.server_address, timeout=5)
        conn.request(method, path, headers=headers or {})
        res = conn.getresponse()
        result = res.status, dict(res.getheaders()), res.read()
        conn.close()
        return result

    def test_fresh_html_and_versioned_resource(self):
        _, headers, _ = self.request("/")
        self.assertEqual(headers["Cache-Control"], "no-store")
        (self.root / "index.html").write_bytes(b"second build")
        self.assertEqual(self.request("/?v=old")[2], b"second build")
        status, headers, body = self.request(self.name)
        self.assertEqual((status, body), (200, self.body))
        self.assertIn("immutable", headers["Cache-Control"])
        self.assertEqual(self.request(self.name, {"If-None-Match": headers["ETag"]})[0], 304)
        newer = "/assets/model-5678efgh.js"
        (self.root / newer[1:]).write_bytes(b"replacement model")
        self.assertEqual(self.request(newer)[2], b"replacement model")
        self.assertEqual(self.request(self.name)[2], self.body)

    def test_encoding_and_conditional_requests(self):
        status, headers, body = self.request(self.name, {"Accept-Encoding": "br, gzip"})
        self.assertEqual(status, 200)
        self.assertEqual(gzip.decompress(body), self.body)
        self.assertEqual(headers["Vary"], "Accept-Encoding")
        self.assertEqual(headers["Content-Encoding"], "gzip")
        self.assertEqual(self.request(self.name, {"Accept-Encoding": "gzip", "If-None-Match": 'W/' + headers["ETag"]})[0], 304)
        self.assertEqual(self.request(self.name, {"If-None-Match": headers["ETag"]})[0], 200)
        _, identity, body = self.request(self.name, {"Accept-Encoding": "gzip;q=0, *;q=1"})
        self.assertNotIn("Content-Encoding", identity)
        self.assertEqual(body, self.body)
        _, head, body = self.request(self.name, {"Accept-Encoding": "gzip"}, "HEAD")
        self.assertEqual(head["Content-Length"], headers["Content-Length"])
        self.assertEqual(body, b"")

    def test_runtime_boundary_and_uncached_failures(self):
        for path in ["/src/main.js", "/.env", "/secret", "/assets/", "/assets/../secret", "/assets/%2e%2e/secret", "/assets%2fleak-1234abcd.js", "/assets/%252eenv", "/assets/leak-1234abcd.js", "/assets/missing-abcd1234.webp"]:
            with self.subTest(path=path):
                status, headers, body = self.request(path)
                self.assertEqual(status, 404)
                self.assertEqual(headers["Cache-Control"], "no-store")
                self.assertNotIn(b"not public", body)

    def test_nonfingerprinted_files_never_get_immutable_cache(self):
        (self.root / "assets/live.json").write_bytes(b"{}")
        self.assertEqual(self.request("/assets/live.json")[1]["Cache-Control"], "no-store")


if __name__ == "__main__":
    unittest.main()
