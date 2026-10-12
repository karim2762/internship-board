# Internship Board

A small full-stack app where users can browse internships and submit an application. The focus is **safe integration** between the frontend and the API: clear loading and error states, validation on both client and server, and basic API hardening.

## Features

- Lists internships from the API, with search by title or company
- Visible **loading**, **empty**, and **error** states, with a **Retry** button
- 8-second request timeout, so a hung request never spins forever
- Application form with client-side validation and server-side validation
- Per-field error messages, including errors returned by the server
- Submit button is disabled while a request is pending (prevents double submit)
- Friendly messages for rate limiting (429), timeouts, and network failures
- Security hardening: rate limits, secure headers, parameterized queries, body size limit

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Server     | Node.js, Express                            |
| Validation | Zod (server), shared plain-JS rules (client)|
| Database   | SQLite in memory via sql.js                 |
| Security   | helmet, express-rate-limit                  |
| Frontend   | Plain HTML, CSS, JavaScript (no build step) |
| Tests      | Node's built-in test runner (`node --test`) |

## Project Structure

```
internship-board/
├── server.js              # Express app, routes, validation, security
├── public/
│   ├── index.html         # Page markup
│   ├── style.css          # Styles
│   ├── app.js             # Fetching, rendering, form handling
│   └── validate.js        # Client validation rules (also used by tests)
├── test/
│   └── api.test.js        # API, security, and validation tests
├── README.md
├── TEST_REPORT.md         # Output of `npm test`
├── SECURITY_CHECKLIST.md  # Security measures implemented
└── package.json
```

## Getting Started

### Requirements
- Node.js 18 or newer
- Git

### Install and run (Termux)

```bash
pkg update -y && pkg install -y nodejs git
git clone https://github.com/karim2762/internship-board.git
cd internship-board
npm install
npm start
```

Open http://localhost:3000 in your browser. Stop the server with `Ctrl+C`.

### Run the tests

```bash
npm test
```

## API Reference

Base URL: `http://localhost:3000`

### GET /api/internships

Returns a list of internships.

| Query param | Description                                  |
|-------------|----------------------------------------------|
| `q`         | Optional. Matches title or company (max 50)  |
| `category`  | Optional. Exact category match (max 30)      |
| `fail=1`    | Dev only. Forces a 500 to test the error UI  |

Response `200`:
```json
[
  { "id": 1, "title": "Frontend Intern", "company": "Acme", "category": "Engineering", "location": "Remote" }
]
```

### POST /api/applications

Submits an application.

Request body:
```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "internshipId": 1,
  "message": "I would love to join this internship."
}
```

Responses:

| Status | Meaning                              | Body                                      |
|--------|--------------------------------------|-------------------------------------------|
| 201    | Application saved                    | `{ "id": 1 }`                             |
| 400    | Validation failed or invalid JSON    | `{ "errors": { "email": "Enter a valid email" } }` |
| 413    | Body larger than 10 KB               | `{ "error": "Request too large" }`        |
| 429    | Rate limit exceeded                  | `{ "error": "Too many applications, try again in a minute." }` |
| 500    | Unexpected server error              | `{ "error": "Server error" }`             |

Example:
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","internshipId":1,"message":"I would love to join this internship."}'
```

## Validation Rules

Enforced on the server (source of truth) and mirrored on the client for fast feedback.

| Field          | Rule                              |
|----------------|-----------------------------------|
| `name`         | 2 to 80 characters (trimmed)      |
| `email`        | Valid email, max 120 characters   |
| `internshipId` | Positive integer of an existing internship |
| `message`      | 10 to 1000 characters (trimmed)   |
| Other fields   | Rejected (strict schema)          |

## Security Measures

- **Server-side validation** with a strict Zod schema; unknown fields are rejected
- **Parameterized queries** (`?` placeholders) for every database call, so SQL injection input is treated as plain data
- **Rate limiting**: 100 requests/min on `/api`, 5 requests/min on `POST /api/applications`
- **Secure headers** via helmet (Content-Security-Policy, `X-Content-Type-Options`, no `X-Powered-By`)
- **Body size limit** of 10 KB, with clean handling of oversized and malformed JSON
- **XSS prevention**: the frontend renders API data with `textContent`, never `innerHTML`
- **Generic error messages**: no stack traces or internal details sent to clients
- **No secrets** stored in the repository; same-origin only, so no open CORS

See `SECURITY_CHECKLIST.md` for the checklist.

## Frontend States

| State        | What the user sees                                  |
|--------------|-----------------------------------------------------|
| Loading      | "Loading internships..."                            |
| Empty        | "No internships found."                             |
| Error        | Error message with a **Retry** button               |
| Timeout      | "Request timed out." with Retry                     |
| Form invalid | Error text under each invalid field                 |
| Submitting   | "Submitting..." and a disabled button               |
| Success      | "Application sent!" and the form resets             |
| Rate limited | "Too many attempts. Wait a minute and try again."   |

To see the error state, open `http://localhost:3000/api/internships?fail=1` to confirm the simulated 500, or temporarily stop the server and reload the page.

## Testing

Tests live in `test/api.test.js` and cover:

- Listing and searching internships
- Simulated failure returns 500
- Valid application returns 201
- Invalid, missing, and unknown fields return 400
- Unknown internship id is rejected
- Malformed JSON returns 400, oversized body returns 413
- SQL injection strings in search and in the form stay inert
- Secure headers are present
- Rate limit returns 429 after the limit is exceeded
- Client validation rules

Results are saved in `TEST_REPORT.md`.

## Deployment Notes

- Works on any host that runs a long-lived Node process (for example Render). Use build command `npm install` and start command `npm start`.
- For hosting, change the listen line to `app.listen(process.env.PORT || 3000, ...)`.
- Behind a proxy (Render, etc.), add `app.set('trust proxy', 1);` after creating the app so rate limiting sees real client IPs.
- Not suited to Vercel serverless as-is, because the database and rate limiter live in memory.

## Known Limitations

- Data is stored in memory: applications and seed data reset when the server restarts. Swap sql.js for a persistent database (SQLite file, PostgreSQL) for real use.
- Rate limit counters are also in memory and per-process.
- No authentication or admin view for reading submitted applications.
- Duplicate applications from the same email are not blocked.

## License

MIT
