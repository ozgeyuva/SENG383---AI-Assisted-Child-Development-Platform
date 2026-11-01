# React + Vite

## Parent task assignment (KAN-116)

After signing in as a parent, select a child and open their tasks page.
The existing Assign a New Task card contains required title, description,
category and due-date fields. Categories load from the authenticated
`GET /api/tasks/categories` endpoint and use the shared database list.
Submission calls `POST /api/tasks` with the selected child ID and session JWT.
The server sets the initial status to Not Started; parents cannot edit it.

The form disables submission during category loading and saving, supports
category-load retry, preserves entered values on failure and clears after
success. Changing child/session remounts the form and cancels pending requests.
Task-list retrieval is a separate work item (KAN-127/128).

Run the backend with JWT_SECRET configured and start this frontend with
`npm run dev`; the existing Vite proxy forwards `/api` to port 3000.
Verify with `npm test`, `npm run build` and `npm run lint`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
