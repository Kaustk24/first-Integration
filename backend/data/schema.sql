-- PostgreSQL Schema for NIFTY 50 ML Trading Profile & Trades
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
