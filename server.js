const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const initSqlJs = require('sql.js');
const path = require('path');

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be 2-80 characters').max(80, 'Name must be 2-80 characters'),
  email: z.string().trim().email('Enter a valid email').max(120, 'Email too long'),
  internshipId: z.number().int().positive(),
  message: z.string().trim().min(10, 'Message must be 10-1000 characters').max(1000, 'Message must be 10-1000 characters'),
}).strict();

function toErrors(issues) {
  const errors = {};
  for (const i of issues) {
    const field = i.path && i.path.length ? String(i.path[0]) : '_form';
    if (errors[field]) continue;
    if (i.code === 'unrecognized_keys') errors._form = 'Unknown fields are not allowed';
    else if (i.code === 'invalid_type') errors[field] = 'This field is required';
    else errors[field] = i.message;
  }
  return errors;
}

async function makeApp({ postLimit = 5, apiLimit = 100 } = {}) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('CREATE TABLE internships(id INTEGER PRIMARY KEY, title TEXT, company TEXT, category TEXT, location TEXT)');
  db.run('CREATE TABLE applications(id INTEGER PRIMARY KEY AUTOINCREMENT, internship_id INTEGER, name TEXT, email TEXT, message TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
  const seed = [
    [1, 'Frontend Intern', 'Acme', 'Engineering', 'Remote'],
    [2, 'Data Analyst Intern', 'Globex', 'Data', 'Lagos'],
    [3, 'Marketing Intern', 'Initech', 'Marketing', 'Remote'],
    [4, 'Backend Intern', 'Umbrella', 'Engineering', 'Nairobi'],
  ];
  for (const r of seed) db.run('INSERT INTO internships VALUES (?,?,?,?,?)', r);

  const all = (sql, p = []) => {
    const s = db.prepare(sql); s.bind(p);
    const rows = []; while (s.step()) rows.push(s.getAsObject());
    s.free(); return rows;
  };

  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', rateLimit({
    windowMs: 60000, limit: apiLimit, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many requests, try again soon.' },
  }));
  const postLimiter = rateLimit({
    windowMs: 60000, limit: postLimit, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many applications, try again in a minute.' },
  });

  app.get('/api/internships', (req, res) => {
    if (process.env.NODE_ENV !== 'production' && req.query.fail === '1')
      return res.status(500).json({ error: 'Simulated failure' });
    const q = String(req.query.q || '').slice(0, 50);
    const cat = String(req.query.category || '').slice(0, 30);
    const rows = all(
      "SELECT id, title, company, category, location FROM internships WHERE (title LIKE ? OR company LIKE ?) AND (? = '' OR category = ?)",
      ['%' + q + '%', '%' + q + '%', cat, cat]
    );
    res.json(rows);
  });

  app.post('/api/applications', postLimiter, (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: toErrors(parsed.error.issues) });
    const d = parsed.data;
    if (!all('SELECT id FROM internships WHERE id = ?', [d.internshipId]).length)
      return res.status(400).json({ errors: { internshipId: 'Unknown internship' } });
    db.run('INSERT INTO applications (internship_id, name, email, message) VALUES (?,?,?,?)',
      [d.internshipId, d.name, d.email, d.message]);
    const id = all('SELECT last_insert_rowid() AS id')[0].id;
    res.status(201).json({ id });
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  });
  return app;
}

if (require.main === module) {
  makeApp().then(app => app.listen(3000, () => console.log('http://localhost:3000')));
}
module.exports = { makeApp };
