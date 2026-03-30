require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Required for Render — trust the proxy so secure cookies work
app.set('trust proxy', 1);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ── Session store — Postgres via Supabase ───────────────────────
const pgSession = require('connect-pg-simple')(session);

const sessionStore = new pgSession({
  conString:            process.env.DATABASE_URL,
  tableName:            'app_sessions',
  createTableIfMissing: false
});

app.use(session({
  store:             sessionStore,
  secret:            process.env.SESSION_SECRET || 'santhosh-garments-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   7 * 24 * 60 * 60 * 1000,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// ── robots.txt ───────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(
    'User-agent: *\n' +
    'Allow: /\n' +
    'Disallow: /admin\n\n' +
    'Sitemap: https://santhosh-garments.onrender.com/sitemap.xml'
  );
});

// ── Sitemap ──────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const base = 'https://santhosh-garments.onrender.com';
  res.header('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${base}/services</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>${base}/fabrics</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${base}/gallery</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${base}/book</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>${base}/contact</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
</urlset>`);
});

// ── Google Search Console verification ──────────────────────────
app.get('/google019069efa041f97a.html', (req, res) => {
  res.send('google-site-verification: google019069efa041f97a.html');
});

// ── Routes ──────────────────────────────────────────────────────
app.use('/',      require('./routes/public'));
app.use('/admin', require('./routes/admin'));

// ── 404 ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { settings: { shop_name: 'Santhosh Garments' } });
});

// ── Keep-alive ping (prevents Render free tier cold start) ──────
if (process.env.NODE_ENV === 'production') {
  const https    = require('https');
  const SITE_URL = process.env.SITE_URL || '';
  setInterval(() => {
    if (!SITE_URL) return;
    https.get(SITE_URL, (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on('error', (e) => {
      console.error(`Keep-alive error: ${e.message}`);
    });
  }, 14 * 60 * 1000);
}

app.listen(PORT, () => {
  console.log(`\n✅  Santhosh Garments  →  http://localhost:${PORT}`);
  console.log(`    Admin panel        →  http://localhost:${PORT}/admin\n`);
});
