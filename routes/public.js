// routes/public.js
const express  = require('express');
const router   = express.Router();
const { supabase } = require('../middleware/supabase');

async function getSettings() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return data || { shop_name:'Santhosh Garments', phone:'', email:'', address:'', working_hours:'', whatsapp:'' };
}

router.get('/', async (req, res) => {
  const [settings, { data: gallery }] = await Promise.all([
    getSettings(),
    supabase.from('gallery').select('*').order('sort_order').limit(6)
  ]);
  res.render('index', { settings, gallery: gallery || [] });
});

router.get('/services', async (req, res) => {
  res.render('services', { settings: await getSettings() });
});

router.get('/gallery', async (req, res) => {
  const [settings, { data: gallery }] = await Promise.all([
    getSettings(),
    supabase.from('gallery').select('*').order('sort_order')
  ]);
  res.render('gallery', { settings, gallery: gallery || [] });
});

router.get('/fabrics', async (req, res) => {
  const [settings, { data: inventory }] = await Promise.all([
    getSettings(),
    supabase.from('inventory').select('*').order('category').order('name')
  ]);
  res.render('fabrics', { settings, inventory: inventory || [] });
});

router.get('/contact', async (req, res) => {
  res.render('contact', { settings: await getSettings(), success: null });
});
router.post('/contact', async (req, res) => {
  res.render('contact', { settings: await getSettings(), success: 'Thank you! We will get back to you soon.' });
});

router.get('/book', async (req, res) => {
  res.render('book', { settings: await getSettings(), success: null, error: null });
});
router.post('/book', async (req, res) => {
  const settings = await getSettings();
  const { customerName, phone, email, date, time, service, notes } = req.body;
  if (!customerName || !phone || !date || !time || !service)
    return res.render('book', { settings, success: null, error: 'Please fill all required fields.' });
  await supabase.from('appointments').insert({
    id: 'APT-' + Date.now(), customer_name: customerName,
    phone, email: email || '', appt_date: date, appt_time: time,
    service, status: 'Pending', notes: notes || ''
  });
  res.render('book', { settings, success: 'Appointment booked! We will confirm shortly.', error: null });
});

router.get('/track', async (req, res) => {
  res.render('track', { settings: await getSettings(), order: null, error: null, searched: false });
});
router.post('/track', async (req, res) => {
  const settings = await getSettings();
  const { orderId, phone } = req.body;
  let query = supabase.from('orders').select('*');
  if (orderId && orderId.trim()) query = query.ilike('id', orderId.trim());
  else if (phone && phone.trim()) query = query.eq('phone', phone.trim()).order('created_at', { ascending: false }).limit(1);
  const { data: orders } = await query;
  const order = orders && orders[0] ? orders[0] : null;
  res.render('track', { settings, order, error: order ? null : 'No order found. Check your Order ID or phone.', searched: true });
});

module.exports = router;
