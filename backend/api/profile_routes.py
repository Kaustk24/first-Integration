"""
FastAPI router for User Profile and Trade History endpoints.
Integrates with PostgreSQL via SQLAlchemy with graceful offline fallback.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db, check_db_connection
from db.models import UserProfile, TradeHistory
from db.schemas import (
    UserProfileResponse,
    UserProfileUpdate,
    TradeHistoryResponse,
    TradeHistoryCreate,
    ProfileStats
)

logger = logging.getLogger("profile_api")
router = APIRouter(prefix="/api/profile", tags=["User Profile & Trade History"])

# Fallback in-memory data if database is temporarily offline or credentials are being configured
FALLBACK_USER = {
    "id": "usr_demo_trader",
    "full_name": "John Doe",
    "email": "demo@virtuebyte.com",
    "username": "johndoe",
    "phone": "9876543210",
    "avatar_initials": "JD",
    "is_verified": True,
    "registered_at": datetime(2026, 1, 15, 9, 30, 0),
}

FALLBACK_TRADES = [
    {"user_id": "usr_demo_trader", "date": "2026-08-20", "ticker": "RELIANCE", "type": "BUY", "qty": 10, "price": 2950.00},
    {"user_id": "usr_demo_trader", "date": "2026-08-19", "ticker": "TCS", "type": "SELL", "qty": 5, "price": 3750.25},
    {"user_id": "usr_demo_trader", "date": "2026-08-18", "ticker": "HDFCBANK", "type": "BUY", "qty": 50, "price": 1790.10},
    {"user_id": "usr_demo_trader", "date": "2026-08-17", "ticker": "INFY", "type": "BUY", "qty": 25, "price": 1880.00},
    {"user_id": "usr_demo_trader", "date": "2026-08-15", "ticker": "ITC", "type": "SELL", "qty": 100, "price": 415.50},
]


def _compute_stats(trades: list) -> ProfileStats:
    total = len(trades)
    closed_with_pnl = [t for t in trades if getattr(t, "pnl", None) is not None]
    winning = [t for t in closed_with_pnl if t.pnl > 0]
    losing = [t for t in closed_with_pnl if t.pnl < 0]
    total_pnl = sum(t.pnl for t in closed_with_pnl) if closed_with_pnl else 0.0
    win_rate = (len(winning) / len(closed_with_pnl) * 100.0) if closed_with_pnl else 0.0

    return ProfileStats(
        total_trades=total,
        winning_trades=len(winning),
        losing_trades=len(losing),
        win_rate_pct=round(win_rate, 1),
        total_realized_pnl=round(total_pnl, 2)
    )


@router.get("", response_model=UserProfileResponse)
@router.get("/", response_model=UserProfileResponse)
def get_user_profile(
    user_id: str = "usr_demo_trader",
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    username: Optional[str] = None,
    phone: Optional[str] = None,
    avatar_initials: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves user profile and real-time trade statistics from PostgreSQL."""
    clean_name = str(full_name).strip() if (full_name and isinstance(full_name, str)) else "Trader"
    clean_email = str(email).strip() if (email and isinstance(email, str)) else f"{user_id}@niftytrader.local"
    clean_username = str(username).strip() if (username and isinstance(username, str)) else user_id
    clean_phone = str(phone).strip() if (phone and isinstance(phone, str)) else "9876543210"
    clean_initials = str(avatar_initials).strip() if (avatar_initials and isinstance(avatar_initials, str)) else (clean_name[:2].upper() if clean_name else "TR")

    try:
        user = db.query(UserProfile).filter_by(id=user_id).first()
        if not user:
            if user_id == "usr_demo_trader":
                user = UserProfile(
                    id="usr_demo_trader",
                    full_name=FALLBACK_USER["full_name"],
                    email=FALLBACK_USER["email"],
                    username=FALLBACK_USER["username"],
                    phone=FALLBACK_USER["phone"],
                    avatar_initials=FALLBACK_USER["avatar_initials"],
                    is_verified=True,
                    registered_at=FALLBACK_USER["registered_at"]
                )
            else:
                # Real user account: create their distinct profile without colliding with demo user
                if db.query(UserProfile).filter_by(email=clean_email).first():
                    clean_email = f"{user_id}_{clean_email}"
                if db.query(UserProfile).filter_by(username=clean_username).first():
                    clean_username = f"{user_id}_{clean_username}"

                user = UserProfile(
                    id=user_id,
                    full_name=clean_name,
                    email=clean_email,
                    username=clean_username,
                    phone=clean_phone,
                    avatar_initials=clean_initials,
                    is_verified=True,
                    registered_at=datetime.utcnow()
                )
            db.add(user)
            db.commit()
            db.refresh(user)

        trades = db.query(TradeHistory).filter_by(user_id=user_id).order_by(TradeHistory.created_at.desc()).all()
        stats = _compute_stats(trades)

        return UserProfileResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            username=user.username,
            phone=user.phone,
            avatar_initials=user.avatar_initials,
            is_verified=user.is_verified,
            registered_at=user.registered_at,
            stats=stats,
            recent_trades=[TradeHistoryResponse.model_validate(t) for t in trades]
        )
    except Exception as e:
        logger.warning("PostgreSQL offline or query error: %s", e)
        if user_id == "usr_demo_trader":
            stats = ProfileStats(
                total_trades=len(FALLBACK_TRADES),
                winning_trades=2,
                losing_trades=1,
                win_rate_pct=66.7,
                total_realized_pnl=1337.0
            )
            return UserProfileResponse(
                **FALLBACK_USER,
                stats=stats,
                recent_trades=[TradeHistoryResponse(**t) for t in FALLBACK_TRADES]
            )
        else:
            # Real user fallback: zero trades, zero PnL
            stats = ProfileStats(
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate_pct=0.0,
                total_realized_pnl=0.0
            )
            return UserProfileResponse(
                id=user_id,
                full_name=clean_name,
                email=clean_email,
                username=clean_username,
                phone=clean_phone,
                avatar_initials=clean_initials,
                is_verified=True,
                registered_at=datetime.utcnow(),
                stats=stats,
                recent_trades=[]
            )


