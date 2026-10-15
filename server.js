import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
if (isProduction && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production');
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'data.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
 CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
`);
const SQLiteStore = SQLiteStoreFactory(session);
app.use(session({
 store: new SQLiteStore({ db: 'sessions.sqlite', dir: __dirname }),
 name: 'velora.sid',
 secret: process.env.SESSION_SECRET || 'dev-only-change-this-secret-before-deploying',
 resave: false,
 saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const generationLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false, message: { error: 'Generation limit reached. Try again in a few minutes.' } });
const activePredictions = new Map();
const requireLogin = (req, res, next) => req.session.userId ? next() : res.status(401).json({ error: 'Log in to generate a video.' });
const replicateRequest = async (url, options = {}) => {
 const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, ...(options.headers || {}) } });
 const data = await response.json().catch(() => ({}));
 if (!response.ok) { const err = new Error(data.detail || data.error || `AI provider returned ${response.status}`); err.status = response.status; throw err; }
 return data;
};
const emailOk = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const publicUser = user => ({ id: user.id, email: user.email, createdAt: user.created_at });

app.post('/api/auth/register', authLimiter, async (req, res) => {
 try {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;
  if (!emailOk(email) || typeof password !== 'string' || password.length < 10 || password.length > 128) {
   return res.status(400).json({ error: 'Enter a valid email and a password between 10 and 128 characters.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const hash = await bcrypt.hash(password, 12);
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = Number(result.lastInsertRowid);
  res.status(201).json({ user: { id: Number(result.lastInsertRowid), email } });
 } catch (e) { console.error('Registration error:', e.message); res.status(500).json({ error: 'Could not create account.' }); }
});
app.post('/api/auth/login', authLimiter, async (req, res) => {
 try {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;
  if (!emailOk(email) || typeof password !== 'string') return res.status(400).json({ error: 'Enter a valid email and password.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
 } catch (e) { console.error('Login error:', e.message); res.status(500).json({ error: 'Could not log in.' }); }
});
app.get('/api/auth/me', (req, res) => {
 if (!req.session.userId) return res.json({ user: null });
 const user = db.prepare('SELECT id,email,created_at FROM users WHERE id = ?').get(req.session.userId);
 if (!user) return res.json({ user: null });
 res.json({ user: publicUser(user) });
});
app.post('/api/auth/logout', (req, res) => {
 req.session.destroy(err => {
  if (err) return res.status(500).json({ error: 'Could not log out.' });
  res.clearCookie('velora.sid', { httpOnly: true, sameSite: 'lax', secure: isProduction });
  res.json({ ok: true });
 });
});
app.get('/api/health', (_req, res) => res.json({ ok: true, videoProviderConfigured: Boolean(process.env.REPLICATE_API_TOKEN) }));

// Image-to-video generation is server-side so the provider token never reaches the browser.
app.post('/api/video/generate', requireLogin, generationLimiter, (req, res, next) => {
 upload.single('image')(req, res, async uploadError => {
  if (uploadError) return res.status(uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: uploadError.code === 'LIMIT_FILE_SIZE' ? 'Image must be 10 MB or smaller.' : 'Choose a valid JPG, PNG, or WebP image.' });
  try {
   if (!process.env.REPLICATE_API_TOKEN) return res.status(503).json({ error: 'Video provider is not configured yet. Add REPLICATE_API_TOKEN to your Codespaces environment secrets, then restart the server.' });
   if (!req.file) return res.status(400).json({ error: 'Choose a starting image first.' });
   const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
   if (!prompt || prompt.length > 2000) return res.status(400).json({ error: 'Enter a prompt of 1–2000 characters.' });
   if (/(underage|minor|child|teenager|schoolgirl|schoolboy)/i.test(prompt)) return res.status(400).json({ error: 'Prompts sexualizing or involving minors are not allowed.' });
   const form = new FormData();
   form.append('content', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'starting-image');
   const uploaded = await replicateRequest('https://api.replicate.com/v1/files', { method: 'POST', body: form });
   if (!uploaded.urls?.get) throw new Error('The provider did not return an uploaded-image URL.');
   const durationText = String(req.body.duration || '5');
   const duration = [5, 8, 10].includes(Number(durationText)) ? Number(durationText) : 5;
   const ratioMap = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
   const aspect_ratio = ratioMap[req.body.ratio] || '16:9';
   const prediction = await replicateRequest('https://api.replicate.com/v1/models/prunaai/p-video-2/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'wait=5' },
    body: JSON.stringify({ input: { image: uploaded.urls.get, prompt, duration, aspect_ratio, resolution: '720p' } })
   });
   if (!prediction.id) throw new Error('The provider did not return a generation job ID.');
   activePredictions.set(prediction.id, req.session.userId);
   res.status(202).json({ id: prediction.id, status: prediction.status || 'starting' });
  } catch (e) {
   console.error('Video generation start error:', e.message);
   res.status(e.status === 401 || e.status === 403 ? 502 : 502).json({ error: e.status === 401 || e.status === 403 ? 'The provider rejected the API key. Check REPLICATE_API_TOKEN.' : 'Could not start video generation. Check the provider key, account credits, and model availability.' });
  }
 });
});
app.get('/api/video/:id', requireLogin, async (req, res) => {
 const id = String(req.params.id || '');
 if (!/^[a-z0-9]+$/i.test(id) || activePredictions.get(id) !== req.session.userId) return res.status(404).json({ error: 'Generation job not found for this account.' });
 try {
  const prediction = await replicateRequest('https://api.replicate.com/v1/predictions/' + encodeURIComponent(id));
  if (['succeeded', 'failed', 'canceled'].includes(prediction.status)) activePredictions.delete(id);
  let videoUrl = null;
  if (prediction.status === 'succeeded') {
   const output = prediction.output;
   videoUrl = typeof output === 'string' ? output : Array.isArray(output) ? output.find(x => typeof x === 'string') || output[0]?.url || null : output?.url || null;
  }
  res.json({ id, status: prediction.status, videoUrl, error: prediction.status === 'failed' ? 'The provider could not generate this video. Try a different prompt or image.' : null });
 } catch (e) {
  console.error('Video generation status error:', e.message);
  res.status(502).json({ error: 'Could not check generation status. Try again shortly.' });
 }
});
app.use(express.static(__dirname));
// Express 5-compatible fallback for browser navigation.
app.use((req, res, next) => {
 if (req.method === 'GET' && req.accepts('html')) return res.sendFile(path.join(__dirname, 'index.html'));
 next();
});
app.listen(port, () => console.log('Velora AI starter running on port ' + port));
