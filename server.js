require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ── Session store — Postgres via Supabase ───────────────────────
const pgSession = require('connect-pg-simple')(session);

const sessionStore = new pgSession({
  conString:             process.env.DATABASE_URL,
  tableName:             'sessions',
  createTableIfMissing:  false
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
  }, 14 * 60 * 1000); // every 14 minutes
}

app.listen(PORT, () => {
  console.log(`\n✅  Santhosh Garments  →  http://localhost:${PORT}`);
  console.log(`    Admin panel        →  http://localhost:${PORT}/admin\n`);
});
