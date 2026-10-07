# TravelGo
React (CDN) + Express + MySQL tour booking MVP.

## Run locally
1. `mysql -u root -p < schema.sql`
2. `npm install`
3. `DB_PASS=yourpassword npm start` → http://localhost:5001

## Deploy to Vercel
1. Create a hosted MySQL database (Aiven, Railway, TiDB Cloud, etc.) and run `schema.sql` against it
   (if your host gives you a fixed database name, remove the `CREATE DATABASE`/`USE` lines first).
2. Push this folder to GitHub and import it in Vercel (no build command, no framework preset needed).
3. In Project Settings → Environment Variables add everything in `.env.example`.
4. Deploy. `public/` is served as static files and `/api/*` runs `api/index.js` (the Express app).

## Login
On first request the server creates the `users` table and an admin account (`ADMIN_EMAIL` / `ADMIN_PASS`, defaults `admin@travelgo.com` / `admin123`). Set `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASS` before deploying publicly.
Admin: `/#/admin` (bookings) and `/#/admin/tours` (add, edit, delete tours). Customers can register at `/#/register` and see `/#/my-bookings`.
