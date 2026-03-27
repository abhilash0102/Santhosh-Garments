# 🧵 Santhosh Garments — Complete Website

Full-stack Node.js + Supabase website for Santhosh Garments tailoring & textiles shop.

## ⚡ Quick Start

    npm install
    node server.js

    Website  →  http://localhost:3000
    Admin    →  http://localhost:3000/admin
    Login       admin / santhosh2025

## ☁️ Supabase Database (already live)

    Project  : personalwork
    URL      : https://wetaigadlfehisagjixa.supabase.co
    Region   : Mumbai (ap-south-1)

All 7 tables are created, seeded and secured — no setup needed.

## 📁 Project Structure

    SanthoshGarments/
    ├── server.js              ← Express entry point
    ├── .env                   ← Supabase keys (keep secret)
    ├── package.json
    ├── middleware/
    │   ├── supabase.js        ← Supabase client
    │   └── auth.js            ← Session guard
    ├── routes/
    │   ├── public.js          ← Public website routes
    │   └── admin.js           ← Admin CRUD routes (protected)
    ├── public/css/
    │   ├── style.css          ← Public site (gold/cream theme)
    │   └── admin.css          ← Admin panel
    └── views/                 ← 22 EJS templates
        ├── index.ejs          Homepage
        ├── services.ejs       Services
        ├── fabrics.ejs        Fabric catalogue
        ├── gallery.ejs        Portfolio
        ├── book.ejs           Appointment booking
        ├── track.ejs          Order tracker
        ├── contact.ejs        Contact
        ├── partials/          nav + footer
        └── admin/             Dashboard, Orders, Appointments,
                               Customers, Inventory, Gallery, Settings

## 🚀 Deploy Free on Railway

1. Push to GitHub
2. railway.app → New Project → GitHub repo
3. Add these env vars in Railway dashboard:
       SUPABASE_URL      = https://wetaigadlfehisagjixa.supabase.co
       SUPABASE_ANON_KEY = (from .env)
       SESSION_SECRET    = any-random-string
       PORT              = 3000
4. Live in ~2 minutes ✅

## 🔑 Change Admin Password

Go to Supabase dashboard → Table Editor → admin_users
Generate a bcrypt hash at bcrypt.online (10 rounds)
Paste into password_hash for the admin row.

## 🗄️ Tables

    settings      Shop info (name, address, contact, social)
    orders        Orders with status, measurements, amounts
    appointments  Website booking requests
    customers     Profiles with saved measurements
    inventory     Fabric stock with price & supplier
    gallery       Portfolio items with image URLs
    admin_users   Admin login (bcrypt hashed)
