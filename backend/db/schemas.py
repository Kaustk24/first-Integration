"""
Pydantic schemas for Profile and Trade History API request/response validation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TradeHistoryBase(BaseModel):
    date: str
    ticker: str
    type: str  # BUY or SELL
    qty: int = Field(gt=0)
    price: float = Field(gt=0)


class TradeHistoryCreate(TradeHistoryBase):
    user_id: Optional[str] = "usr_demo_trader"


class TradeHistoryResponse(TradeHistoryBase):
    user_id: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None


class ProfileStats(BaseModel):
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate_pct: float = 0.0
    total_realized_pnl: float = 0.0


class UserProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str
    username: str
    phone: str
    avatar_initials: str
    is_verified: bool
    registered_at: Optional[datetime] = None
    stats: ProfileStats
    recent_trades: List[TradeHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)
