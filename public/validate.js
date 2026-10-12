(function (root) {
  function validateApplication(d) {
    const e = {};
    const name = String(d.name || '').trim();
    const email = String(d.email || '').trim();
    const msg = String(d.message || '').trim();
    if (name.length < 2 || name.length > 80) e.name = 'Name must be 2-80 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!Number.isInteger(d.internshipId) || d.internshipId < 1) e.internshipId = 'Choose an internship';
    if (msg.length < 10 || msg.length > 1000) e.message = 'Message must be 10-1000 characters';
    return e;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { validateApplication };
  else root.validateApplication = validateApplication;
})(typeof window !== 'undefined' ? window : globalThis);
