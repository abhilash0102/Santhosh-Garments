// server.js
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

app.use('/',      require('./routes/public'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('404', { settings: { shop_name: 'Santhosh Garments' } });
});

app.listen(PORT, () => {
  console.log(`\n✅  Santhosh Garments  →  http://localhost:${PORT}`);
  console.log(`    Admin panel        →  http://localhost:${PORT}/admin`);
  console.log(`    Supabase           →  ${process.env.SUPABASE_URL}\n`);
});
