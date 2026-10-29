CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(
        role IN ('parent', 'specialist', 'child')
    ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);