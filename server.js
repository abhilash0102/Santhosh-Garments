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
app.use(session({
  secret: process.env.SESSION_SECRET || 'santhosh-garments-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ── Google Search Console verification ──────────────────────────
app.get('/google019069efa041f97a.html', (req, res) => {
  res.send('google-site-verification: google019069efa041f97a.html');
});

app.use('/',      require('./routes/public'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('404', { settings: { shop_name: 'Santhosh Garments' } });
});

app.listen(PORT, () => {
  console.log(`\n✅  Santhosh Garments  →  http://localhost:${PORT}`);
  console.log(`    Admin panel        →  http://localhost:${PORT}/admin\n`);
});





// ── Keep-alive ping (prevents Render free tier cold start) ──────
if (process.env.NODE_ENV === 'production') {
  const https = require('https');
  const SITE_URL = process.env.SITE_URL || '';
  setInterval(() => {
    if (!SITE_URL) return;
    https.get(SITE_URL, (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on('error', (e) => {
      console.error(`Keep-alive error: ${e.message}`);
    });
  }, 13 * 60 * 1000); // every 13 minutes
}
```

Then add this environment variable on Render:
```
SITE_URL
```
```
https://santhosh-garments.onrender.com
