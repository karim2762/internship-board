
> internship-board@1.0.0 test
> node --test

✔ GET internships returns a list (313.475077ms)
✔ search filter works (19.806154ms)
✔ simulated failure returns 500 (12.170154ms)
✔ valid application -> 201 (45.499077ms)
✔ invalid application -> 400 with field errors (12.462385ms)
✔ missing fields -> 400 (7.955384ms)
✔ unknown fields rejected (9.503153ms)
✔ unknown internship rejected (7.397231ms)
✔ invalid JSON -> 400 (11.292ms)
✔ oversized body -> 413 (12.343616ms)
✔ SQL injection stays inert (search) (7.281616ms)
✔ SQL injection stays inert (form) (15.522462ms)
✔ secure headers present (8.180616ms)
✔ rate limit -> 429 (45.643154ms)
✔ client validation (3.568923ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1353.411692
