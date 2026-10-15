import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
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
const emailOk = value => typeof value === 'string' && value.length <= 254 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
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
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use(express.static(__dirname));
// Express 5-compatible fallback for browser navigation.
app.use((req, res, next) => {
 if (req.method === 'GET' && req.accepts('html')) return res.sendFile(path.join(__dirname, 'index.html'));
 next();
});
app.listen(port, () => console.log('Velora AI starter running on port ' + port));
