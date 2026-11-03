"""Mocked tests for the Lightsail Magento poller. No live HTTP."""

from __future__ import annotations

import io
import json
import unittest
import urllib.error
from unittest.mock import patch

from magento_poller.config import ConfigError, PollerConfig, load_config
from magento_poller.http_client import HttpStatusError, request_json
from magento_poller.run import chunked, forward_batch, run_poll


def _config(**overrides) -> PollerConfig:
    values = dict(
        wf_base="https://magento.example/rest",
        wf_access_token="magento-token",
        ingest_url="https://app.example/api/magento/ingest",
        ingest_secret="ingest-secret",
        form_ids=(1, 2),
        batch_size=2,
        timeout_seconds=5,
        max_attempts=3,
    )
    values.update(overrides)
    return PollerConfig(**values)


def _result(result_id: str) -> dict:
    return {"result_id": result_id, "form_id": 1, "fields": []}


class _Response:
    def __init__(self, body: str, status: int = 200) -> None:
        self._body = body.encode("utf-8")
        self.status = status

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class ConfigTests(unittest.TestCase):
    def test_requires_form_ids_from_env(self):
        with self.assertRaises(ConfigError):
            load_config(
                {
                    "WF_BASE": "https://magento.example/rest",
                    "WF_ACCESS_TOKEN": "t",
                    "MAGENTO_INGEST_URL": "https://app.example/api/magento/ingest",
                    "MAGENTO_INGEST_SECRET": "s",
                }
            )

    def test_parses_supported_ids_and_default_batch(self):
        config = load_config(
            {
                "WF_BASE": "https://magento.example/rest/",
                "WF_ACCESS_TOKEN": "t",
                "MAGENTO_INGEST_URL": "https://app.example/api/magento/ingest",
                "MAGENTO_INGEST_SECRET": "s",
                "MAGENTO_POLL_FORM_IDS": "1,2,14",
            }
        )
        self.assertEqual(config.form_ids, (1, 2, 14))
        self.assertEqual(config.batch_size, 50)
        self.assertEqual(config.wf_base, "https://magento.example/rest")


class HttpRetryTests(unittest.TestCase):
    def test_retries_network_then_succeeds(self):
        sleeps: list[float] = []
        calls = {"n": 0}

        def urlopen(request, timeout=0):
            calls["n"] += 1
            if calls["n"] == 1:
                raise urllib.error.URLError("temporary")
            return _Response(json.dumps([{"result_id": "1"}]))

        with patch("magento_poller.http_client.urllib.request.urlopen", side_effect=urlopen):
            payload = request_json(
                "GET",
                "https://magento.example/rest/V1/webforms/form/1/results",
                headers={"Authorization": "Bearer secret-token"},
                max_attempts=3,
                sleep=sleeps.append,
            )
        self.assertEqual(payload, [{"result_id": "1"}])
        self.assertEqual(sleeps, [1])
        self.assertEqual(calls["n"], 2)

    def test_401_is_not_retried(self):
        def urlopen(request, timeout=0):
            raise urllib.error.HTTPError(
                request.full_url, 401, "unauthorized", hdrs=None, fp=io.BytesIO(b"no")
            )

        with patch("magento_poller.http_client.urllib.request.urlopen", side_effect=urlopen) as mocked:
            with self.assertRaises(HttpStatusError) as caught:
                request_json(
                    "GET",
                    "https://magento.example/rest/V1/webforms/form/1/results",
                    headers={},
                    max_attempts=3,
                    sleep=lambda _delay: None,
                )
        self.assertEqual(caught.exception.status, 401)
        self.assertEqual(mocked.call_count, 1)

    def test_403_is_not_retried(self):
        def urlopen(request, timeout=0):
            raise urllib.error.HTTPError(
                request.full_url, 403, "forbidden", hdrs=None, fp=io.BytesIO(b"no")
            )

        with patch("magento_poller.http_client.urllib.request.urlopen", side_effect=urlopen) as mocked:
            with self.assertRaises(HttpStatusError) as caught:
                request_json("POST", "https://app.example/api/magento/ingest", headers={}, body={}, max_attempts=3)
        self.assertEqual(caught.exception.status, 403)
        self.assertEqual(mocked.call_count, 1)

    def test_5xx_retries_then_fails(self):
        sleeps: list[float] = []

        def urlopen(request, timeout=0):
            raise urllib.error.HTTPError(
                request.full_url, 503, "unavailable", hdrs=None, fp=io.BytesIO(b"later")
            )

        with patch("magento_poller.http_client.urllib.request.urlopen", side_effect=urlopen) as mocked:
            with self.assertRaises(HttpStatusError) as caught:
                request_json(
                    "POST",
                    "https://app.example/api/magento/ingest",
                    headers={},
                    body={"form_id": 1, "results": []},
                    max_attempts=3,
                    sleep=sleeps.append,
                )
        self.assertEqual(caught.exception.status, 503)
        self.assertEqual(mocked.call_count, 3)
        self.assertEqual(sleeps, [1, 2])


