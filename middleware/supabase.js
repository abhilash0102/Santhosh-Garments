// middleware/supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────
// uploadImage(buffer, mimetype, bucket, filename)
// Uploads a file buffer to Supabase Storage and returns the
// public URL.  bucket = 'gallery' | 'inventory'
// ─────────────────────────────────────────────────────────────
async function uploadImage(buffer, mimetype, bucket, filename) {
  const ext  = mimetype.split('/')[1].replace('jpeg','jpg');
  const path = `${Date.now()}-${filename.replace(/\s+/g,'-')}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimetype, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// deleteImage(url, bucket)
// Removes an image from Supabase Storage given its public URL.
// ─────────────────────────────────────────────────────────────
async function deleteImage(publicUrl, bucket) {
  if (!publicUrl) return;
  try {
    const base = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
    const path = publicUrl.replace(base, '');
    if (path) await supabase.storage.from(bucket).remove([path]);
  } catch (_) { /* ignore delete errors */ }
}

module.exports = { supabase, uploadImage, deleteImage };
