const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { makeApp } = require('../server');
const { validateApplication } = require('../public/validate');

let server, base;
before(async () => {
  const app = await makeApp({ postLimit: 100 });
  server = app.listen(0);
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => { server.closeAllConnections?.(); server.close(); });

const post = (body, raw) => fetch(base + '/api/applications', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: raw ?? JSON.stringify(body),
});
const good = { name: 'Ada Lovelace', email: 'ada@example.com', internshipId: 1, message: 'I would love to join this internship.' };

test('GET internships returns a list', async () => {
  const r = await fetch(base + '/api/internships');
  assert.equal(r.status, 200);
  assert.ok((await r.json()).length > 0);
});
test('search filter works', async () => {
  const d = await (await fetch(base + '/api/internships?q=Frontend')).json();
  assert.equal(d.length, 1);
});
test('simulated failure returns 500', async () => {
  assert.equal((await fetch(base + '/api/internships?fail=1')).status, 500);
});
test('valid application -> 201', async () => {
  assert.equal((await post(good)).status, 201);
});
test('invalid application -> 400 with field errors', async () => {
  const r = await post({ name: 'A', email: 'bad', internshipId: 1, message: 'short' });
  assert.equal(r.status, 400);
  const { errors } = await r.json();
  assert.ok(errors.name && errors.email && errors.message);
});
test('missing fields -> 400', async () => {
  assert.equal((await post({})).status, 400);
});
test('unknown fields rejected', async () => {
  assert.equal((await post({ ...good, admin: true })).status, 400);
});
test('unknown internship rejected', async () => {
  assert.equal((await post({ ...good, internshipId: 999 })).status, 400);
});
test('invalid JSON -> 400', async () => {
  assert.equal((await post(null, '{bad')).status, 400);
});
test('oversized body -> 413', async () => {
  assert.equal((await post({ ...good, message: 'x'.repeat(20000) })).status, 413);
});
test('SQL injection stays inert (search)', async () => {
  const d = await (await fetch(base + '/api/internships?q=' + encodeURIComponent("' OR '1'='1"))).json();
  assert.equal(d.length, 0);
});
test('SQL injection stays inert (form)', async () => {
  const r = await post({ ...good, name: "Robert'); DROP TABLE applications;--" });
  assert.equal(r.status, 201);
  assert.equal((await post(good)).status, 201);
});
test('secure headers present', async () => {
  const r = await fetch(base + '/api/internships');
  assert.ok(r.headers.get('content-security-policy'));
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-powered-by'), null);
});
test('rate limit -> 429', async () => {
  const app = await makeApp({ postLimit: 3 });
  const s = app.listen(0);
  const url = 'http://127.0.0.1:' + s.address().port + '/api/applications';
  const codes = [];
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(good) });
    codes.push(r.status);
  }
  s.closeAllConnections?.(); s.close();
  assert.ok(codes.includes(429), 'got ' + codes);
});
test('client validation', () => {
  assert.deepEqual(validateApplication({ ...good }), {});
  assert.ok(validateApplication({ ...good, email: 'x' }).email);
  assert.ok(validateApplication({ ...good, name: '' }).name);
});
