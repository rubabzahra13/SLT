# SLT CRM — Backend Foundation & API Services

This repository directory contains the Python FastAPI backend service for the **Sounds Like That (SLT) CRM**.

---

## 1. Architecture Overview

The backend acts as an intermediate REST API layer between the Next.js frontend and the Supabase PostgreSQL database.

```text
                    ┌─────────────────────┐
                    │   Next.js Frontend  │
                    │   localhost:3000    │
                    └──────────┬──────────┘
                               │
                            REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    │   localhost:8001    │
                    └──────────┬──────────┘
                               │
                          SQLAlchemy
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Supabase PostgreSQL │
                    │     Database        │
                    └─────────────────────┘
```

---

## 2. Directory Structure

```text
backend/
├── venv/                      # Python virtual environment (ignored in git)
├── app/
│   ├── main.py                # FastAPI app initialization, middleware, & router setup
│   ├── core/
│   │   ├── config.py          # Environment settings & Database URL parsing
│   │   └── database.py        # SQLAlchemy engine & session factory
│   ├── models/
│   │   ├── __init__.py        # Exported SQLAlchemy ORM models
│   │   ├── base.py            # Declarative Base definition
│   │   ├── producer.py        # Producer & ProducerTimeOff models
│   │   ├── order.py           # Order model (Form submissions & normalized orders)
│   │   ├── mtd_record.py      # Music To Do (MTD) workflow model
│   │   ├── schedule_entry.py  # Producer schedule availability model
│   │   ├── discount_code.py   # Discount promo code model
│   │   ├── package_price.py   # Package catalog pricing model
│   │   └── secret_menu_pricing.py # Secret menu extra song tiers model
│   ├── schemas/
│   │   ├── __init__.py        # Exported Pydantic response schemas
│   │   ├── health.py          # Health endpoint response schema
│   │   ├── producer.py        # Producer Pydantic schemas
│   │   ├── order.py           # Order Pydantic schemas
│   │   └── mtd_record.py      # MTD Record Pydantic schemas
│   ├── api/
│   │   ├── __init__.py        # Aggregated API router (/api)
│   │   ├── health.py          # GET /health database health check
│   │   ├── producers.py       # GET /api/producers endpoint
│   │   ├── orders.py          # GET /api/orders endpoint
│   │   └── mtd.py             # GET /api/mtd endpoint
│   └── seed/
│       ├── __init__.py
│       └── seed_data.py       # Idempotent mock-data.json importer
├── alembic/
│   ├── env.py                 # Alembic migration environment configuration
│   ├── script.py.mako         # Migration script template
│   └── versions/              # Database migration version files
├── alembic.ini                # Alembic configuration file
├── requirements.txt           # Python dependency manifest
└── README.md                  # Backend documentation
```

---

## 3. Setup & Installation

### Prerequisites
* Python 3.11+
* Supabase PostgreSQL Database connection string

### Virtual Environment Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 4. Environment Variables

The backend loads configuration from `.env` located at the repository root (`../.env` relative to `backend/`).

### Required Configuration Key

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
# OR
SUPABASE_DIRECT_CONNECTION_STRING=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

---

## 5. Database Migrations (Alembic)

Database schema migrations are managed using Alembic.

### Running Migrations

To apply all pending migrations against Supabase:

```bash
cd backend
source venv/bin/activate

alembic upgrade head
```

---

## 6. Data Seeding

To seed the Supabase database with data from `src/data/mock-data.json`:

```bash
cd backend
source venv/bin/activate

python -m app.seed.seed_data
```

> [!NOTE]
> The seed script is **idempotent**. Running it multiple times will update existing records without generating duplicate entries.

---

## 7. Running the FastAPI Server

Start the development server on port **8001**:

```bash
cd backend
source venv/bin/activate

uvicorn app.main:app --reload --port 8001
```

---

## 8. Available Initial Endpoints

* `GET /health` — Verifies API & PostgreSQL database connectivity. Returns `{"status": "ok", "database": "connected"}`.
* `GET /api/producers` — Returns active producer records from database.
* `GET /api/orders` — Returns order intake records from database.
* `GET /api/mtd` — Returns Music To Do workflow records from database.
* `GET /api/docs` — Swagger UI API documentation.

---

## 9. Database Model Overview

* **`producers`**: Producer profiles, initials, specialties, work days, max daily mixes limit, and overtime days.
* **`producer_time_off`**: Vacation, holiday, and personal leave ranges for producers (`producer_id` FK).
* **`orders`**: Form submissions and order intake details.
* **`mtd_records`**: Operational Music To Do board entries linked to `orders.id` (`order_id` FK) and `producers.id` (`assigned_producer_id` FK).
* **`schedule_entries`**: Matrix view daily producer capacity and booking counts (`producer_id` FK).
* **`discount_codes`**: Promo codes and usage rules.
* **`package_prices`**: Standard package pricing catalog.
* **`secret_menu_pricing`**: Semi-Custom Plus package extra song tiers.
