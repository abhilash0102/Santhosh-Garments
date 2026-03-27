// routes/admin.js
const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const { supabase, uploadImage, deleteImage } = require('../middleware/supabase');
const upload     = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

// ── LOGIN ──────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: adminUser } = await supabase
    .from('admin_users').select('*').eq('username', username).single();
  if (!adminUser) return res.render('admin/login', { error: 'Invalid username or password.' });
  // Normalise $2a$ (Postgres) → $2b$ (bcryptjs)
  const hash = adminUser.password_hash.replace(/^\$2a\$/, '$2b$');
  if (bcrypt.compareSync(password, hash)) {
    req.session.admin     = true;
    req.session.adminUser = username;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Invalid username or password.' });
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/admin/login'); });

// ── DASHBOARD ─────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const [
    { count: totalOrders }, { data: ordersByStatus }, { data: revenueData },
    { count: totalCustomers }, { data: todayApts }, { data: pendingApts },
    { data: lowStockItems }, { data: recentOrders }, { data: recentApts }
  ] = await Promise.all([
    supabase.from('orders').select('*', { count:'exact', head:true }),
    supabase.from('orders').select('status,amount'),
    supabase.from('orders').select('amount').neq('status','Cancelled'),
    supabase.from('customers').select('*', { count:'exact', head:true }),
    supabase.from('appointments').select('*').eq('appt_date', today),
    supabase.from('appointments').select('*').eq('status','Pending'),
    supabase.from('inventory').select('*').lt('stock', 10),
    supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(5),
    supabase.from('appointments').select('*').order('created_at',{ascending:false}).limit(5)
  ]);
  const byStatus = s => (ordersByStatus||[]).filter(o=>o.status===s).length;
  const totalRevenue = (revenueData||[]).reduce((s,o)=>s+parseFloat(o.amount||0),0);
  res.render('admin/dashboard', {
    stats: {
      totalOrders: totalOrders||0, pendingOrders: byStatus('Pending'),
      inProgressOrders: byStatus('In Progress'), readyOrders: byStatus('Ready'),
      totalCustomers: totalCustomers||0, todayAppointments: (todayApts||[]).length,
      pendingAppointments: (pendingApts||[]).length, totalRevenue,
      lowStock: (lowStockItems||[]).length
    },
    recentOrders: recentOrders||[], appointments: recentApts||[]
  });
});

