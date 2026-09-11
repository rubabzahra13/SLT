import os
import sys

# Ensure backend folder is in Python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.core.database import SessionLocal
from app.models.producer import Producer

def prefix_producer_emails():
    db = SessionLocal()
    try:
        producers = db.query(Producer).all()
        print(f"Found {len(producers)} producer records in database.")
        updated_count = 0

        for p in producers:
            old_email = p.email or ""
            if old_email and not old_email.startswith("TEST"):
                new_email = f"TEST{old_email}"
                p.email = new_email
                updated_count += 1
                print(f"Updated {p.name} ({p.initials}): {old_email} -> {new_email}")
            else:
                print(f"Skipped {p.name} ({p.initials}): already prefixed ({old_email})")

        db.commit()
        print(f"\nSuccessfully updated {updated_count} producer email addresses!")

    except Exception as e:
        db.rollback()
        print(f"Error updating producer emails: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    prefix_producer_emails()
