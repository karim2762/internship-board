# Internship Board
Node + Express API, plain HTML frontend, in-memory SQLite (sql.js).
Run: `npm install && npm start` then open http://localhost:3000
Test: `npm test`
API: GET /api/internships?q=&category= | POST /api/applications {name,email,internshipId,message}
Frontend states: loading, empty, error + Retry, validation errors, success, rate-limit message.
