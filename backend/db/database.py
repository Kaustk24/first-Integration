"""
PostgreSQL Database configuration using SQLAlchemy.
Reads credentials from environment variables or .env file.
"""
from __future__ import annotations

import os
import logging
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv(override=True)
logger = logging.getLogger("db_service")

# Read credentials from environment
DB_USER = os.getenv("POSTGRES_USER", "postgres").strip()
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres").strip()
DB_HOST = os.getenv("POSTGRES_HOST", "localhost").strip()
DB_PORT = os.getenv("POSTGRES_PORT", "5432").strip()
DB_NAME = os.getenv("POSTGRES_DB", "nifty_trader_db").strip()

# Construct standard SQLAlchemy PostgreSQL connection URL
DEFAULT_URL = f"postgresql://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_URL).strip()

# Create SQLAlchemy engine with connection pool & pre-ping
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"connect_timeout": 5}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> tuple[bool, str]:
    """Tests if PostgreSQL is reachable with current credentials."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Connected to PostgreSQL successfully"
    except Exception as e:
        err_msg = str(e)
        logger.warning("PostgreSQL connection check failed: %s", err_msg)
        return False, err_msg
