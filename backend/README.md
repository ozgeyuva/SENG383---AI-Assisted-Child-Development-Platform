# Backend

## Setup

Run these commands from the backend directory:

    npm ci

## Create the local database and demo accounts

    npm run seed

The database is created at data/lumi.sqlite.

Synthetic demo accounts:

| Role | Email | Password |
|---|---|---|
| Parent | parent@example.test | Demo1234! |
| Specialist | specialist@example.test | Demo1234! |

Passwords are stored as hashes.
Running the seed again preserves existing accounts.

KAN-118 adds `003_create_tasks.sql` to the existing migration list. Database
initialization applies it automatically, including when opening an existing
database. Existing users and child profiles are preserved.

Tasks reference `children.id` through `child_id` and `users.id` through
`assigned_by`. The shared `task_categories` table contains Academic,
Extracurricular and Health, following the SRS task mockup. Task forms and
statistics should read this same list. Required task fields are title,
description, category and due_date (YYYY-MM-DD). New tasks default to
Not Started; supported statuses are Not Started, In Progress and Completed.
The nullable completed_at field is reserved for the completion flow.

The seed also creates a synthetic task for Deniz Demo and preserves its
progress on subsequent runs. Task assignment authorization belongs in the
task API: foreign keys alone do not enforce parent ownership or specialist
linkage. This migration does not implement task routes or child login mapping.

## Tests

    npm test

Tests use isolated in-memory databases.

## Run the API

From the backend directory:

    npm start

The API runs at http://127.0.0.1:3000.
Stop it with Control + C.

## Registration

POST /api/auth/register

Required fields: first_name, last_name, email, password, role.
Public registration accepts parent and specialist roles.

Responses:
- 201: User created.
- 400: Invalid or missing fields.
- 409: Email already registered.

Passwords are hashed and excluded from responses.

## Login

POST /api/auth/login

Required fields: email, password.

Responses:
- 200: Returns a JWT and user details.
- 400: Missing or invalid field types.
- 401: Incorrect email or password.

The role comes from the stored account.
JWTs expire after one hour.
Passwords and password hashes are excluded from responses.

Create a backend/.env file containing JWT_SECRET before starting the API.
Use a randomly generated secret and keep this file out of Git.

## Protected routes

JWT authentication middleware is available at src/middleware/auth.js.

Protected requests must include:

    Authorization: Bearer <token>

The middleware verifies the HS256 signature, expiration,
user ID and role claims. Missing, invalid or expired tokens
receive HTTP 401.

Verified account information is available through:
- req.auth.userId
- req.auth.role

Role and child-access authorization will be implemented separately.

## Role authorization

src/middleware/access.js provides shared role authorization.
It runs after JWT authentication and reads the current account
role from the database.

Missing accounts receive HTTP 401.
Disallowed roles receive HTTP 403.

The children API allows parents only and preserves ownership checks.

Specialist-child access and child-account mapping are not yet implemented.

## Task assignment (KAN-117, parent MVP)

KAN-116 adds authenticated `GET /api/tasks/categories`, returning
`{ "categories": ["Academic", "Extracurricular", "Health"] }` from the shared
task_categories table. It uses the same parent-only access policy as assignment.

POST /api/tasks

Requires a parent JWT in the Authorization header. This branch depends on
the KAN-118 task migration. The current MVP implements parent assignment;
linked-specialist assignment remains outside this MVP and depends on M2.
Specialist and child accounts receive HTTP 403.

Example JSON request:

```json
{
  "child_id": 1,
  "title": "Read for 15 minutes",
  "description": "Read a book of your choice.",
  "category": "Academic",
  "due_date": "2026-11-08"
}
```

All six fields are required. child_id must be a positive integer identifying
one of the authenticated parent's children. Text fields are trimmed. Category
must exist in task_categories; due_date must be a valid YYYY-MM-DD calendar
date. No future-only restriction is imposed on due dates.

The server derives assigned_by from the authenticated account, uses the
database default Not Started and leaves completed_at null. Client-supplied
IDs, assigner, status and timestamps cannot override these values.

Responses:
- 201: Returns `{ "task": { ... } }` containing the saved task.
- 400: Invalid or missing fields; includes error and field.
- 401: Missing, invalid or expired token, or a deleted account.
- 403: Non-parent account, another parent's child or nonexistent child.

Rejected requests do not create tasks. The API rechecks the stored account
role and child ownership on every request. Task listing and completion are
separate work items.
