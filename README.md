# S.S. Opticals - Static Site Deployment Guide (Supabase)

Is project ko ab **Static Web App** mein convert kar diya gaya hai. Isse aap Render par **Free** host kar sakte hain aur ye direct Supabase se connect hoga.

## Environment Variables for Render (Static Site)

| Key | Value | Description |
| :--- | :--- | :--- |
| **`VITE_SUPABASE_URL`** | `https://[PROJECT-ID].supabase.co` | Supabase Project URL. |
| **`VITE_SUPABASE_ANON_KEY`** | `your-anon-key` | Supabase Anonymous Key. |

---

### Setup Instructions (Bohot Zaroori)

Architecture change hone ki wajah se aapko Supabase mein 2 kaam karne honge:

1.  **Database Tables Create Karein:** `supabase_setup.sql` file mein diye gaye code ko Supabase ke **SQL Editor** mein chalaein. Isse tables ban jayengi aur RLS (Security) set ho jayegi.
2.  **Environment Variables Set Karein:** Render dashboard mein upar diye gaye variables dalein. `DATABASE_URL` ki ab zaroorat nahi hai.

---

### Render "Web Service" vs "Static Site"

- Agar aap Render par **Static Site** (Free) tier use kar rahe hain, toh sirf build command (`npm install; npm run build`) kafi hai.
- Agar aap **Web Service** use kar rahe hain, toh maine `"start"` script add kar di hai jo app ko server par serve karegi.

### Step-by-Step Guide

1.  **Supabase Dashboard** jayein.
2.  **Project Settings** -> **API** mein jayein.
3.  Wahan se **Project URL** aur **anon public key** copy karein.
4.  Render mein naya Static Site banayein aur ye dono variables `VITE_` prefix ke sath dalein.

## Technical Overview
- **Architecture:** Serverless / Static SPA
- **Backend:** Supabase (Database + Auth/Policies)
- **Frontend:** React + Vite
