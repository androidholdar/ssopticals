# S.S. Opticals - Deployment Guide (Render + Supabase)

Is project ko Render par deploy karne ke liye aapko Supabase se kuch environment variables set karne honge. Render ke dashboard mein purane variables (`SUPABASE_ANON_KEY`, etc.) hata kar niche diye gaye variables dalein:

## Environment Variables for Render

| Key | Value | Description |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | `postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres` | Supabase Database ki connection string. |
| **`NODE_ENV`** | `production` | App ko production mode mein chalane ke liye. |

---

### DATABASE_URL kahan milega? (Where to find DATABASE_URL)

1.  **Supabase Dashboard** open karein.
2.  Apne project ki **Settings** (Gear icon) par jayein.
3.  **Database** tab par click karein.
4.  **Connection string** section mein jayein.
5.  **URI** tab ko select karein.
6.  Wahan jo link hai use copy karein aur Render mein `DATABASE_URL` key ke sath paste karein.
    *   **Dhyan dein:** Connection string mein `[YOUR-PASSWORD]` ki jagah apna asli database password dalein.

### Purane Variables (Variables to Remove)
Niche diye gaye variables is project mein **zaroorat nahi hai**, inhe aap delete kar sakte hain:
*   `SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`
*   `SUPABASE_URL`

---

## Technical Overview
This project uses:
- **Frontend:** React + Vite
- **Backend:** Express.js
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Drizzle ORM
