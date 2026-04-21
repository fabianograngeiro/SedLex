<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f9b5f9b4-1953-4e26-b189-9f7216a4de3d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env` (or `.env.local`) and set:
   - `GEMINI_API_KEY` (required)
   - `DATABASE_URL` (optional for now, reserved for future PostgreSQL use)
3. Run the app:
   `npm run dev`
4. Open:
   `http://localhost:3000`

## Current local storage mode

For local development, data is persisted in `data/db.json`.
The backend routes (`/api/users`, `/api/cases`, `/api/searches`, `/api/rulings`) use this JSON file instead of PostgreSQL.
