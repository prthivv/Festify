const { useEffect, useState } = React;

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "schedule", label: "Schedule" },
  { id: "results", label: "Results" }
];

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
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    ...options
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
              <td colSpan={headers.length} className="text-center muted-note py-4">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Topbar({ user, onRefresh }) {
  return (
    <header className="topbar fade-up">
      <div>
        <div className="eyebrow">CEFMS</div>
        <h1 className="topbar-title">Festival Control Surface</h1>
      </div>
      <div className="topbar-meta">
        <span className="muted-note">
          {user ? `Signed in as ${user.role}` : "Preview mode"}
        </span>
        <button className="btn btn-ghost" type="button" onClick={onRefresh}>
          Refresh Data
        </button>
      </div>
    </header>
  );
}

function NavTabs({ activeView, setActiveView }) {
  return (
    <nav className="nav-strip fade-up" aria-label="Frontend sections">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-chip ${activeView === item.id ? "nav-chip-active" : ""}`}
          type="button"
          onClick={() => setActiveView(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function StackList({ items, emptyMessage }) {
  if (items.length === 0) {
    return <p className="muted-note mb-0">{emptyMessage}</p>;
  }

  return <div className="stack-list">{items}</div>;
}

function EventHighlights({ events, onSelectEvent }) {
  return (
    <section className="panel-card h-100">
      <SectionHeader title="Featured Events" note="Quick glance at the next few items in the system." />
      <StackList
        emptyMessage="No events available yet."
        items={events.slice(0, 3).map((eventItem) => (
          <article className="stack-item stack-item-action" key={eventItem.event_id}>
            <div className="stack-topline">
              <strong>{eventItem.name}</strong>
              <span className="status-pill">{getEventStatus(eventItem)}</span>
            </div>
            <p className="muted-note mb-2">
              {eventItem.description || "No description added yet."}
            </p>
            <div className="mini-meta">
              <span>{eventItem.type}</span>
              <span>{eventItem.venue || "Venue TBD"}</span>
              <span>{formatCompactDate(eventItem.start_time)}</span>
            </div>
            <button
              className="link-button mt-3"
              type="button"
              onClick={() => onSelectEvent(eventItem)}
            >
              View details
            </button>
          </article>
        ))}
      />
    </section>
  );
}

function ScheduleHighlights({ schedule }) {
  return (
    <section className="panel-card h-100">
      <SectionHeader title="Schedule Snapshot" note="Read-only planning view, safe to build before auth changes." />
      <StackList
        emptyMessage="No scheduled events published yet."
        items={schedule.slice(0, 4).map((item) => (
          <article className="stack-item" key={item.schedule_id}>
            <div className="stack-topline">
              <strong>{item.event_name}</strong>
              <span className="status-pill">{item.status}</span>
            </div>
            <div className="mini-meta">
              <span>{item.venue}</span>
              <span>{formatDate(item.start_time)}</span>
            </div>
          </article>
        ))}
      />
    </section>
  );
}

function SessionPanel({ user, onLogout }) {
  return (
    <section className="panel-card">
      <SectionHeader
        title="Session Snapshot"
        note="This still uses the existing backend session flow. No auth contract changes here."
      />
      <div className="session-card">
        <div className="status-pill mb-3">Signed in</div>
        <p className="mb-1">
          <strong>{user.name}</strong>
        </p>
        <p className="mb-1 muted-note">{user.role}</p>
        <p className="mb-0 muted-note">{user.email}</p>
        <button className="btn btn-ghost mt-3 align-self-start" type="button" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </section>
  );
}

function InsightPanel({ events, schedule }) {
  return (
    <section className="panel-card">
      <SectionHeader title="Collection Stats" note="Useful as we plan the role-specific dashboards." />
      <div className="insight-grid">
        <SummaryCard
          label="Individual"
          value={events.filter((eventItem) => eventItem.type === "individual").length}
        />
        <SummaryCard
          label="Team"
          value={events.filter((eventItem) => eventItem.type === "team").length}
          tone="accent"
        />
        <SummaryCard
          label="Live Sessions"
          value={schedule.filter((item) => item.status === "ongoing").length}
          tone="warm"
        />
      </div>
    </section>
  );
}

function EventDetailsPanel({ eventItem, onClose }) {
  if (!eventItem) {
    return (
      <section className="panel-card">
        <SectionHeader
          title="Event Details"
          note="Pick an event from the list to preview the detail experience."
        />
        <p className="muted-note mb-0">
          This is a safe frontend-only detail panel that doesn’t depend on future JWT changes.
        </p>
      </section>
    );
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
            <div className="col-lg-7">
              <h1 className="display-title">Read-only festival operations board.</h1>
              <p className="hero-copy">
                This layer stays frontend-only and safe while authentication changes are happening
                elsewhere. We are building navigation, layouts, and data views without touching auth
                internals.
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

        <div className="row g-4 mt-1">
          <div className="col-lg-6 fade-up">
            <EventHighlights events={events} onSelectEvent={onSelectEvent} />
          </div>
          <div className="col-lg-6 fade-up">
            <ScheduleHighlights schedule={schedule} />
          </div>
        </div>
      </div>

      <div className="content-side fade-up">
        <InsightPanel events={events} schedule={schedule} />
      </div>
    </div>
  );
}

function EventsView({ events, selectedEvent, onSelectEvent, onClearSelection }) {
  return (
    <div className="events-layout">
      <div className="content-main">
        <section className="table-card fade-up">
          <SectionHeader title="Events Directory" note="Shared read-only view for every role." />
          <DataTable
            headers={["Event", "Coordinator", "Capacity", "Registrations", "Venue", "Status"]}
            emptyMessage="No events available yet."
            rows={events.map((eventItem) => (
              <tr
                key={eventItem.event_id}
                className={`table-row-action ${
                  selectedEvent?.event_id === eventItem.event_id ? "table-row-active" : ""
                }`}
                onClick={() => onSelectEvent(eventItem)}
              >
                <td>
                  <strong>{eventItem.name}</strong>
                  <br />
                  <span className="muted-note">{eventItem.type}</span>
                </td>
                <td>{eventItem.creator_name}</td>
                <td>{eventItem.max_participants}</td>
                <td>
                  {eventItem.type === "individual"
                    ? eventItem.individual_registrations
                    : eventItem.team_count}
                </td>
                <td>{eventItem.venue || "TBD"}</td>
                <td>
                  <span className="status-pill">{getEventStatus(eventItem)}</span>
                </td>
              </tr>
            ))}
          />
        </section>
      </div>

      <div className="content-side fade-up">
        <EventDetailsPanel eventItem={selectedEvent} onClose={onClearSelection} />
      </div>
    </div>
  );
}

function ScheduleView({ schedule }) {
  return (
    <section className="table-card fade-up">
      <SectionHeader title="Schedule Board" note="Timing and venue visibility without any write actions yet." />
      <DataTable
        headers={["Event", "Venue", "Starts", "Ends", "Status"]}
        emptyMessage="Schedule has not been published yet."
        rows={schedule.map((item) => (
          <tr key={item.schedule_id}>
            <td>
              <strong>{item.event_name}</strong>
            </td>
            <td>{item.venue}</td>
            <td>{formatDate(item.start_time)}</td>
            <td>{formatDate(item.end_time)}</td>
            <td>
              <span className="status-pill">{item.status}</span>
            </td>
          </tr>
        ))}
      />
    </section>
  );
}

function ResultsView({ results }) {
  return (
    <section className="table-card fade-up">
      <SectionHeader title="Published Results" note="Final outcomes from completed events." />
      <DataTable
        headers={["Event", "Winner Details", "Published", "Published By"]}
        emptyMessage="Results will appear here after publication."
        rows={results.map((resultItem) => (
          <tr key={resultItem.result_id}>
            <td>
              <strong>{resultItem.event_name}</strong>
            </td>
            <td>{resultItem.winner_details}</td>
            <td>{formatDate(resultItem.published_at)}</td>
            <td>{resultItem.published_by_name}</td>
          </tr>
        ))}
      />
    </section>
  );
}

function LoginPage({ form, setForm, handleLogin, message, messageType, isLoading }) {
  return (
    <main className="login-shell">
      <div className="app-container">
        <div className="login-layout">
          <section className="login-hero fade-up">
            <span className="eyebrow">Festify / CEFMS</span>
            <h1 className="display-title login-title">Festival management, with a cleaner entry point.</h1>
            <p className="hero-copy">
              The login screen now lives on its own dedicated page so the main dashboard can focus on
              operations views. This still uses the existing backend auth flow unchanged.
            </p>
            <div className="login-points">
              <div className="login-point">
                <strong>Backend stays untouched</strong>
                <span className="muted-note">No auth routes or session contracts changed.</span>
              </div>
              <div className="login-point">
                <strong>Frontend stays modular</strong>
                <span className="muted-note">Ready for JWT wiring later without redesigning the shell.</span>
              </div>
            </div>
          </section>

          <section className="login-card fade-up">
            <SectionHeader
              title="Sign In"
              note="Use one of the seeded demo users while JWT work is in progress."
            />
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
                      email: event.target.value
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
                      password: event.target.value
                    }))
                  }
                  required
                />
              </div>
              <button className="btn btn-brand" type="submit" disabled={isLoading}>
                {isLoading ? "Checking session..." : "Sign In"}
              </button>
              <p className="muted-note mb-0">
                All seeded accounts share the demo password:
                {" "}
                <code>correct horse battery staple</code>
              </p>
              {message ? (
                <div className={`small mt-2 text-${messageType || "muted"}`}>{message}</div>
              ) : null}
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function DashboardPage({
  user,
  events,
  schedule,
  results,
  activeView,
  setActiveView,
  onRefresh,
  onLogout,
  selectedEvent,
  onSelectEvent,
  onClearSelection,
  isLoading
}) {
  let activeContent;

  if (isLoading) {
    activeContent = (
      <section className="panel-card fade-up">
        <SectionHeader title="Loading Dashboard" note="Fetching events, schedule, and results from the API." />
      </section>
    );
  } else if (activeView === "events") {
    activeContent = (
      <EventsView
        events={events}
        selectedEvent={selectedEvent}
        onSelectEvent={onSelectEvent}
        onClearSelection={onClearSelection}
      />
    );
  } else if (activeView === "schedule") {
    activeContent = <ScheduleView schedule={schedule} />;
  } else if (activeView === "results") {
    activeContent = <ResultsView results={results} />;
  } else {
    activeContent = (
      <OverviewView
        events={events}
        schedule={schedule}
        results={results}
        onSelectEvent={onSelectEvent}
      />
    );
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <Topbar user={user} onRefresh={onRefresh} />
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar fade-up">
            <SessionPanel user={user} onLogout={onLogout} />
            <NavTabs activeView={activeView} setActiveView={setActiveView} />
          </aside>
          <section className="dashboard-main">{activeContent}</section>
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
