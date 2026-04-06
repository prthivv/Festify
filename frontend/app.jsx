const { useEffect, useState } = React;

const TOKEN_STORAGE_KEY = "festify_token";

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function setStoredToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return;
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}

function formatDate(value) {
  if (!value) {
    return "TBD";
  }

  return new Date(value).toLocaleString();
}

function formatCompactDate(value) {
  if (!value) {
    return "TBD";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getEventStatus(eventItem) {
  if (eventItem.winner_details) {
    return "Result published";
  }

  if (!eventItem.start_time) {
    return "Awaiting schedule";
  }

  const now = new Date();
  const start = new Date(eventItem.start_time);
  const end = new Date(eventItem.end_time);

  if (end < now) {
    return "Completed";
  }

  if (start > now) {
    return "Upcoming";
  }

  return "Live";
}

async function apiFetch(url, options = {}) {
  const token = getStoredToken();
  const baseHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers: {
      ...baseHeaders,
      ...(options.headers || {}),
    },
    credentials: "same-origin",
    ...options,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

function SummaryCard({ label, value, tone = "default" }) {
  return (
    <div className={`summary-card summary-card-${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

function SectionHeader({ title, note, actions = null }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-title mb-1">{title}</h2>
        {note ? <p className="muted-note mb-0">{note}</p> : null}
      </div>
      {actions}
    </div>
  );
}

function DataTable({ headers, rows, emptyMessage }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="text-center muted-note py-4"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [results, setResults] = useState([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  async function loadDashboard() {
    const token = getStoredToken();
    const [sessionPayload, eventsPayload, schedulePayload, resultsPayload] =
      await Promise.all([
        token ? apiFetch("/api/me") : Promise.resolve({ user: null }),
        apiFetch("/api/events"),
        apiFetch("/api/schedule"),
        apiFetch("/api/results"),
      ]);

    setUser(sessionPayload.user);
    setEvents(eventsPayload);
    setSchedule(schedulePayload);
    setResults(resultsPayload);
  }

  useEffect(() => {
    loadDashboard().catch((error) => {
      setMessage(error.message);
      setMessageType("danger");
    });
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    try {
      const payload = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setStoredToken(payload.token);
      setUser(payload.user);
      setMessage("Login successful.");
      setMessageType("success");
      setForm({
        email: "",
        password: "",
      });
    } catch (error) {
      setMessage(error.message);
      setMessageType("danger");
    }
  }

  async function handleLogout() {
    try {
      const token = getStoredToken();

      if (token) {
        await apiFetch("/api/logout", {
          method: "POST",
        });
      }

      setStoredToken(null);
      setUser(null);
      setMessage("You have been logged out.");
      setMessageType("success");
    } catch (error) {
      setStoredToken(null);
      setMessage(error.message);
      setMessageType("danger");
    }
  }

  return (
    <section className="panel-card">
      <SectionHeader
        title={eventItem.name}
        note="Read-only event detail panel"
        actions={
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>
            Clear
          </button>
        }
      />
      <div className="detail-grid">
        <div className="detail-card">
          <div className="metric-label">Status</div>
          <div className="detail-value">{getEventStatus(eventItem)}</div>
        </div>
        <div className="detail-card">
          <div className="metric-label">Coordinator</div>
          <div className="detail-value">{eventItem.creator_name}</div>
        </div>
        <div className="detail-card">
          <div className="metric-label">Format</div>
          <div className="detail-value">{eventItem.type}</div>
        </div>
        <div className="detail-card">
          <div className="metric-label">Venue</div>
          <div className="detail-value">{eventItem.venue || "TBD"}</div>
        </div>
      </div>
      <p className="detail-copy mt-3 mb-3">
        {eventItem.description || "No event description has been added yet."}
      </p>
      <div className="mini-meta">
        <span>Capacity: {eventItem.max_participants}</span>
        <span>
          Registered:
          {" "}
          {eventItem.type === "individual"
            ? eventItem.individual_registrations
            : eventItem.team_count}
        </span>
        <span>Start: {formatDate(eventItem.start_time)}</span>
      </div>
      {eventItem.winner_details ? (
        <div className="result-banner mt-3">
          <strong>Published Result:</strong>
          {" "}
          {eventItem.winner_details}
        </div>
      ) : null}
    </section>
  );
}

function OverviewView({ events, schedule, results, onSelectEvent }) {
  return (
    <div className="content-grid">
      <div className="content-main">
        <section className="hero-card fade-up">
          <span className="eyebrow">React Frontend Shell</span>
          <div className="row align-items-end g-4 mt-1">
            <div className="col-lg-8">
              <h1 className="display-title">
                Plan, run, and track college fests in one place.
              </h1>
              <p className="hero-copy">
                This frontend is now a React app served by Express as static
                files, while the backend stays focused on API routes, sessions,
                and PostgreSQL access.
              </p>
            </div>
            <div className="col-lg-5">
              <div className="hero-metric-grid">
                <SummaryCard label="Events" value={events.length} />
                <SummaryCard
                  label="Scheduled"
                  value={events.filter((eventItem) => eventItem.start_time).length}
                  tone="accent"
                />
                <SummaryCard label="Results" value={results.length} tone="warm" />
              </div>
            </div>
          </div>
        </section>

        <div className="row g-4">
          <div className="col-lg-4 fade-up">
            <section className="panel-card h-100">
              <h2 className="section-title">Demo Login</h2>
              <form className="d-grid gap-3" onSubmit={handleLogin}>
                <div>
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="form-control"
                    id="email"
                    type="email"
                    value={form.email}
                    placeholder="admin@cefms.edu"
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="form-control"
                    id="password"
                    type="password"
                    value={form.password}
                    placeholder="correct horse battery staple"
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <button className="btn btn-brand" type="submit">
                  Sign In
                </button>
                <p className="muted-note mb-0">
                  All seeded accounts share the demo password:{" "}
                  <code>correct horse battery staple</code>
                </p>
                {message ? (
                  <div className={`small mt-2 text-${messageType || "muted"}`}>
                    {message}
                  </div>
                ) : null}
              </form>
            </section>
          </div>

          <div className="col-lg-8 fade-up">
            <section className="panel-card h-100">
              {user ? (
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <h2 className="section-title mb-2">Active Session</h2>
                    <div className="status-pill mb-3">Session live</div>
                    <p className="mb-1">
                      <strong>{user.name}</strong>
                    </p>
                    <p className="mb-1 muted-note">{user.role}</p>
                    <p className="mb-0 muted-note">{user.email}</p>
                  </div>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="section-title">No Active Session</h2>
                  <p className="muted-note mb-0">
                    Sign in with one of the seeded users to test protected API
                    routes.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="row g-4 mt-1">
          <div className="col-12 fade-up">
            <section className="table-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="section-title mb-0">Events</h2>
                <span className="muted-note">Live API data</span>
              </div>
              <DataTable
                headers={["Event", "Coordinator", "Capacity", "Venue"]}
                emptyMessage="No events available yet."
                rows={events.map((eventItem) => (
                  <tr key={eventItem.event_id}>
                    <td>
                      <strong>{eventItem.name}</strong>
                      <br />
                      <span className="muted-note">{eventItem.type}</span>
                    </td>
                    <td>{eventItem.creator_name}</td>
                    <td>{eventItem.max_participants}</td>
                    <td>{eventItem.venue || "TBD"}</td>
                  </tr>
                ))}
              />
            </section>
          </div>

          <div className="col-lg-7 fade-up">
            <section className="table-card h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="section-title mb-0">Schedule Board</h2>
                <span className="muted-note">Venue + timing</span>
              </div>
              <DataTable
                headers={["Event", "Venue", "Starts", "Status"]}
                emptyMessage="Schedule has not been published yet."
                rows={schedule.map((scheduleItem) => (
                  <tr key={scheduleItem.schedule_id}>
                    <td>
                      <strong>{scheduleItem.event_name}</strong>
                    </td>
                    <td>{scheduleItem.venue}</td>
                    <td>{formatDate(scheduleItem.start_time)}</td>
                    <td>
                      <span className="status-pill">{scheduleItem.status}</span>
                    </td>
                  </tr>
                ))}
              />
            </section>
          </div>

          <div className="col-lg-5 fade-up">
            <section className="table-card h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="section-title mb-0">Published Results</h2>
                <span className="muted-note">Completed events</span>
              </div>
              <DataTable
                headers={["Event", "Winner", "Published"]}
                emptyMessage="Results will appear here after publication."
                rows={results.map((resultItem) => (
                  <tr key={resultItem.result_id}>
                    <td>
                      <strong>{resultItem.event_name}</strong>
                    </td>
                    <td>{resultItem.winner_details}</td>
                    <td>{formatDate(resultItem.published_at)}</td>
                  </tr>
                ))}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [results, setResults] = useState([]);
  const [activeView, setActiveView] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const [sessionPayload, eventsPayload, schedulePayload, resultsPayload] =
        await Promise.all([
          apiFetch("/api/me"),
          apiFetch("/api/events"),
          apiFetch("/api/schedule"),
          apiFetch("/api/results")
        ]);

      setUser(sessionPayload.user);
      setEvents(eventsPayload);
      setSchedule(schedulePayload);
      setResults(resultsPayload);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard().catch((error) => {
      setMessage(error.message);
      setMessageType("danger");
    });
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    try {
      const payload = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify(form)
      });

      setUser(payload.user);
      setMessage("Login successful.");
      setMessageType("success");
      setForm({
        email: "",
        password: ""
      });
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
      setMessageType("danger");
    }
  }

  async function handleLogout() {
    try {
      await apiFetch("/api/logout", {
        method: "POST"
      });

      setUser(null);
      setSelectedEvent(null);
      setActiveView("overview");
      setMessage("");
      setMessageType("");
    } catch (error) {
      setMessage(error.message);
      setMessageType("danger");
    }
  }

  function handleSelectEvent(eventItem) {
    setSelectedEvent(eventItem);
    setActiveView("events");
  }

  function handleClearSelection() {
    setSelectedEvent(null);
  }

  if (!user) {
    return (
      <LoginPage
        form={form}
        setForm={setForm}
        handleLogin={handleLogin}
        message={message}
        messageType={messageType}
        isLoading={isLoading}
      />
    );
  }

  return (
    <DashboardPage
      user={user}
      events={events}
      schedule={schedule}
      results={results}
      activeView={activeView}
      setActiveView={setActiveView}
      onRefresh={loadDashboard}
      onLogout={handleLogout}
      selectedEvent={selectedEvent}
      onSelectEvent={handleSelectEvent}
      onClearSelection={handleClearSelection}
      isLoading={isLoading}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
