# Magento VPS poller

Standalone poller for the Lightsail host. It fetches Magento WebForms results and POSTs them to the existing FastAPI ingest route. It does not write to Supabase.

Python **3.12**. Standard library only.

## Environment variables

| Name | Required | Purpose |
|------|----------|---------|
| `WF_BASE` | yes | Magento REST base, for example `https://host/rest` |
| `WF_ACCESS_TOKEN` | yes | Bearer token for Magento |
| `MAGENTO_INGEST_URL` | yes | Full ingest URL, `https://<vercel-domain>/api/magento/ingest` |
| `MAGENTO_INGEST_SECRET` | yes | Shared secret sent as `X-Magento-Ingest-Secret` |
| `MAGENTO_POLL_FORM_IDS` | yes | Comma-separated form ids the CRM already maps: `1,2,3,4,5,6,7,8,9,10,11,14` |
| `MAGENTO_BATCH_SIZE` | no | Results per ingest POST. Default `50` |

Copy `env.example` to `.env` and restrict it:

```bash
cp env.example .env
chmod 600 .env
```

Fill real values in `.env` only. Do not commit `.env`.

## Setup

```bash
cd vps_poller
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` has no third-party packages. The venv keeps the poller on Python 3.12.

Load the env file for a manual run:

```bash
set -a
. ./.env
set +a
python poll.py
```

## Exit codes and logs

| Code | Meaning |
|------|---------|
| `0` | Every configured form was fetched and every batch was accepted by Vercel |
| `1` | One or more forms or batches failed after retries. Other forms were still attempted |
| `2` | Configuration is missing or invalid. No requests were made |

Logs record form id, batch index, and counts (`created`, `skipped`). They do not include tokens, the ingest secret, or submission field values.

`created` means Vercel inserted an order. Any `skipped_*` count means Vercel processed that submission (cutoff, duplicate, mismatch, unroutable, or missing id). Those do not need another retry. A later run of the same Magento payload is safe: Vercel duplicate protection returns `skipped_duplicate`.

HTTP 401 and 403 are not retried. Network errors and HTTP 429/5xx are retried up to 4 attempts with backoff of 1s, 2s, and 4s.

## Tests

```bash
cd vps_poller
python3.12 -m unittest discover -s tests -v
```