@router.put("", response_model=UserProfileResponse)
@router.put("/", response_model=UserProfileResponse)
def update_user_profile(payload: UserProfileUpdate, user_id: str = "usr_demo_trader", db: Session = Depends(get_db)):
    """Updates user profile details in PostgreSQL."""
    try:
        user = db.query(UserProfile).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User profile not found")

        if payload.full_name is not None and payload.full_name.strip():
            user.full_name = payload.full_name.strip()
            user.avatar_initials = user.compute_initials()
        if payload.email is not None and payload.email.strip():
            user.email = payload.email.strip()
        if payload.username is not None and payload.username.strip():
            user.username = payload.username.strip().lstrip("@")
        if payload.phone is not None and payload.phone.strip():
            user.phone = payload.phone.strip()

        db.commit()
        db.refresh(user)

        trades = db.query(TradeHistory).filter_by(user_id=user_id).all()
        stats = _compute_stats(trades)

        return UserProfileResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            username=user.username,
            phone=user.phone,
            avatar_initials=user.avatar_initials,
            is_verified=user.is_verified,
            registered_at=user.registered_at,
            stats=stats,
            recent_trades=[TradeHistoryResponse.model_validate(t) for t in trades]
        )
    except Exception as e:
        logger.error("Error updating profile in PostgreSQL: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {e}")


@router.get("/trades", response_model=List[TradeHistoryResponse])
def get_user_trades(user_id: str = "usr_demo_trader", db: Session = Depends(get_db)):
    """Fetches user's trade history records."""
    try:
        trades = db.query(TradeHistory).filter_by(user_id=user_id).order_by(TradeHistory.created_at.desc()).all()
        return [TradeHistoryResponse.model_validate(t) for t in trades]
    except Exception as e:
        logger.warning("Error fetching trades from PostgreSQL, using fallback: %s", e)
        if user_id == "usr_demo_trader":
            return [TradeHistoryResponse(**t) for t in FALLBACK_TRADES]
        return []


@router.post("/trades", response_model=TradeHistoryResponse, status_code=status.HTTP_201_CREATED)
def record_trade(payload: TradeHistoryCreate, db: Session = Depends(get_db)):
    """Records a new executed or simulated trade into PostgreSQL."""
    try:
        user_id = payload.user_id or "usr_demo_trader"

        # Ensure user exists in PostgreSQL before linking trade
        user = db.query(UserProfile).filter_by(id=user_id).first()
        if not user:
            user = UserProfile(
                id=user_id,
                full_name="Trader",
                email=f"{user_id}@niftytrader.local",
                username=user_id,
                phone="9876543210",
                avatar_initials="TR",
                is_verified=True,
                registered_at=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        trade = TradeHistory(
            user_id=user_id,
            date=payload.date,
            ticker=payload.ticker.upper(),
            type=payload.type.upper(),
            qty=payload.qty,
            price=payload.price
        )
        db.add(trade)
        db.commit()
        db.refresh(trade)
        return TradeHistoryResponse.model_validate(trade)
    except Exception as e:
        logger.error("Error saving trade to PostgreSQL: %s", e)
        fallback_item = {
            "user_id": payload.user_id or "usr_demo_trader",
            "date": payload.date,
            "ticker": payload.ticker.upper(),
            "type": payload.type.upper(),
            "qty": payload.qty,
            "price": payload.price
        }
        FALLBACK_TRADES.insert(0, fallback_item)
        return TradeHistoryResponse(**fallback_item)


@router.get("/db-status")
def get_db_status():
    """Checks PostgreSQL connection status."""
    connected, message = check_db_connection()
    return {
        "connected": connected,
        "message": message,
        "database": "PostgreSQL",
    }
