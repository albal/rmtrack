-- Create tracking table
DROP TABLE IF EXISTS tracking;

CREATE TABLE tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_id TEXT NOT NULL UNIQUE,
    notifications_enabled INTEGER DEFAULT 0,
    started_at TEXT NOT NULL,
    last_checked TEXT,
    last_status TEXT,
    delivered INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create tracking history table
DROP TABLE IF EXISTS tracking_history;

CREATE TABLE tracking_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_id TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tracking_id) REFERENCES tracking(tracking_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_tracking_id ON tracking(tracking_id);
CREATE INDEX idx_tracking_history_tracking_id ON tracking_history(tracking_id);
CREATE INDEX idx_tracking_delivered ON tracking(delivered);
