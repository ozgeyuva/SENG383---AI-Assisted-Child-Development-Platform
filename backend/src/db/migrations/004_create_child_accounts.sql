CREATE TABLE IF NOT EXISTS child_accounts (
    child_id INTEGER PRIMARY KEY REFERENCES children(id),
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id)
);