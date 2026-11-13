CREATE TABLE IF NOT EXISTS child_specialist_links (
    child_id INTEGER NOT NULL,
    specialist_id INTEGER NOT NULL,
    specialist_type TEXT NOT NULL CHECK (length(trim(specialist_type)) > 0),

    PRIMARY KEY (child_id, specialist_id),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_child_specialist_links_specialist_id
    ON child_specialist_links (specialist_id);