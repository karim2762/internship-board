const $ = s => document.querySelector(s);

async function api(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } finally { clearTimeout(t); }
}

function setStatus(text, cls) {
  const s = $('#status'); s.replaceChildren(); s.className = cls || '';
  s.textContent = text;
}

function showError(msg) {
  const s = $('#status'); s.replaceChildren(); s.className = 'error';
  s.append(msg + ' ');
  const b = document.createElement('button');
  b.textContent = 'Retry'; b.onclick = load;
  s.append(b);
}

function render(items) {
  const list = $('#list'), sel = $('#internship');
  list.replaceChildren(); sel.replaceChildren();
  if (!items.length) { setStatus('No internships found.'); return; }
  setStatus('');
  for (const it of items) {
    const li = document.createElement('li');
    const b = document.createElement('strong'); b.textContent = it.title;
    li.append(b, ' - ' + it.company + ' (' + it.location + ', ' + it.category + ')');
    list.append(li);
    const o = document.createElement('option'); o.value = it.id; o.textContent = it.title + ' - ' + it.company;
    sel.append(o);
  }
}

async function load() {
  setStatus('Loading internships...');
  $('#list').replaceChildren();
  try {
    const { status, data } = await api('/api/internships?q=' + encodeURIComponent($('#search').value));
    if (status === 429) throw new Error('Too many requests. Wait a moment.');
    if (status !== 200) throw new Error(data.error || 'Server error (' + status + ')');
    render(data);
  } catch (e) {
    showError(e.name === 'AbortError' ? 'Request timed out.' : e.message);
  }
}

function showFieldErrors(errors) {
  document.querySelectorAll('.err').forEach(el => { el.textContent = errors[el.dataset.for] || ''; });
}

$('#form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const body = {
    internshipId: Number(f.get('internshipId')),
    name: f.get('name'), email: f.get('email'), message: f.get('message'),
  };
  const errors = validateApplication(body);
  showFieldErrors(errors);
  if (Object.keys(errors).length) return;
  const btn = $('#submit'); btn.disabled = true;
  const fs = $('#formStatus'); fs.className = ''; fs.textContent = 'Submitting...';
  try {
    const { status, data } = await api('/api/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (status === 201) { fs.className = 'ok'; fs.textContent = 'Application sent!'; ev.target.reset(); }
    else if (status === 400 && data.errors) { showFieldErrors(data.errors); fs.textContent = ''; }
    else if (status === 429) { fs.className = 'error'; fs.textContent = 'Too many attempts. Wait a minute and try again.'; }
    else { fs.className = 'error'; fs.textContent = 'Something went wrong. Please try again.'; }
  } catch (e) {
    fs.className = 'error';
    fs.textContent = e.name === 'AbortError' ? 'Timed out. Please try again.' : 'Network error. Please try again.';
  } finally { btn.disabled = false; }
});

let timer;
$('#search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
load();
