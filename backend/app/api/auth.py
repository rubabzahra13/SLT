from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import verify_password
from app.models.user import User
from app.schemas.user import UserSchema, LoginRequestSchema, TokenResponseSchema

router = APIRouter()

# Simple token storage for active sessions in memory
# Token format: "slt-token-{user_id}"
SESSION_TOKENS: dict[str, str] = {}

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    token = authorization.replace("Bearer ", "").strip()
    user_id = SESSION_TOKENS.get(token)
    
    if not user_id:
        # Check if token itself encodes user_id or legacy fallback
        if token.startswith("token-"):
            user_id = token.replace("token-", "")
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token"
            )
            
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive or not found"
        )
    return user

def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    try:
        return get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None

def require_full_access(user: User = Depends(get_current_user)) -> User:
    if user.access_level != "Full Access":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: View Only accounts cannot modify data"
        )
    return user

@router.post("/auth/login", response_model=TokenResponseSchema)
def login(payload: LoginRequestSchema, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    
    # Query user case-insensitively by email
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated"
        )
    
    token = f"token-{user.id}"
    SESSION_TOKENS[token] = user.id
    
    return TokenResponseSchema(
        token=token,
        user=UserSchema.model_validate(user)
    )

@router.get("/auth/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        SESSION_TOKENS.pop(token, None)
    return {"message": "Logged out successfully"}
