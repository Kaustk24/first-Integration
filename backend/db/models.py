"""
SQLAlchemy ORM models for UserProfile and TradeHistory.
"""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(50), primary_key=True, index=True, default="usr_demo_trader")
    full_name = Column(String(100), nullable=False, default="John Doe")
    email = Column(String(120), unique=True, index=True, nullable=False, default="demo@virtuebyte.com")
    username = Column(String(50), unique=True, index=True, nullable=False, default="johndoe")
    phone = Column(String(20), nullable=False, default="9876543210")
    avatar_initials = Column(String(10), nullable=False, default="JD")
    is_verified = Column(Boolean, default=True)
    registered_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trades = relationship("TradeHistory", back_populates="user", cascade="all, delete-orphan", order_by="desc(TradeHistory.created_at)")

    def compute_initials(self) -> str:
        parts = self.full_name.strip().split()
        if not parts:
            return "JD"
        if len(parts) == 1:
            return parts[0][:2].upper()
        return (parts[0][0] + parts[-1][0]).upper()


class TradeHistory(Base):
    __tablename__ = "trade_history"

    user_id = Column(String(50), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True, default="usr_demo_trader")
    date = Column(String(30), nullable=False)
    ticker = Column(String(20), nullable=False, index=True)
    type = Column(String(10), nullable=False)  # BUY / SELL
    qty = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, primary_key=True, default=datetime.utcnow)

    user = relationship("UserProfile", back_populates="trades")
