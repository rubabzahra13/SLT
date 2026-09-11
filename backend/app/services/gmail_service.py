import base64
import json
import logging
import urllib.parse
import urllib.request
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.email_connection import EmailConnection

logger = logging.getLogger(__name__)

GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email openid"

class GmailService:
    @staticmethod
    def get_active_connection(db: Session) -> Optional[EmailConnection]:
        return db.query(EmailConnection).filter(
            EmailConnection.provider == "google",
            EmailConnection.is_active == True
        ).order_by(EmailConnection.updated_at.desc()).first()

    @staticmethod
    def build_authorization_url() -> str:
        client_id = settings.GOOGLE_CLIENT_ID
        redirect_uri = settings.GOOGLE_REDIRECT_URI

        if not client_id:
            logger.warning("GOOGLE_CLIENT_ID environment variable is not configured.")

        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": GMAIL_SCOPE,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    @staticmethod
    def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
        url = "https://oauth2.googleapis.com/token"
        data = urllib.parse.urlencode({
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return result
        except Exception as e:
            logger.error(f"Failed to exchange OAuth authorization code: {e}")
            raise Exception("Failed to exchange OAuth authorization code with Google")

    @staticmethod
    def get_user_info(access_token: str) -> Dict[str, Any]:
        url = "https://www.googleapis.com/oauth2/v2/userinfo"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.error(f"Failed to fetch user info from Google: {e}")
            raise Exception("Failed to fetch account info from Google")

    @staticmethod
    def get_valid_access_token(db: Session, connection: EmailConnection) -> str:
        if not connection.refresh_token:
            raise Exception("No stored refresh token found for Google connection")

        url = "https://oauth2.googleapis.com/token"
        data = urllib.parse.urlencode({
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": connection.refresh_token,
            "grant_type": "refresh_token",
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib.request.urlopen(req) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                access_token = res_data.get("access_token")
                if not access_token:
                    raise Exception("Access token missing in Google token response")
                return access_token
        except Exception as e:
            logger.error(f"Failed to refresh Google access token: {e}")
            raise Exception("Failed to refresh Google access token using refresh token")

    @staticmethod
    def save_or_update_connection(
        db: Session,
        email: str,
        refresh_token: str,
        connected_by_id: Optional[Any] = None
    ) -> EmailConnection:
        existing = db.query(EmailConnection).filter(
            EmailConnection.provider == "google",
            EmailConnection.email == email
        ).first()

        if existing:
            existing.refresh_token = refresh_token
            existing.is_active = True
            if connected_by_id:
                existing.connected_by_id = connected_by_id
            db.commit()
            db.refresh(existing)
            return existing

        # Deactivate any previous active connection
        db.query(EmailConnection).filter(EmailConnection.provider == "google").update({"is_active": False})

        new_conn = EmailConnection(
            provider="google",
            email=email,
            refresh_token=refresh_token,
            is_active=True,
            connected_by_id=connected_by_id,
        )
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)
        return new_conn

    @staticmethod
    def send_email(
        db: Session,
        connection: EmailConnection,
        to_email: str,
        subject: str,
        body: str
    ) -> Dict[str, Any]:
        access_token = GmailService.get_valid_access_token(db, connection)

        msg = MIMEText(body, "plain", "utf-8")
        msg["To"] = to_email
        msg["From"] = connection.email
        msg["Subject"] = subject

        raw_bytes = msg.as_bytes()
        raw_b64 = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")

        url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        payload = json.dumps({"raw": raw_b64}).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                logger.info(f"Successfully sent email via Gmail API to {to_email}. Message ID: {res.get('id')}")
                return res
        except Exception as e:
            logger.error(f"Failed to send email via Gmail API: {e}")
            raise Exception(f"Failed to send email via Gmail API: {e}")
