import pytest
from fastapi import HTTPException
from app.models.email_connection import EmailConnection
from app.models.user import User
from app.services.gmail_service import GmailService
from app.api.auth import require_full_access

def test_gmail_build_authorization_url():
    url = GmailService.build_authorization_url()
    assert "https://accounts.google.com/o/oauth2/v2/auth" in url
    assert "scope=" in url
    assert "access_type=offline" in url
    assert "prompt=consent" in url
    assert "gmail.send" in url

def test_save_and_retrieve_email_connection(db):
    email = "test@soundslikethat.com"
    token = "mock-refresh-token-xyz123"

    conn = GmailService.save_or_update_connection(
        db=db,
        email=email,
        refresh_token=token
    )

    assert conn.id is not None
    assert conn.email == email
    assert conn.refresh_token == token
    assert conn.is_active is True

    active = GmailService.get_active_connection(db)
    assert active is not None
    assert active.email == email
    assert active.refresh_token == token

def test_require_full_access_permissions():
    full_access_user = User(
        name="Megan",
        email="megan@soundslikethat.com",
        access_level="Full Access",
        is_active=True
    )
    view_only_user = User(
        name="Lori",
        email="lori@powermusic.com",
        access_level="View Only",
        is_active=True
    )

    assert require_full_access(full_access_user) == full_access_user

    with pytest.raises(HTTPException) as exc_info:
        require_full_access(view_only_user)

    assert exc_info.value.status_code == 403
    assert "Permission denied" in exc_info.value.detail
