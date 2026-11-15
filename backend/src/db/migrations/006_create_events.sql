CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('School', 'Extracurricular', 'Health', 'Other'))
);

CREATE INDEX IF NOT EXISTS idx_events_child_date_time ON events(child_id, event_date, event_time);