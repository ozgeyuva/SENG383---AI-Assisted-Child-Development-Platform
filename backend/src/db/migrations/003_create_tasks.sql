CREATE TABLE IF NOT EXISTS task_categories (
    name TEXT PRIMARY KEY NOT NULL
);

-- Shared by task forms and statistics; labels follow the SRS task mockup.
INSERT OR IGNORE INTO task_categories (name)
VALUES ('Academic'), ('Extracurricular'), ('Health');

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    description TEXT NOT NULL CHECK(length(trim(description)) > 0),
    category TEXT NOT NULL,
    due_date TEXT NOT NULL CHECK(
        length(due_date) = 10
        AND due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND date(due_date, '+0 days') IS NOT NULL
        AND date(due_date, '+0 days') = due_date
    ),
    status TEXT NOT NULL DEFAULT 'Not Started'
        CHECK(status IN ('Not Started', 'In Progress', 'Completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,

    FOREIGN KEY (child_id) REFERENCES children(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    FOREIGN KEY (category) REFERENCES task_categories(name)
);

CREATE INDEX IF NOT EXISTS idx_tasks_child_due_date
    ON tasks(child_id, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_assigner
    ON tasks(assigned_by);
