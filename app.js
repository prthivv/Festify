const path = require("path");
const express = require("express");
const session = require("express-session");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const eventsRoutes = require("./routes/events");
const registrationsRoutes = require("./routes/registrations");
const teamsRoutes = require("./routes/teams");
const volunteersRoutes = require("./routes/volunteers");
const sponsorsRoutes = require("./routes/sponsors");
const budgetRoutes = require("./routes/budget");
const scheduleRoutes = require("./routes/schedule");
const resultsRoutes = require("./routes/results");

const app = express();
const port = Number.parseInt(process.env.PORT || "5000", 10);
const sessionSecret =
  process.env.SECRET_KEY ||
  "replace-this-with-a-long-random-secret-before-deploying";
const frontendDir = path.join(__dirname, "frontend");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(frontendDir));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "cefms",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/events", registrationsRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/volunteers", volunteersRoutes);
app.use("/api/sponsors", sponsorsRoutes);
app.use("/api", budgetRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/results", resultsRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);

  if (res.headersSent) {
    return;
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error."
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`CEFMS server listening on http://localhost:${port}`);
  });
}

module.exports = app;