// ── ORDERS ────────────────────────────────────────────────────
router.get('/orders', requireAuth, async (req, res) => {
  const { status, search } = req.query;
  let q = supabase.from('orders').select('*').order('created_at',{ascending:false});
  if (status) q = q.eq('status', status);
  if (search) q = q.or(`id.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data: orders } = await q;
  res.render('admin/orders', { orders: orders||[], filter: status||'', search: search||'' });
});

router.get('/orders/new', requireAuth, async (req, res) => {
  const { data: inventory } = await supabase.from('inventory').select('name,category').order('name');
  res.render('admin/order-form', { order: null, inventory: inventory||[], error: null });
});

router.post('/orders/new', requireAuth, async (req, res) => {
  const { customerName, phone, email, service, item, fabric, status, amount,
          date, deliveryDate, notes, chest, waist, shoulder, length, inseam, bust, hip, blouseLength } = req.body;
  const id = 'ORD-' + Date.now();
  await supabase.from('orders').insert({
    id, customer_name: customerName, phone, email: email||'', service, item,
    fabric: fabric||'', status: status||'Pending', amount: parseFloat(amount)||0,
    order_date: date||new Date().toISOString().split('T')[0],
    delivery_date: deliveryDate||null, notes: notes||'',
    meas_chest: chest||null, meas_waist: waist||null, meas_shoulder: shoulder||null,
    meas_length: length||null, meas_inseam: inseam||null, meas_bust: bust||null,
    meas_hip: hip||null, meas_blouse_length: blouseLength||null
  });
  const { data: existing } = await supabase.from('customers').select('id,total_orders,total_spent').eq('phone',phone).single();
  if (existing) {
    await supabase.from('customers').update({
      total_orders: existing.total_orders+1,
      total_spent: parseFloat(existing.total_spent)+parseFloat(amount||0),
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);
  } else {
    await supabase.from('customers').insert({
      name: customerName, phone, email: email||'', total_orders:1,
      total_spent: parseFloat(amount)||0,
      meas_chest:chest||null, meas_waist:waist||null, meas_shoulder:shoulder||null,
      meas_length:length||null, meas_inseam:inseam||null, meas_bust:bust||null,
      meas_hip:hip||null, meas_blouse_length:blouseLength||null
    });
  }
  res.redirect('/admin/orders');
});

router.get('/orders/edit/:id', requireAuth, async (req, res) => {
  const { data: order } = await supabase.from('orders').select('*').eq('id',req.params.id).single();
  const { data: inventory } = await supabase.from('inventory').select('name,category').order('name');
  if (!order) return res.redirect('/admin/orders');
  res.render('admin/order-form', { order, inventory: inventory||[], error: null });
});

router.post('/orders/edit/:id', requireAuth, async (req, res) => {
  const { customerName, phone, email, service, item, fabric, status, amount,
          date, deliveryDate, notes, chest, waist, shoulder, length, inseam, bust, hip, blouseLength } = req.body;
  await supabase.from('orders').update({
    customer_name:customerName, phone, email:email||'', service, item, fabric:fabric||'',
    status, amount:parseFloat(amount)||0, order_date:date, delivery_date:deliveryDate||null,
    notes:notes||'', meas_chest:chest||null, meas_waist:waist||null, meas_shoulder:shoulder||null,
    meas_length:length||null, meas_inseam:inseam||null, meas_bust:bust||null,
    meas_hip:hip||null, meas_blouse_length:blouseLength||null, updated_at:new Date().toISOString()
  }).eq('id', req.params.id);
  res.redirect('/admin/orders');
});

router.post('/orders/delete/:id', requireAuth, async (req, res) => {
  await supabase.from('orders').delete().eq('id', req.params.id);
  res.redirect('/admin/orders');
});

router.post('/orders/status/:id', requireAuth, async (req, res) => {
  await supabase.from('orders').update({ status:req.body.status, updated_at:new Date().toISOString() }).eq('id',req.params.id);
  res.redirect('/admin/orders');
});

// ── APPOINTMENTS ──────────────────────────────────────────────
router.get('/appointments', requireAuth, async (req, res) => {
  const { status } = req.query;
  let q = supabase.from('appointments').select('*').order('appt_date',{ascending:false});
  if (status) q = q.eq('status', status);
  const { data: appointments } = await q;
  res.render('admin/appointments', { appointments: appointments||[], filter: status||'' });
});

router.post('/appointments/status/:id', requireAuth, async (req, res) => {
  await supabase.from('appointments').update({ status:req.body.status, updated_at:new Date().toISOString() }).eq('id',req.params.id);
  res.redirect('/admin/appointments');
});

router.post('/appointments/delete/:id', requireAuth, async (req, res) => {
  await supabase.from('appointments').delete().eq('id',req.params.id);
  res.redirect('/admin/appointments');
});

// ── INVENTORY ─────────────────────────────────────────────────
router.get('/inventory', requireAuth, async (req, res) => {
  const { data: inventory } = await supabase.from('inventory').select('*').order('category').order('name');
  res.render('admin/inventory', { inventory: inventory||[] });
});

router.post('/inventory/add', requireAuth, upload.single('image'), async (req, res) => {
  const { name, category, color, pricePerMeter, stock, unit, supplier } = req.body;
  let image_url = '';
  if (req.file) {
    try { image_url = await uploadImage(req.file.buffer, req.file.mimetype, 'inventory', name); }
    catch(e) { console.error('Image upload error:', e.message); }
  }
  await supabase.from('inventory').insert({
    id: 'FAB-'+Date.now(), name, category, color: color||'',
    price_per_meter: parseFloat(pricePerMeter)||0, stock: parseFloat(stock)||0,
    unit: unit||'meters', supplier: supplier||'', image_url
  });
  res.redirect('/admin/inventory');
});

router.post('/inventory/edit/:id', requireAuth, upload.single('image'), async (req, res) => {
  const { name, category, color, pricePerMeter, stock, unit, supplier } = req.body;
  const { data: existing } = await supabase.from('inventory').select('image_url').eq('id',req.params.id).single();
  let image_url = existing ? existing.image_url : '';
  if (req.file) {
    try {
      if (existing && existing.image_url) await deleteImage(existing.image_url, 'inventory');
      image_url = await uploadImage(req.file.buffer, req.file.mimetype, 'inventory', name);
    } catch(e) { console.error('Image upload error:', e.message); }
  }
  await supabase.from('inventory').update({
    name, category, color:color||'', price_per_meter:parseFloat(pricePerMeter)||0,
    stock:parseFloat(stock)||0, unit:unit||'meters', supplier:supplier||'',
    image_url, updated_at:new Date().toISOString()
  }).eq('id', req.params.id);
  res.redirect('/admin/inventory');
});

router.post('/inventory/delete/:id', requireAuth, async (req, res) => {
  const { data: item } = await supabase.from('inventory').select('image_url').eq('id',req.params.id).single();
  if (item && item.image_url) await deleteImage(item.image_url, 'inventory');
  await supabase.from('inventory').delete().eq('id', req.params.id);
  res.redirect('/admin/inventory');
});

// ── CUSTOMERS ─────────────────────────────────────────────────
router.get('/customers', requireAuth, async (req, res) => {
  const { search } = req.query;
  let q = supabase.from('customers').select('*').order('created_at',{ascending:false});
  if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data: customers } = await q;
  res.render('admin/customers', { customers: customers||[], search: search||'' });
});

router.get('/customers/:id', requireAuth, async (req, res) => {
  const { data: customer } = await supabase.from('customers').select('*').eq('id',req.params.id).single();
  if (!customer) return res.redirect('/admin/customers');
  const { data: orders } = await supabase.from('orders').select('*').eq('phone',customer.phone).order('created_at',{ascending:false});
  res.render('admin/customer-detail', { customer, orders: orders||[] });
});

router.post('/customers/edit/:id', requireAuth, async (req, res) => {
  const { name, phone, email, address, chest, waist, shoulder, length, inseam, bust, hip, blouseLength } = req.body;
  await supabase.from('customers').update({
    name, phone, email:email||'', address:address||'',
    meas_chest:chest||null, meas_waist:waist||null, meas_shoulder:shoulder||null,
    meas_length:length||null, meas_inseam:inseam||null, meas_bust:bust||null,
    meas_hip:hip||null, meas_blouse_length:blouseLength||null, updated_at:new Date().toISOString()
  }).eq('id', req.params.id);
  res.redirect('/admin/customers/'+req.params.id);
});

// ── GALLERY ───────────────────────────────────────────────────
router.get('/gallery', requireAuth, async (req, res) => {
  const { data: gallery } = await supabase.from('gallery').select('*').order('sort_order');
  res.render('admin/gallery', { gallery: gallery||[] });
});

router.post('/gallery/add', requireAuth, upload.single('image'), async (req, res) => {
  const { title, category, description } = req.body;
  let image_url = '';
  if (req.file) {
    try { image_url = await uploadImage(req.file.buffer, req.file.mimetype, 'gallery', title); }
    catch(e) { console.error('Image upload error:', e.message); }
  }
  await supabase.from('gallery').insert({
    id: 'GAL-'+Date.now(), title, category:category||'',
    description:description||'', image_url, sort_order: Date.now()
  });
  res.redirect('/admin/gallery');
});

router.post('/gallery/delete/:id', requireAuth, async (req, res) => {
  const { data: item } = await supabase.from('gallery').select('image_url').eq('id',req.params.id).single();
  if (item && item.image_url) await deleteImage(item.image_url, 'gallery');
  await supabase.from('gallery').delete().eq('id',req.params.id);
  res.redirect('/admin/gallery');
});

// ── SETTINGS ──────────────────────────────────────────────────
router.get('/settings', requireAuth, async (req, res) => {
  const { data: settings } = await supabase.from('settings').select('*').eq('id',1).single();
  res.render('admin/settings', { settings: settings||{}, success: null });
});

router.post('/settings', requireAuth, async (req, res) => {
  const { shopName, tagline, address, phone, email, whatsapp, workingHours, instagram, facebook } = req.body;
  await supabase.from('settings').update({
    shop_name:shopName, tagline, address, phone, email, whatsapp,
    working_hours:workingHours, instagram:instagram||'', facebook:facebook||'',
    updated_at:new Date().toISOString()
  }).eq('id',1);
  const { data: settings } = await supabase.from('settings').select('*').eq('id',1).single();
  res.render('admin/settings', { settings, success:'Settings saved successfully!' });
});

module.exports = router;
