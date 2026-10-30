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

## Current scope

User database, demo account seed and registration API are implemented.
Child login credentials and account-to-profile mapping remain to be agreed.