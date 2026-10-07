# TravelGo
React (CDN) + Express + MySQL tour booking MVP.

## Run locally
1. `mysql -u root -p < schema.sql`
2. `npm install`
3. `DB_PASS=yourpassword npm start` → http://localhost:5001

## Deploy to Vercel
1. Create a hosted MySQL database (Aiven, Railway, TiDB Cloud, etc.) and run `schema.hosted.sql` on it
   (same as `schema.sql` but without CREATE DATABASE / USE, which hosted databases usually reject).
2. Push this folder to GitHub, then in Vercel: Add New → Project → import the repo.
   Leave Framework Preset as "Other"; no build command or output directory needed.
3. Before deploying, add these Environment Variables (see `.env.example`):
   DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, DB_SSL (`true`, or `insecure` if the host's certificate is rejected),
   JWT_SECRET, ADMIN_EMAIL, ADMIN_PASS.
4. Deploy, then open `https://YOUR-APP.vercel.app/api/health`. `{"ok":true}` means the database is connected.
   Then open the site root.

## Login
On first request the server creates the `users` table and an admin account (`ADMIN_EMAIL` / `ADMIN_PASS`, defaults `admin@travelgo.com` / `admin123`). Set `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASS` before deploying publicly.
Admin: `/#/admin` (bookings) and `/#/admin/tours` (add, edit, delete tours). Customers can register at `/#/register` and see `/#/my-bookings`.
