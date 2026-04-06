const { useEffect, useState } = React;

const TOKEN_STORAGE_KEY = "festify_token";
const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "schedule", label: "Schedule" },
  { id: "results", label: "Results" }
];

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    // Ignore storage issues in restricted environments.
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

function formatDateTimeInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16);
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
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
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

function SummaryCard({ label, value, tone = "default" }) {
  return (
    <div className={`summary-card summary-card-${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="summary-value">{value}</div>
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
        <span className="muted-note">{`Signed in as ${user.role}`}</span>
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

function FlashBanner({ flash, onDismiss }) {
  if (!flash.message) {
    return null;
  }

  return (
    <section className={`flash-banner flash-banner-${flash.type} fade-up`}>
      <span>{flash.message}</span>
      <button className="link-button" type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </section>
  );
}

function Modal({ title, note, isOpen, onClose, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-card fade-up">
        <SectionHeader
          title={title}
          note={note}
          actions={
            <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>
              Close
            </button>
          }
        />
        {children}
      </section>
    </div>
  );
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
            <button className="link-button mt-3" type="button" onClick={() => onSelectEvent(eventItem)}>
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
      <SectionHeader title="Schedule Snapshot" note="Read-only planning view." />
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
        note="Identity and permissions are now coming from the JWT-backed API."
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
      <SectionHeader title="Collection Stats" note="High-level counts from the current dataset." />
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
          This read-only detail panel is also the anchor point for role-aware actions.
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

function EventActionPanel({
  user,
  selectedEvent,
  teams,
  resultForm,
  setResultForm,
  teamForm,
  setTeamForm,
  isSubmitting,
  onOpenCreateEvent,
  onOpenSchedule,
  onDeleteEvent,
  onPublishResult,
  onRegister,
  onCreateTeam,
  onJoinTeam
}) {
  if (!user) {
    return null;
  }

  const canManageEvents = user.role === "Admin" || user.role === "Coordinator";
  const isParticipant = user.role === "Participant";

  return (
    <section className="panel-card">
      <SectionHeader
        title="Actions"
        note="Role-aware frontend controls wired to the existing API routes."
      />

      {canManageEvents ? (
        <div className="action-block">
          <h3 className="subsection-title">Event Management</h3>
          <p className="muted-note">Open a focused dialog to create a new event without crowding the side panel.</p>
          <button className="btn btn-brand" type="button" onClick={onOpenCreateEvent}>
            Create Event
          </button>
        </div>
      ) : null}

      {canManageEvents && selectedEvent ? (
        <div className="action-block">
          <h3 className="subsection-title">Manage Selected Event</h3>
          <p className="muted-note">
            Update operational details for
            {" "}
            <strong>{selectedEvent.name}</strong>.
          </p>

          <button className="btn btn-ghost" type="button" onClick={onOpenSchedule}>
            Schedule Event
          </button>

          <button
            className="btn btn-outline-danger mt-3"
            type="button"
            disabled={isSubmitting}
            onClick={onDeleteEvent}
          >
            Delete Event
          </button>

          <form className="form-stack mt-4" onSubmit={onPublishResult}>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Winner details"
              value={resultForm.winner_details}
              onChange={(event) =>
                setResultForm((currentForm) => ({
                  ...currentForm,
                  winner_details: event.target.value
                }))
              }
              required
            />
            <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
              Publish Result
            </button>
          </form>
        </div>
      ) : null}

      {isParticipant ? (
        selectedEvent ? (
          <div className="action-block">
            <h3 className="subsection-title">Participant Actions</h3>
            <p className="muted-note">
              You selected
              {" "}
              <strong>{selectedEvent.name}</strong>.
            </p>

            {selectedEvent.type === "individual" ? (
              <button className="btn btn-brand" type="button" disabled={isSubmitting} onClick={onRegister}>
                Register for Event
              </button>
            ) : (
              <>
                <form className="form-stack" onSubmit={onCreateTeam}>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="New team name"
                    value={teamForm.team_name}
                    onChange={(event) =>
                      setTeamForm((currentForm) => ({
                        ...currentForm,
                        team_name: event.target.value
                      }))
                    }
                    required
                  />
                  <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
                    Create Team
                  </button>
                </form>

                <div className="mt-4">
                  <h4 className="subsection-title">Existing Teams</h4>
                  {teams.length > 0 ? (
                    <div className="stack-list">
                      {teams.map((team) => (
                        <article className="stack-item" key={team.team_id}>
                          <div className="stack-topline">
                            <strong>{team.team_name}</strong>
                            <span className="status-pill">
                              {team.member_count}/{team.max_participants}
                            </span>
                          </div>
                          <p className="muted-note mb-3">Captain: {team.captain_name}</p>
                          <button
                            className="btn btn-ghost"
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => onJoinTeam(team.team_id)}
                          >
                            Join Team
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-note mb-0">No teams have been created for this event yet.</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="muted-note mb-0">Select an event to register or manage team participation.</p>
        )
      ) : null}

      {user.role === "Volunteer" ? (
        <p className="muted-note mb-0">Volunteers have read-only access in this dashboard.</p>
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
              <h1 className="display-title">Festival operations with real actions now wired in.</h1>
              <p className="hero-copy">
                The dashboard now supports core workflows: admins and coordinators can create events,
                while participants can register and manage teams directly from the Events area.
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

function EventsView({
  user,
  events,
  selectedEvent,
  teams,
  resultForm,
  setResultForm,
  teamForm,
  setTeamForm,
  isSubmitting,
  onSelectEvent,
  onClearSelection,
  onOpenCreateEvent,
  onOpenSchedule,
  onDeleteEvent,
  onPublishResult,
  onRegister,
  onCreateTeam,
  onJoinTeam
}) {
  return (
    <div className="events-layout">
      <div className="content-main">
        <section className="table-card fade-up">
          <SectionHeader title="Events Directory" note="Select an event to view details and available actions." />
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

      <div className="content-side fade-up action-column">
        <EventDetailsPanel eventItem={selectedEvent} onClose={onClearSelection} />
        <EventActionPanel
          user={user}
          selectedEvent={selectedEvent}
          teams={teams}
          resultForm={resultForm}
          setResultForm={setResultForm}
          teamForm={teamForm}
          setTeamForm={setTeamForm}
          isSubmitting={isSubmitting}
          onOpenCreateEvent={onOpenCreateEvent}
          onOpenSchedule={onOpenSchedule}
          onDeleteEvent={onDeleteEvent}
          onPublishResult={onPublishResult}
          onRegister={onRegister}
          onCreateTeam={onCreateTeam}
          onJoinTeam={onJoinTeam}
        />
      </div>
    </div>
  );
}

function ScheduleView({ schedule }) {
  return (
    <section className="table-card fade-up">
      <SectionHeader title="Schedule Board" note="Timing and venue visibility without write actions yet." />
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
              Sign in to unlock role-aware actions for event creation, participant registration, and
              team workflows.
            </p>
            <div className="login-points">
              <div className="login-point">
                <strong>JWT-enabled backend</strong>
                <span className="muted-note">The frontend stores and sends the bearer token.</span>
              </div>
              <div className="login-point">
                <strong>Action-ready dashboard</strong>
                <span className="muted-note">Core event flows are wired directly to the API now.</span>
              </div>
            </div>
          </section>

          <section className="login-card fade-up">
            <SectionHeader title="Sign In" note="Use one of the seeded demo users to continue." />
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
                {isLoading ? "Loading..." : "Sign In"}
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
  teams,
  activeView,
  setActiveView,
  showCreateEventModal,
  showScheduleModal,
  selectedEvent,
  eventForm,
  setEventForm,
  scheduleForm,
  setScheduleForm,
  resultForm,
  setResultForm,
  teamForm,
  setTeamForm,
  isLoading,
  isSubmitting,
  onRefresh,
  onLogout,
  onSelectEvent,
  onClearSelection,
  onCreateEvent,
  onCloseCreateEvent,
  onOpenCreateEvent,
  onSaveSchedule,
  onCloseSchedule,
  onOpenSchedule,
  onDeleteEvent,
  onPublishResult,
  onRegister,
  onCreateTeam,
  onJoinTeam
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
        user={user}
        events={events}
        selectedEvent={selectedEvent}
        teams={teams}
        resultForm={resultForm}
        setResultForm={setResultForm}
        teamForm={teamForm}
        setTeamForm={setTeamForm}
        isSubmitting={isSubmitting}
        onSelectEvent={onSelectEvent}
        onClearSelection={onClearSelection}
        onOpenCreateEvent={onOpenCreateEvent}
        onOpenSchedule={onOpenSchedule}
        onDeleteEvent={onDeleteEvent}
        onPublishResult={onPublishResult}
        onRegister={onRegister}
        onCreateTeam={onCreateTeam}
        onJoinTeam={onJoinTeam}
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

        <Modal
          title="Create Event"
          note="Set up a new event without compressing the side rail."
          isOpen={showCreateEventModal}
          onClose={onCloseCreateEvent}
        >
          <form className="form-stack" onSubmit={onCreateEvent}>
            <input
              className="form-control"
              type="text"
              placeholder="Event name"
              value={eventForm.name}
              onChange={(event) =>
                setEventForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value
                }))
              }
              required
            />
            <textarea
              className="form-control"
              rows="3"
              placeholder="Short description"
              value={eventForm.description}
              onChange={(event) =>
                setEventForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value
                }))
              }
            />
            <div className="form-row">
              <select
                className="form-select"
                value={eventForm.type}
                onChange={(event) =>
                  setEventForm((currentForm) => ({
                    ...currentForm,
                    type: event.target.value
                  }))
                }
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
              <input
                className="form-control"
                type="number"
                min="1"
                placeholder="Capacity"
                value={eventForm.max_participants}
                onChange={(event) =>
                  setEventForm((currentForm) => ({
                    ...currentForm,
                    max_participants: event.target.value
                  }))
                }
                required
              />
            </div>
            <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
              Create Event
            </button>
          </form>
        </Modal>

        <Modal
          title={selectedEvent ? `Schedule ${selectedEvent.name}` : "Schedule Event"}
          note="Venue and time details for the currently selected event."
          isOpen={showScheduleModal}
          onClose={onCloseSchedule}
        >
          <form className="form-stack" onSubmit={onSaveSchedule}>
            <input
              className="form-control"
              type="text"
              placeholder="Venue"
              value={scheduleForm.venue}
              onChange={(event) =>
                setScheduleForm((currentForm) => ({
                  ...currentForm,
                  venue: event.target.value
                }))
              }
              required
            />
            <div className="form-row">
              <input
                className="form-control"
                type="datetime-local"
                value={scheduleForm.start_time}
                onChange={(event) =>
                  setScheduleForm((currentForm) => ({
                    ...currentForm,
                    start_time: event.target.value
                  }))
                }
                required
              />
              <input
                className="form-control"
                type="datetime-local"
                value={scheduleForm.end_time}
                onChange={(event) =>
                  setScheduleForm((currentForm) => ({
                    ...currentForm,
                    end_time: event.target.value
                  }))
                }
                required
              />
            </div>
            <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
              Save Schedule
            </button>
          </form>
        </Modal>
      </div>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeView, setActiveView] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    type: "individual",
    max_participants: ""
  });
  const [scheduleForm, setScheduleForm] = useState({
    venue: "",
    start_time: "",
    end_time: ""
  });
  const [resultForm, setResultForm] = useState({
    winner_details: ""
  });
  const [teamForm, setTeamForm] = useState({
    team_name: ""
  });
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [flash, setFlash] = useState({
    message: "",
    type: "success"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function showFlash(message, type = "success") {
    setFlash({ message, type });
  }

  function clearFlash() {
    setFlash({ message: "", type: "success" });
  }

  function syncEventForms(eventItem) {
    setScheduleForm({
      venue: eventItem?.venue || "",
      start_time: formatDateTimeInput(eventItem?.start_time),
      end_time: formatDateTimeInput(eventItem?.end_time)
    });
    setResultForm({
      winner_details: eventItem?.winner_details || ""
    });
  }

  async function loadTeamsForEvent(eventItem) {
    if (!eventItem || eventItem.type !== "team") {
      setTeams([]);
      return;
    }

    const teamsPayload = await apiFetch(`/api/teams?event_id=${eventItem.event_id}`);
    setTeams(teamsPayload);
  }

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const token = getStoredToken();
      const [sessionPayload, eventsPayload, schedulePayload, resultsPayload] =
        await Promise.all([
          token ? apiFetch("/api/me") : Promise.resolve({ user: null }),
          apiFetch("/api/events"),
          apiFetch("/api/schedule"),
          apiFetch("/api/results")
        ]);

      setUser(sessionPayload.user);
      setEvents(eventsPayload);
      setSchedule(schedulePayload);
      setResults(resultsPayload);

      if (selectedEvent) {
        const refreshedSelection =
          eventsPayload.find((eventItem) => eventItem.event_id === selectedEvent.event_id) || null;
        setSelectedEvent(refreshedSelection);
        syncEventForms(refreshedSelection);
        await loadTeamsForEvent(refreshedSelection);
      }
    } catch (error) {
      if (error.message === "Invalid or expired token.") {
        setStoredToken(null);
        setUser(null);
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard().catch((error) => {
      showFlash(error.message, "danger");
    });
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify(form)
      });

      setStoredToken(payload.token);
      setUser(payload.user);
      setForm({
        email: "",
        password: ""
      });
      clearFlash();
      await loadDashboard();
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      if (getStoredToken()) {
        await apiFetch("/api/logout", {
          method: "POST"
        });
      }
    } catch (error) {
      // Ignore logout API errors and still clear local auth state.
    } finally {
      setStoredToken(null);
      setUser(null);
      setSelectedEvent(null);
      setTeams([]);
      setActiveView("overview");
      clearFlash();
    }
  }

  async function handleSelectEvent(eventItem) {
    setSelectedEvent(eventItem);
    syncEventForms(eventItem);
    setActiveView("events");

    try {
      await loadTeamsForEvent(eventItem);
    } catch (error) {
      showFlash(error.message, "danger");
    }
  }

  function handleClearSelection() {
    setSelectedEvent(null);
    setTeams([]);
    syncEventForms(null);
  }

  async function handleCreateEvent(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          ...eventForm,
          max_participants: Number.parseInt(eventForm.max_participants, 10)
        })
      });

      setEventForm({
        name: "",
        description: "",
        type: "individual",
        max_participants: ""
      });
      setShowCreateEventModal(false);
      showFlash("Event created successfully.");
      await loadDashboard();
      setActiveView("events");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister() {
    if (!selectedEvent) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch(`/api/events/${selectedEvent.event_id}/register`, {
        method: "POST",
        body: JSON.stringify({})
      });

      showFlash("Registration completed successfully.");
      await loadDashboard();
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveSchedule(event) {
    event.preventDefault();

    if (!selectedEvent) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/api/schedule", {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEvent.event_id,
          venue: scheduleForm.venue,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time
        })
      });

      setShowScheduleModal(false);
      showFlash("Schedule saved successfully.");
      await loadDashboard();
      setActiveView("events");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvent() {
    if (!selectedEvent) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedEvent.name}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch(`/api/events/${selectedEvent.event_id}`, {
        method: "DELETE"
      });

      setSelectedEvent(null);
      setTeams([]);
      syncEventForms(null);
      setShowScheduleModal(false);
      showFlash("Event deleted successfully.");
      await loadDashboard();
      setActiveView("events");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateTeam(event) {
    event.preventDefault();

    if (!selectedEvent) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          team_name: teamForm.team_name,
          event_id: selectedEvent.event_id
        })
      });

      setTeamForm({ team_name: "" });
      showFlash("Team created successfully.");
      await loadDashboard();
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinTeam(teamId) {
    setIsSubmitting(true);

    try {
      await apiFetch(`/api/teams/${teamId}/join`, {
        method: "POST",
        body: JSON.stringify({})
      });

      showFlash("Joined team successfully.");
      await loadDashboard();
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublishResult(event) {
    event.preventDefault();

    if (!selectedEvent) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/api/results", {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEvent.event_id,
          winner_details: resultForm.winner_details
        })
      });

      showFlash("Result published successfully.");
      await loadDashboard();
      setActiveView("events");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <LoginPage
        form={form}
        setForm={setForm}
        handleLogin={handleLogin}
        message={flash.message}
        messageType={flash.type}
        isLoading={isSubmitting || isLoading}
      />
    );
  }

  return (
    <>
      <FlashBanner flash={flash} onDismiss={clearFlash} />
      <DashboardPage
        user={user}
        events={events}
        schedule={schedule}
        results={results}
        teams={teams}
        activeView={activeView}
        setActiveView={setActiveView}
        showCreateEventModal={showCreateEventModal}
        showScheduleModal={showScheduleModal}
        selectedEvent={selectedEvent}
        eventForm={eventForm}
        setEventForm={setEventForm}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        resultForm={resultForm}
        setResultForm={setResultForm}
        teamForm={teamForm}
        setTeamForm={setTeamForm}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onRefresh={loadDashboard}
        onLogout={handleLogout}
        onSelectEvent={handleSelectEvent}
        onClearSelection={handleClearSelection}
        onCreateEvent={handleCreateEvent}
        onCloseCreateEvent={() => setShowCreateEventModal(false)}
        onOpenCreateEvent={() => setShowCreateEventModal(true)}
        onSaveSchedule={handleSaveSchedule}
        onCloseSchedule={() => setShowScheduleModal(false)}
        onOpenSchedule={() => {
          if (selectedEvent) {
            setShowScheduleModal(true);
          }
        }}
        onDeleteEvent={handleDeleteEvent}
        onPublishResult={handlePublishResult}
        onRegister={handleRegister}
        onCreateTeam={handleCreateTeam}
        onJoinTeam={handleJoinTeam}
      />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
