from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.api.auth import get_current_user, get_optional_current_user, require_full_access
from app.models.user import User
from app.services.gmail_service import GmailService

router = APIRouter()


@router.get("/gmail/connect")
@router.get("/pilot2/inboxes/oauth/connect")
def start_google_oauth(user: User = Depends(require_full_access)):
    """Generate Google OAuth authorization URL for connecting Gmail account."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are not configured in your backend .env environment file. Please add your Google Cloud credentials to .env to complete the connection."
        )
    auth_url = GmailService.build_authorization_url()
    return {"url": auth_url}


@router.get("/pilot2/inboxes/oauth/callback")
def google_oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Callback endpoint handling Google OAuth authorization code exchange."""
    frontend_settings_url = f"{settings.FRONTEND_URL}/settings"

    if error:
        return RedirectResponse(url=f"{frontend_settings_url}?gmail_error=cancelled")

    if not code:
        return RedirectResponse(url=f"{frontend_settings_url}?gmail_error=no_code")

    try:
        token_data = GmailService.exchange_code_for_tokens(code)
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        if not access_token:
            return RedirectResponse(url=f"{frontend_settings_url}?gmail_error=token_failed")

        user_info = GmailService.get_user_info(access_token)
        email = user_info.get("email")

        if not email:
            return RedirectResponse(url=f"{frontend_settings_url}?gmail_error=no_email")

        # If refresh token not returned (because user previously authorized without consent prompt), check existing
        if not refresh_token:
            existing = GmailService.get_active_connection(db)
            if existing and existing.email == email:
                refresh_token = existing.refresh_token

        if not refresh_token:
            # Force re-consent if refresh token is missing
            return RedirectResponse(url=f"{frontend_settings_url}?gmail_error=missing_refresh_token")

        GmailService.save_or_update_connection(
            db=db,
            email=email,
            refresh_token=refresh_token
        )

        return RedirectResponse(url=f"{frontend_settings_url}?gmail_success=true")

    except Exception as e:
        return RedirectResponse(url=f"{frontend_settings_url}?gmail_error=oauth_failed")


@router.get("/gmail/status")
@router.get("/pilot2/inboxes/status")
def get_gmail_connection_status(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Get connected Gmail account status (safe metadata only, no credentials)."""
    conn = GmailService.get_active_connection(db)
    if not conn or not conn.is_active:
        return {
            "connected": False,
            "email": None,
            "provider": "google",
            "updated_at": None
        }

    return {
        "connected": True,
        "email": conn.email,
        "provider": "google",
        "updated_at": conn.updated_at.isoformat() if conn.updated_at else None
    }


@router.post("/gmail/disconnect")
def disconnect_gmail_account(
    db: Session = Depends(get_db),
    user: User = Depends(require_full_access)
):
    """Disconnect active Google account."""
    conn = GmailService.get_active_connection(db)
    if not conn or not conn.is_active:
        return {"success": True, "message": "No active Google connection to disconnect"}

    conn.is_active = False
    db.commit()
    return {"success": True, "message": f"Successfully disconnected Google account ({conn.email})"}


@router.post("/gmail/test-email")
def send_test_email(
    db: Session = Depends(get_db),
    user: User = Depends(require_full_access)
):
    """Send a test email from the connected Gmail account to itself."""
    conn = GmailService.get_active_connection(db)
    if not conn or not conn.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account is not connected."
        )

    subject = "SLT CRM - Gmail Connection Test"
    body = (
        "This is a test email from the Sounds Like That CRM.\n\n"
        "The Gmail connection and email sending integration are working correctly."
    )

    try:
        GmailService.send_email(
            db=db,
            connection=conn,
            to_email=conn.email,
            subject=subject,
            body=body
        )
        return {
            "success": True,
            "message": f"Test email sent successfully to {conn.email}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test email could not be sent. Please check the Google connection and try again. ({e})"
        )