class RunTests(unittest.TestCase):
    def test_chunked_batches(self):
        items = [_result(str(index)) for index in range(5)]
        self.assertEqual([len(batch) for batch in chunked(items, 2)], [2, 2, 1])

    def test_forwards_multiple_forms_and_batches(self):
        fetched = {
            1: [_result("a"), _result("b"), _result("c")],
            2: [],
        }
        posts: list[tuple[int, int]] = []

        def fake_request(method, url, **kwargs):
            if method == "GET":
                form_id = int(url.rstrip("/").split("/")[-2])
                return fetched[form_id]
            body = kwargs["body"]
            posts.append((body["form_id"], len(body["results"])))
            return {
                "received": len(body["results"]),
                "created": 1,
                "skipped_cutoff": len(body["results"]) - 1,
                "skipped_duplicate": 0,
            }

        with patch("magento_poller.run.request_json", side_effect=fake_request):
            summary = run_poll(_config())
        self.assertTrue(summary.ok)
        self.assertEqual(posts, [(1, 2), (1, 1)])
        self.assertEqual(summary.forms[0].fetched, 3)
        self.assertEqual(summary.forms[0].batches, 2)
        self.assertEqual(summary.forms[0].created, 2)
        self.assertEqual(summary.forms[0].skipped, 1)
        self.assertEqual(summary.forms[1].fetched, 0)

    def test_empty_form_is_success(self):
        with patch("magento_poller.run.request_json", return_value=[]):
            summary = run_poll(_config(form_ids=(1,), batch_size=50))
        self.assertTrue(summary.ok)
        self.assertEqual(summary.forms[0].fetched, 0)
        self.assertEqual(summary.forms[0].batches, 0)

    def test_mixed_created_and_skipped_counts(self):
        def fake_request(method, url, **kwargs):
            if method == "GET":
                return [_result("1"), _result("2")]
            return {
                "received": 2,
                "created": 1,
                "skipped_cutoff": 0,
                "skipped_duplicate": 1,
                "skipped_form_mismatch": 0,
                "skipped_unroutable": 0,
                "skipped_missing_result_id": 0,
            }

        with patch("magento_poller.run.request_json", side_effect=fake_request):
            summary = run_poll(_config(form_ids=(1,), batch_size=50))
        self.assertTrue(summary.ok)
        self.assertEqual(summary.forms[0].created, 1)
        self.assertEqual(summary.forms[0].skipped, 1)

    def test_partial_batch_failure_continues_and_marks_run_failed(self):
        calls = {"post": 0}

        def fake_request(method, url, **kwargs):
            if method == "GET" and url.endswith("/form/1/results"):
                return [_result("a"), _result("b"), _result("c"), _result("d")]
            if method == "GET":
                return [_result("e")]
            calls["post"] += 1
            if calls["post"] == 1:
                raise HttpStatusError(500, "boom")
            return {"received": len(kwargs["body"]["results"]), "created": 1, "skipped_duplicate": 0}

        with patch("magento_poller.run.request_json", side_effect=fake_request):
            summary = run_poll(_config(batch_size=2))
        self.assertFalse(summary.ok)
        self.assertTrue(summary.forms[0].failed)
        self.assertEqual(summary.forms[0].created, 1)
        self.assertFalse(summary.forms[1].failed)
        self.assertEqual(summary.forms[1].created, 1)

    def test_rerun_same_results_counts_duplicates_as_success(self):
        def fake_request(method, url, **kwargs):
            if method == "GET":
                return [_result("same")]
            return {
                "received": 1,
                "created": 0,
                "skipped_duplicate": 1,
            }

        with patch("magento_poller.run.request_json", side_effect=fake_request):
            first = run_poll(_config(form_ids=(1,), batch_size=50))
            second = run_poll(_config(form_ids=(1,), batch_size=50))
        self.assertTrue(first.ok and second.ok)
        self.assertEqual(second.forms[0].skipped, 1)
        self.assertEqual(second.forms[0].created, 0)

    def test_forward_sends_secret_header_without_logging_it(self):
        seen = {}

        def fake_request(method, url, **kwargs):
            seen["headers"] = kwargs["headers"]
            seen["body"] = kwargs["body"]
            return {"received": 1, "created": 1}

        with patch("magento_poller.run.request_json", side_effect=fake_request):
            forward_batch(_config(form_ids=(1,)), 1, [_result("9")])
        self.assertEqual(seen["headers"]["X-Magento-Ingest-Secret"], "ingest-secret")
        self.assertEqual(seen["body"]["form_id"], 1)
        self.assertNotIn("ingest-secret", json.dumps({k: v for k, v in seen["headers"].items() if k != "X-Magento-Ingest-Secret"}))


if __name__ == "__main__":
    unittest.main()
