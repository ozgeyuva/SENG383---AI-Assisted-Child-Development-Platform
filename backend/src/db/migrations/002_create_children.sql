CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    grade TEXT NOT NULL,

    FOREIGN KEY (parent_id) REFERENCES users(id)
);