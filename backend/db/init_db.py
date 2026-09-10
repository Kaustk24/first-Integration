"""
Database initialization and seeding script for PostgreSQL.
Creates database if missing, generates tables, and seeds initial demo trader profile & trade records.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from datetime import datetime
from urllib.parse import quote_plus
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db.database import engine, Base, SessionLocal, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
from db.models import UserProfile, TradeHistory

SCHEMA_SQL_PATH = BACKEND_DIR / "data" / "schema.sql"

INITIAL_TRADES = [
    {"date": "2026-08-20", "ticker": "RELIANCE", "type": "BUY", "qty": 10, "price": 2950.00},
    {"date": "2026-08-19", "ticker": "TCS", "type": "SELL", "qty": 5, "price": 3750.25},
    {"date": "2026-08-18", "ticker": "HDFCBANK", "type": "BUY", "qty": 50, "price": 1790.10},
    {"date": "2026-08-17", "ticker": "INFY", "type": "BUY", "qty": 25, "price": 1880.00},
    {"date": "2026-08-15", "ticker": "ITC", "type": "SELL", "qty": 100, "price": 415.50},
]


def ensure_postgres_database_exists():
    """Connects to PostgreSQL server maintenance db and creates DB_NAME if it doesn't exist."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname="postgres",
            connect_timeout=4
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cur.fetchone()
        if not exists:
            cur.execute(f'CREATE DATABASE "{DB_NAME}"')
            print(f"[SUCCESS] Created PostgreSQL database '{DB_NAME}'.")
        else:
            print(f"[INFO] PostgreSQL database '{DB_NAME}' already exists.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[WARNING] Could not auto-create database (might already exist or credentials need review): {e}")


def write_standalone_schema_sql():
    """Writes a clean schema.sql file that can be opened and run directly in pgAdmin."""
    sql = f"""-- PostgreSQL Schema for NIFTY 50 ML Trading Profile & Trades
-- Generated automatically for pgAdmin 4 Query Tool

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL DEFAULT 'John Doe',
    email VARCHAR(120) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL DEFAULT '9876543210',
    avatar_initials VARCHAR(10) NOT NULL DEFAULT 'JD',
    is_verified BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Trade History Table (Without ID, Status, or PnL columns)
CREATE TABLE IF NOT EXISTS trade_history (
    user_id VARCHAR(50) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    date VARCHAR(30) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL,
    qty INTEGER NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP PRIMARY KEY DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trade_history(ticker);

-- 3. Seed Default Demo User
INSERT INTO user_profiles (id, full_name, email, username, phone, avatar_initials, is_verified, registered_at)
VALUES ('usr_demo_trader', 'John Doe', 'demo@virtuebyte.com', 'johndoe', '9876543210', 'JD', TRUE, '2026-01-15 09:30:00')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Initial Trades
INSERT INTO trade_history (user_id, date, ticker, type, qty, price)
VALUES
    ('usr_demo_trader', '2026-08-20', 'RELIANCE', 'BUY', 10, 2950.00),
    ('usr_demo_trader', '2026-08-19', 'TCS', 'SELL', 5, 3750.25),
    ('usr_demo_trader', '2026-08-18', 'HDFCBANK', 'BUY', 50, 1790.10),
    ('usr_demo_trader', '2026-08-17', 'INFY', 'BUY', 25, 1880.00),
    ('usr_demo_trader', '2026-08-15', 'ITC', 'SELL', 100, 415.50)
ON CONFLICT DO NOTHING;
"""
    SCHEMA_SQL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SCHEMA_SQL_PATH, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"[INFO] Exported pgAdmin SQL schema script to: {SCHEMA_SQL_PATH}")


def init_database() -> bool:
    """Initializes tables and seeds initial data."""
    write_standalone_schema_sql()
    ensure_postgres_database_exists()

    try:
        # Create all tables defined in Base
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Verified / Created PostgreSQL tables.")

        db = SessionLocal()
        try:
            # Seed default demo user
            user = db.query(UserProfile).filter_by(id="usr_demo_trader").first()
            if not user:
                user = UserProfile(
                    id="usr_demo_trader",
                    full_name="John Doe",
                    email="demo@virtuebyte.com",
                    username="johndoe",
                    phone="9876543210",
                    avatar_initials="JD",
                    is_verified=True,
                    registered_at=datetime(2026, 1, 15, 9, 30, 0)
                )
                db.add(user)
                db.commit()
                print("[SUCCESS] Seeded default demo user 'usr_demo_trader'.")

            # Seed initial trades if empty
            trade_count = db.query(TradeHistory).filter_by(user_id="usr_demo_trader").count()
            if trade_count == 0:
                for t_data in INITIAL_TRADES:
                    trade = TradeHistory(
                        user_id="usr_demo_trader",
                        date=t_data["date"],
                        ticker=t_data["ticker"],
                        type=t_data["type"],
                        qty=t_data["qty"],
                        price=t_data["price"]
                    )
                    db.add(trade)
                db.commit()
                print(f"[SUCCESS] Seeded {len(INITIAL_TRADES)} initial sample trades.")
            else:
                print(f"[INFO] Found {trade_count} existing trade history records in PostgreSQL.")

            return True
        finally:
            db.close()
    except Exception as e:
        print(f"[WARNING] Database initialization skipped or deferred: {e}")
        return False


if __name__ == "__main__":
    success = init_database()
    if success:
        print("[DONE] PostgreSQL Profile Database is fully configured and ready!")
    else:
        print("[NOTE] Review your POSTGRES_PASSWORD in .env if authentication failed.")
