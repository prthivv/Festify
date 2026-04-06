const { useEffect, useState } = React;

const TOKEN_STORAGE_KEY = "festify_token";
const AUTH_ROLES = ["Admin", "Coordinator", "Participant", "Volunteer"];
const REG_ROLES = ["Participant", "Volunteer"];
const BASE_NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "schedule", label: "Schedule" },
  { id: "results", label: "Results" }
];

function getNavItems(user) {
  const items = [...BASE_NAV_ITEMS];

  if (user?.role === "Admin" || user?.role === "Coordinator") {
    items.push({ id: "sponsors", label: "Sponsors" });
    items.push({ id: "budget", label: "Budget" });
  }

  if (user?.role === "Volunteer") {
    items.push({ id: "volunteer", label: "Volunteer" });
  }

  if (user?.role === "Admin" || user?.role === "Coordinator") {
    items.push({ id: "volunteer-roster", label: "Volunteers" });
  }

  return items;
}

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

function formatCurrency(value) {
  const amount = Number.parseFloat(value);

  if (Number.isNaN(amount)) {
    return "0.00";
  }

  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD"
  });
}

function getManageableEvents(user, events) {
  if (!user) {
    return [];
  }

  if (user.role === "Admin") {
    return events;
  }

  if (user.role === "Coordinator") {
    return events.filter(
      (eventItem) => Number(eventItem.created_by) === Number(user.user_id)
    );
  }

  return [];
}

function getKnownVolunteers(events) {
  const volunteerMap = new Map();

  events.forEach((eventItem) => {
    (eventItem.volunteers || []).forEach((assignment) => {
      if (!volunteerMap.has(assignment.volunteer_id)) {
        volunteerMap.set(assignment.volunteer_id, {
          volunteer_id: assignment.volunteer_id,
          volunteer_name: assignment.volunteer_name,
          volunteer_email: assignment.volunteer_email
        });
      }
    });
  });

  return Array.from(volunteerMap.values()).sort((left, right) =>
    left.volunteer_name.localeCompare(right.volunteer_name)
  );
}

function readInputValue(id, fallback = "") {
  const element = document.getElementById(id);

  if (!element || typeof element.value !== "string") {
    return fallback;
  }

  return element.value;
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
    const requestError = new Error(payload?.error || "Request failed.");
    requestError.status = response.status;
    throw requestError;
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

function NavTabs({ user, activeView, setActiveView }) {
  const navItems = getNavItems(user);

  return (
    <nav className="nav-strip fade-up" aria-label="Frontend sections">
      {navItems.map((item) => (
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
  onOpenEditEvent,
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

          <button className="btn btn-brand" type="button" onClick={onOpenEditEvent}>
            Edit Event
          </button>

          <button className="btn btn-ghost" type="button" onClick={onOpenSchedule}>
            Schedule Event
          </button>

          <button
            className="btn btn-outline-danger"
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
  onOpenEditEvent,
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
          onOpenEditEvent={onOpenEditEvent}
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

function VolunteerView({
  events,
  assignments,
  isSubmitting,
  onChooseEvent
}) {
  const selectedEventIds = new Set(assignments.map((assignment) => assignment.event_id));

  return (
    <div className="content-grid">
      <div className="content-main">
        <section className="panel-card fade-up">
          <SectionHeader
            title="Volunteer Opportunities"
            note="All events are visible here. Events with five volunteers are closed for self-selection."
          />
          <StackList
            emptyMessage="No events are available right now."
            items={events.map((eventItem) => {
              const volunteerCount = Number(eventItem.volunteer_count || 0);
              const alreadySelected = selectedEventIds.has(eventItem.event_id);
              const isVolunteerFull = volunteerCount >= 5;

              return (
                <article className="stack-item" key={eventItem.event_id}>
                  <div className="stack-topline">
                    <strong>{eventItem.name}</strong>
                    <span className="status-pill">{volunteerCount}/5 volunteers</span>
                  </div>
                  <p className="muted-note mb-2">
                    {eventItem.description || "No description added yet."}
                  </p>
                  <div className="mini-meta">
                    <span>{eventItem.type}</span>
                    <span>{eventItem.venue || "Venue TBD"}</span>
                    <span>{formatDate(eventItem.start_time)}</span>
                    <span>{eventItem.creator_name}</span>
                  </div>
                  {isVolunteerFull && !alreadySelected ? (
                    <p className="muted-note text-danger mt-3 mb-0">
                      You can&apos;t register as a volunteer for this event because it already has 5
                      volunteers.
                    </p>
                  ) : null}
                  <button
                    className="btn btn-brand mt-3"
                    type="button"
                    disabled={isSubmitting || alreadySelected || isVolunteerFull}
                    onClick={() => onChooseEvent(eventItem.event_id)}
                  >
                    {alreadySelected
                      ? "Already Chosen"
                      : isVolunteerFull
                        ? "Volunteer Full"
                        : "Volunteer for This Event"}
                  </button>
                </article>
              );
            })}
          />
        </section>
      </div>

      <div className="content-side fade-up">
        <section className="panel-card">
          <SectionHeader
            title="Your Selections"
            note="Assignments already linked to your volunteer account."
          />
          <StackList
            emptyMessage="You have not selected or been assigned to any events yet."
            items={assignments.map((assignment) => (
              <article className="stack-item" key={assignment.assignment_id}>
                <div className="stack-topline">
                  <strong>{assignment.event_name}</strong>
                  <span className="status-pill">{assignment.venue || "Venue TBD"}</span>
                </div>
                <p className="muted-note mb-2">
                  {assignment.task_description || "Task details will be shared later."}
                </p>
                <div className="mini-meta">
                  <span>{formatDate(assignment.start_time)}</span>
                  <span>{assignment.assigned_by_name}</span>
                </div>
              </article>
            ))}
          />
        </section>
      </div>
    </div>
  );
}

function VolunteerRosterView({
  user,
  events,
  volunteerAssignForm,
  setVolunteerAssignForm,
  isSubmitting,
  onAssignVolunteer
}) {
  const roster =
    user.role === "Coordinator"
      ? events.filter(
          (eventItem) => Number(eventItem.created_by) === Number(user.user_id)
        )
      : events;
  const knownVolunteers = getKnownVolunteers(roster);
  const totalAssignments = roster.reduce(
    (sum, eventItem) => sum + Number(eventItem.volunteer_count || 0),
    0
  );
  const fullyStaffedEvents = roster.filter(
    (eventItem) => Number(eventItem.volunteer_count || 0) >= 5
  ).length;

  return (
    <div className="content-grid">
      <div className="content-main">
        <section className="panel-card fade-up">
          <SectionHeader
            title="Volunteer Roster"
            note={
              user.role === "Admin"
                ? "See volunteer coverage across all events."
                : "See volunteer coverage for the events you manage."
            }
          />
          <StackList
            emptyMessage="No events are available for volunteer review yet."
            items={roster.map((eventItem) => (
              <article className="stack-item" key={eventItem.event_id}>
                <div className="stack-topline">
                  <strong>{eventItem.name}</strong>
                  <span className="status-pill">
                    {Number(eventItem.volunteer_count || 0)}/5 volunteers
                  </span>
                </div>
                <p className="muted-note mb-2">
                  {eventItem.description || "No description added yet."}
                </p>
                <div className="mini-meta">
                  <span>{eventItem.type}</span>
                  <span>{eventItem.venue || "Venue TBD"}</span>
                  <span>{formatDate(eventItem.start_time)}</span>
                  <span>{eventItem.creator_name}</span>
                </div>
                {(eventItem.volunteers || []).length > 0 ? (
                  <div className="roster-list">
                    {(eventItem.volunteers || []).map((assignment) => (
                      <article className="roster-item" key={assignment.assignment_id}>
                        <div className="roster-volunteer">
                          <strong>{assignment.volunteer_name}</strong>
                          <span className="muted-note">{assignment.volunteer_email}</span>
                        </div>
                        <div className="roster-meta">
                          <span>{assignment.task_description || "Task pending"}</span>
                          <span>{assignment.assigned_by_name}</span>
                          <span>{formatDate(assignment.assigned_at)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted-note mt-3 mb-0">
                    No volunteers are assigned to this event yet.
                  </p>
                )}
              </article>
            ))}
          />
        </section>
      </div>

      <div className="content-side fade-up">
        <section className="panel-card">
          <SectionHeader
            title="Roster Snapshot"
            note="At-a-glance volunteer coverage for the current scope."
          />
          <div className="insight-grid">
            <SummaryCard label="Tracked Events" value={roster.length} />
            <SummaryCard label="Assignments" value={totalAssignments} tone="accent" />
            <SummaryCard label="Fully Staffed" value={fullyStaffedEvents} tone="warm" />
          </div>
        </section>

        <section className="panel-card">
          <SectionHeader
            title="Assign Volunteer"
            note="Use the existing assignment route by selecting an event and entering a volunteer user ID."
          />
          <form className="form-stack" onSubmit={onAssignVolunteer}>
            <select
              className="form-select"
              value={volunteerAssignForm.event_id}
              onChange={(event) =>
                setVolunteerAssignForm((currentForm) => ({
                  ...currentForm,
                  event_id: event.target.value
                }))
              }
              required
            >
              <option value="">Select event</option>
              {roster.map((eventItem) => (
                <option key={eventItem.event_id} value={eventItem.event_id}>
                  {eventItem.name}
                </option>
              ))}
            </select>
            <input
              className="form-control"
              type="number"
              min="1"
              placeholder="Volunteer user ID"
              value={volunteerAssignForm.volunteer_id}
              onChange={(event) =>
                setVolunteerAssignForm((currentForm) => ({
                  ...currentForm,
                  volunteer_id: event.target.value
                }))
              }
              required
            />
            <textarea
              className="form-control"
              rows="3"
              placeholder="Task description"
              value={volunteerAssignForm.task_description}
              onChange={(event) =>
                setVolunteerAssignForm((currentForm) => ({
                  ...currentForm,
                  task_description: event.target.value
                }))
              }
            />
            <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
              Assign Volunteer
            </button>
          </form>
          {knownVolunteers.length > 0 ? (
            <div className="reference-list mt-3">
              <div className="metric-label">Known Volunteer IDs</div>
              <div className="mini-meta mt-2">
                {knownVolunteers.map((volunteer) => (
                  <span key={volunteer.volunteer_id}>
                    #{volunteer.volunteer_id} {volunteer.volunteer_name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted-note mt-3 mb-0">
              No volunteer IDs are visible yet. Enter a volunteer&apos;s user ID manually if needed.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function SponsorsView({
  user,
  sponsors,
  events,
  sponsorForm,
  setSponsorForm,
  sponsorLinkForm,
  setSponsorLinkForm,
  isSubmitting,
  onCreateSponsor,
  onLinkSponsor
}) {
  const manageableEvents = getManageableEvents(user, events);
  const totalSponsorValue = sponsors.reduce(
    (sum, sponsor) => sum + Number.parseFloat(sponsor.contribution_amount || 0),
    0
  );

  return (
    <div className="content-grid">
      <div className="content-main">
        <section className="panel-card fade-up">
          <SectionHeader
            title="Sponsor Directory"
            note="Track sponsor commitments and see which events they support."
          />
          <StackList
            emptyMessage="No sponsors have been added yet."
            items={sponsors.map((sponsor) => (
              <article className="stack-item" key={sponsor.sponsor_id}>
                <div className="stack-topline">
                  <strong>{sponsor.name}</strong>
                  <span className="status-pill">{formatCurrency(sponsor.contribution_amount)}</span>
                </div>
                <p className="muted-note mb-2">
                  {sponsor.contact_info || "No contact information added yet."}
                </p>
                {(sponsor.linked_events || []).length > 0 ? (
                  <div className="mini-meta">
                    {(sponsor.linked_events || []).map((linkedEvent) => (
                      <span key={`${sponsor.sponsor_id}-${linkedEvent.event_id}`}>
                        {linkedEvent.event_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted-note mb-0">This sponsor is not linked to any events yet.</p>
                )}
              </article>
            ))}
          />
        </section>
      </div>

      <div className="content-side fade-up action-column">
        <section className="panel-card">
          <SectionHeader
            title="Sponsor Snapshot"
            note="A quick look at the current sponsorship footprint."
          />
          <div className="insight-grid">
            <SummaryCard label="Sponsors" value={sponsors.length} />
            <SummaryCard label="Linked Events" value={sponsors.filter((sponsor) => sponsor.linked_events?.length).length} tone="accent" />
            <SummaryCard label="Contribution" value={formatCurrency(totalSponsorValue)} tone="warm" />
          </div>
        </section>

        {user.role === "Admin" ? (
          <>
            <section className="panel-card">
              <SectionHeader
                title="Create Sponsor"
                note="Add a new sponsor record using the existing sponsor API."
              />
              <form className="form-stack" onSubmit={onCreateSponsor}>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Sponsor name"
                  value={sponsorForm.name}
                  onChange={(event) =>
                    setSponsorForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value
                    }))
                  }
                  required
                />
                <input
                  className="form-control"
                  type="text"
                  placeholder="Contact information"
                  value={sponsorForm.contact_info}
                  onChange={(event) =>
                    setSponsorForm((currentForm) => ({
                      ...currentForm,
                      contact_info: event.target.value
                    }))
                  }
                />
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Contribution amount"
                  value={sponsorForm.contribution_amount}
                  onChange={(event) =>
                    setSponsorForm((currentForm) => ({
                      ...currentForm,
                      contribution_amount: event.target.value
                    }))
                  }
                />
                <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
                  Create Sponsor
                </button>
              </form>
            </section>

            <section className="panel-card">
              <SectionHeader
                title="Link Sponsor"
                note="Attach an existing sponsor to one of the events in the system."
              />
              <form className="form-stack" onSubmit={onLinkSponsor}>
                <select
                  className="form-select"
                  value={sponsorLinkForm.sponsor_id}
                  onChange={(event) =>
                    setSponsorLinkForm((currentForm) => ({
                      ...currentForm,
                      sponsor_id: event.target.value
                    }))
                  }
                  required
                >
                  <option value="">Select sponsor</option>
                  {sponsors.map((sponsor) => (
                    <option key={sponsor.sponsor_id} value={sponsor.sponsor_id}>
                      {sponsor.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={sponsorLinkForm.event_id}
                  onChange={(event) =>
                    setSponsorLinkForm((currentForm) => ({
                      ...currentForm,
                      event_id: event.target.value
                    }))
                  }
                  required
                >
                  <option value="">Select event</option>
                  {manageableEvents.map((eventItem) => (
                    <option key={eventItem.event_id} value={eventItem.event_id}>
                      {eventItem.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
                  Link Sponsor
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BudgetView({
  user,
  events,
  budgetEventId,
  setBudgetEventId,
  budgetData,
  budgetForm,
  setBudgetForm,
  expenseForm,
  setExpenseForm,
  isBudgetLoading,
  isSubmitting,
  onLoadBudget,
  onSaveBudget,
  onRecordExpense
}) {
  const manageableEvents = getManageableEvents(user, events);
  const selectedBudgetEvent = manageableEvents.find(
    (eventItem) => String(eventItem.event_id) === String(budgetEventId)
  ) || null;
  const budget = budgetData?.budget || null;
  const expenses = budgetData?.expenses || [];
  const spentAmount = budget
    ? Number.parseFloat(budget.allocated_amount) - Number.parseFloat(budget.remaining_amount)
    : 0;

  return (
    <div className="content-grid">
      <div className="content-main">
        <section className="panel-card fade-up">
          <SectionHeader
            title="Budget Control"
            note="Review a specific event budget, then track every recorded expense."
          />
          <div className="selector-row">
            <select
              className="form-select"
              value={budgetEventId}
              onChange={(event) => setBudgetEventId(event.target.value)}
            >
              <option value="">Select event</option>
              {manageableEvents.map((eventItem) => (
                <option key={eventItem.event_id} value={eventItem.event_id}>
                  {eventItem.name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={isBudgetLoading || !budgetEventId}
              onClick={onLoadBudget}
            >
              {isBudgetLoading ? "Loading..." : "Load Budget"}
            </button>
          </div>

          {!budgetEventId ? (
            <p className="muted-note mb-0">Choose an event to view budget and expense details.</p>
          ) : isBudgetLoading ? (
            <p className="muted-note mb-0">Loading budget details...</p>
          ) : selectedBudgetEvent ? (
            <>
              <div className="detail-grid mt-3">
                <div className="detail-card">
                  <div className="metric-label">Event</div>
                  <div className="detail-value">{selectedBudgetEvent.name}</div>
                </div>
                <div className="detail-card">
                  <div className="metric-label">Status</div>
                  <div className="detail-value">{budget ? "Budget ready" : "No budget yet"}</div>
                </div>
                <div className="detail-card">
                  <div className="metric-label">Allocated</div>
                  <div className="detail-value">
                    {budget ? formatCurrency(budget.allocated_amount) : "TBD"}
                  </div>
                </div>
                <div className="detail-card">
                  <div className="metric-label">Remaining</div>
                  <div className="detail-value">
                    {budget ? formatCurrency(budget.remaining_amount) : "TBD"}
                  </div>
                </div>
              </div>

              {budget ? (
                <div className="result-banner mt-3">
                  <strong>Spent so far:</strong>
                  {" "}
                  {formatCurrency(spentAmount)}
                </div>
              ) : (
                <p className="muted-note mt-3 mb-0">
                  No budget has been created for this event yet.
                </p>
              )}

              <div className="mt-4">
                <SectionHeader
                  title="Expense Log"
                  note="Each expense updates the remaining amount through the database trigger."
                />
                <DataTable
                  headers={["Date", "Amount", "Description", "Recorded"]}
                  emptyMessage="No expenses have been recorded for this event yet."
                  rows={expenses.map((expense) => (
                    <tr key={expense.expense_id}>
                      <td>{formatCompactDate(expense.expense_date)}</td>
                      <td>{formatCurrency(expense.amount)}</td>
                      <td>{expense.description || "No description provided."}</td>
                      <td>{formatDate(expense.recorded_at)}</td>
                    </tr>
                  ))}
                />
              </div>
            </>
          ) : null}
        </section>
      </div>

      <div className="content-side fade-up action-column">
        {user.role === "Admin" ? (
          <section className="panel-card">
            <SectionHeader
              title="Save Budget"
              note="Create or update the allocated amount for the selected event."
            />
            <form className="form-stack" onSubmit={onSaveBudget}>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                placeholder="Allocated amount"
                value={budgetForm.allocated_amount}
                onChange={(event) =>
                  setBudgetForm((currentForm) => ({
                    ...currentForm,
                    allocated_amount: event.target.value
                  }))
                }
                required
              />
              <button className="btn btn-brand" type="submit" disabled={isSubmitting || !budgetEventId}>
                Save Budget
              </button>
            </form>
          </section>
        ) : null}

        <section className="panel-card">
          <SectionHeader
            title="Record Expense"
            note="Admins and coordinators can log expenses against the selected event."
          />
          <form className="form-stack" onSubmit={onRecordExpense}>
            <input
              className="form-control"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Expense amount"
              value={expenseForm.amount}
              onChange={(event) =>
                setExpenseForm((currentForm) => ({
                  ...currentForm,
                  amount: event.target.value
                }))
              }
              required
            />
            <input
              className="form-control"
              type="date"
              value={expenseForm.expense_date}
              onChange={(event) =>
                setExpenseForm((currentForm) => ({
                  ...currentForm,
                  expense_date: event.target.value
                }))
              }
              required
            />
            <textarea
              className="form-control"
              rows="3"
              placeholder="Expense description"
              value={expenseForm.description}
              onChange={(event) =>
                setExpenseForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value
                }))
              }
            />
            <button className="btn btn-brand" type="submit" disabled={isSubmitting || !budgetEventId}>
              Record Expense
            </button>
          </form>
          {!budget ? (
            <p className="muted-note mt-3 mb-0">
              A budget must exist before expenses can be recorded successfully.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function LoginPage({
  authMode,
  setAuthMode,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  handleLogin,
  handleRegister,
  message,
  messageType,
  isSubmitting
}) {
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
            <SectionHeader
              title={authMode === "login" ? "Sign In" : "Create Account"}
              note={
                authMode === "login"
                  ? "Use a seeded demo user or one you created locally."
                  : "Register a new admin, coordinator, participant, or volunteer account."
              }
            />
            <div className="auth-toggle">
              <button
                className={`auth-toggle-button ${authMode === "login" ? "auth-toggle-button-active" : ""}`}
                type="button"
                onClick={() => setAuthMode("login")}
              >
                Sign In
              </button>
              <button
                className={`auth-toggle-button ${authMode === "register" ? "auth-toggle-button-active" : ""}`}
                type="button"
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>

            {authMode === "login" ? (
              <div className="d-grid gap-3" role="form" aria-label="Sign in form">
                <div>
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="form-control"
                    id="email"
                    type="email"
                    value={loginForm.email}
                    placeholder="admin@cefms.edu"
                    onChange={(event) =>
                      setLoginForm((currentForm) => ({
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
                    value={loginForm.password}
                    placeholder="Enter Password"
                    onChange={(event) =>
                      setLoginForm((currentForm) => ({
                        ...currentForm,
                        password: event.target.value
                      }))
                    }
                    required
                  />
                </div>
                <button
                  className="btn btn-brand"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleLogin()}
                >
                  {isSubmitting ? "Loading..." : "Sign In"}
                </button>
                {message ? (
                  <div className={`small mt-2 text-${messageType || "muted"}`}>{message}</div>
                ) : null}
              </div>
            ) : (
              <div className="d-grid gap-3" role="form" aria-label="Register form">
                <div>
                  <label className="form-label" htmlFor="register-name">
                    Full Name
                  </label>
                  <input
                    className="form-control"
                    id="register-name"
                    type="text"
                    value={registerForm.name}
                    placeholder="Enter your name"
                    onChange={(event) =>
                      setRegisterForm((currentForm) => ({
                        ...currentForm,
                        name: event.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="register-email">
                    Email
                  </label>
                  <input
                    className="form-control"
                    id="register-email"
                    type="email"
                    value={registerForm.email}
                    placeholder="you@example.com"
                    onChange={(event) =>
                      setRegisterForm((currentForm) => ({
                        ...currentForm,
                        email: event.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="register-role">
                    Role
                  </label>
                  <select
                    className="form-select"
                    id="register-role"
                    value={registerForm.role}
                    onChange={(event) =>
                      setRegisterForm((currentForm) => ({
                        ...currentForm,
                        role: event.target.value
                      }))
                    }
                    required
                  >
                    {REG_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div>
                    <label className="form-label" htmlFor="register-password">
                      Password
                    </label>
                    <input
                      className="form-control"
                      id="register-password"
                      type="password"
                      value={registerForm.password}
                      placeholder="Minimum 8 characters"
                      onChange={(event) =>
                        setRegisterForm((currentForm) => ({
                          ...currentForm,
                          password: event.target.value
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="register-confirm-password">
                      Confirm Password
                    </label>
                    <input
                      className="form-control"
                      id="register-confirm-password"
                      type="password"
                      value={registerForm.confirmPassword}
                      placeholder="Re-enter password"
                      onChange={(event) =>
                        setRegisterForm((currentForm) => ({
                          ...currentForm,
                          confirmPassword: event.target.value
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <button
                  className="btn btn-brand"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleRegister()}
                >
                  {isSubmitting ? "Loading..." : "Register"}
                </button>
                {message ? (
                  <div className={`small mt-2 text-${messageType || "muted"}`}>{message}</div>
                ) : null}
              </div>
            )}
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
  sponsors,
  teams,
  volunteerAssignments,
  activeView,
  setActiveView,
  showCreateEventModal,
  showEditEventModal,
  showScheduleModal,
  selectedEvent,
  eventForm,
  setEventForm,
  editEventForm,
  setEditEventForm,
  scheduleForm,
  setScheduleForm,
  resultForm,
  setResultForm,
  teamForm,
  setTeamForm,
  sponsorForm,
  setSponsorForm,
  sponsorLinkForm,
  setSponsorLinkForm,
  volunteerAssignForm,
  setVolunteerAssignForm,
  budgetEventId,
  setBudgetEventId,
  budgetData,
  budgetForm,
  setBudgetForm,
  expenseForm,
  setExpenseForm,
  isLoading,
  isBudgetLoading,
  isSubmitting,
  onRefresh,
  onLogout,
  onSelectEvent,
  onClearSelection,
  onCreateEvent,
  onCloseCreateEvent,
  onOpenCreateEvent,
  onCloseEditEvent,
  onOpenEditEvent,
  onUpdateEvent,
  onSaveSchedule,
  onCloseSchedule,
  onOpenSchedule,
  onDeleteEvent,
  onPublishResult,
  onRegister,
  onCreateTeam,
  onJoinTeam,
  onChooseVolunteerEvent,
  onAssignVolunteer,
  onCreateSponsor,
  onLinkSponsor,
  onLoadBudget,
  onSaveBudget,
  onRecordExpense
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
        onOpenEditEvent={onOpenEditEvent}
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
  } else if (activeView === "sponsors") {
    activeContent = (
      <SponsorsView
        user={user}
        sponsors={sponsors}
        events={events}
        sponsorForm={sponsorForm}
        setSponsorForm={setSponsorForm}
        sponsorLinkForm={sponsorLinkForm}
        setSponsorLinkForm={setSponsorLinkForm}
        isSubmitting={isSubmitting}
        onCreateSponsor={onCreateSponsor}
        onLinkSponsor={onLinkSponsor}
      />
    );
  } else if (activeView === "budget") {
    activeContent = (
      <BudgetView
        user={user}
        events={events}
        budgetEventId={budgetEventId}
        setBudgetEventId={setBudgetEventId}
        budgetData={budgetData}
        budgetForm={budgetForm}
        setBudgetForm={setBudgetForm}
        expenseForm={expenseForm}
        setExpenseForm={setExpenseForm}
        isBudgetLoading={isBudgetLoading}
        isSubmitting={isSubmitting}
        onLoadBudget={onLoadBudget}
        onSaveBudget={onSaveBudget}
        onRecordExpense={onRecordExpense}
      />
    );
  } else if (activeView === "volunteer") {
    activeContent = (
      <VolunteerView
        events={events}
        assignments={volunteerAssignments}
        isSubmitting={isSubmitting}
        onChooseEvent={onChooseVolunteerEvent}
      />
    );
  } else if (activeView === "volunteer-roster") {
    activeContent = (
      <VolunteerRosterView
        user={user}
        events={events}
        volunteerAssignForm={volunteerAssignForm}
        setVolunteerAssignForm={setVolunteerAssignForm}
        isSubmitting={isSubmitting}
        onAssignVolunteer={onAssignVolunteer}
      />
    );
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
            <NavTabs user={user} activeView={activeView} setActiveView={setActiveView} />
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
          title={selectedEvent ? `Edit ${selectedEvent.name}` : "Edit Event"}
          note="Update the selected event using the existing event API."
          isOpen={showEditEventModal}
          onClose={onCloseEditEvent}
        >
          <form className="form-stack" onSubmit={onUpdateEvent}>
            <input
              className="form-control"
              type="text"
              placeholder="Event name"
              value={editEventForm.name}
              onChange={(event) =>
                setEditEventForm((currentForm) => ({
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
              value={editEventForm.description}
              onChange={(event) =>
                setEditEventForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value
                }))
              }
            />
            <div className="form-row">
              <select
                className="form-select"
                value={editEventForm.type}
                onChange={(event) =>
                  setEditEventForm((currentForm) => ({
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
                value={editEventForm.max_participants}
                onChange={(event) =>
                  setEditEventForm((currentForm) => ({
                    ...currentForm,
                    max_participants: event.target.value
                  }))
                }
                required
              />
            </div>
            <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
              Save Changes
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
  const [sponsors, setSponsors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [volunteerAssignments, setVolunteerAssignments] = useState([]);
  const [activeView, setActiveView] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    role: "Participant",
    password: "",
    confirmPassword: ""
  });
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    type: "individual",
    max_participants: ""
  });
  const [editEventForm, setEditEventForm] = useState({
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
  const [sponsorForm, setSponsorForm] = useState({
    name: "",
    contact_info: "",
    contribution_amount: ""
  });
  const [sponsorLinkForm, setSponsorLinkForm] = useState({
    sponsor_id: "",
    event_id: ""
  });
  const [volunteerAssignForm, setVolunteerAssignForm] = useState({
    event_id: "",
    volunteer_id: "",
    task_description: ""
  });
  const [budgetEventId, setBudgetEventId] = useState("");
  const [budgetData, setBudgetData] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    allocated_amount: ""
  });
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    description: "",
    expense_date: ""
  });
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [flash, setFlash] = useState({
    message: "",
    type: "success"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBudgetLoading, setIsBudgetLoading] = useState(false);
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

  function syncEditEventForm(eventItem) {
    setEditEventForm({
      name: eventItem?.name || "",
      description: eventItem?.description || "",
      type: eventItem?.type || "individual",
      max_participants: eventItem?.max_participants ? String(eventItem.max_participants) : ""
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

  async function loadPublicDashboardData() {
    const [eventsPayload, schedulePayload, resultsPayload] = await Promise.all([
      apiFetch("/api/events"),
      apiFetch("/api/schedule"),
      apiFetch("/api/results")
    ]);

    setEvents(eventsPayload);
    setSchedule(schedulePayload);
    setResults(resultsPayload);

    if (selectedEvent) {
      const refreshedSelection =
        eventsPayload.find((eventItem) => eventItem.event_id === selectedEvent.event_id) || null;
      setSelectedEvent(refreshedSelection);
      syncEventForms(refreshedSelection);
      syncEditEventForm(refreshedSelection);
      await loadTeamsForEvent(refreshedSelection);
    }
  }

  async function loadVolunteerData() {
    const assignmentsPayload = await apiFetch("/api/volunteers/me");
    setVolunteerAssignments(assignmentsPayload);
  }

  async function loadSponsorData() {
    const sponsorsPayload = await apiFetch("/api/sponsors");
    setSponsors(sponsorsPayload);
  }

  async function loadBudgetDetails(eventId = budgetEventId) {
    if (!eventId) {
      setBudgetData(null);
      return;
    }

    setIsBudgetLoading(true);

    try {
      const payload = await apiFetch(`/api/budgets/${eventId}`);
      setBudgetData(payload);
      setBudgetForm({
        allocated_amount: payload.budget?.allocated_amount
          ? String(payload.budget.allocated_amount)
          : ""
      });
    } catch (error) {
      if (error.status === 404) {
        setBudgetData({
          budget: null,
          expenses: []
        });
        setBudgetForm({
          allocated_amount: ""
        });
      } else {
        throw error;
      }
    } finally {
      setIsBudgetLoading(false);
    }
  }

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const token = getStoredToken();
      const sessionPayload = token ? await apiFetch("/api/me") : { user: null };
      setUser(sessionPayload.user);
      await loadPublicDashboardData();

      if (sessionPayload.user?.role) {
        await loadSponsorData();
      } else {
        setSponsors([]);
      }

      if (sessionPayload.user?.role === "Volunteer") {
        await loadVolunteerData();
      } else {
        setVolunteerAssignments([]);
      }
    } catch (error) {
      if (error.message === "Invalid or expired token.") {
        setStoredToken(null);
        setUser(null);
        setSponsors([]);
        setVolunteerAssignments([]);
        setBudgetData(null);
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

  useEffect(() => {
    if (activeView !== "budget" || !budgetEventId || !user) {
      return;
    }

    if (!["Admin", "Coordinator"].includes(user.role)) {
      return;
    }

    loadBudgetDetails().catch((error) => {
      showFlash(error.message, "danger");
    });
  }, [activeView, budgetEventId, user]);

  async function handleLogin() {
    const currentLoginForm = {
      email: readInputValue("email", loginForm.email).trim(),
      password: readInputValue("password", loginForm.password)
    };

    setLoginForm(currentLoginForm);

    if (!currentLoginForm.email || !currentLoginForm.password) {
      showFlash("Email and password are required.", "danger");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify(currentLoginForm)
      });

      setStoredToken(payload.token);
      setUser(payload.user);
      setLoginForm({
        email: "",
        password: ""
      });
      clearFlash();
      setIsLoading(true);
      await loadPublicDashboardData();
      await loadSponsorData();
      if (payload.user.role === "Volunteer") {
        await loadVolunteerData();
      } else {
        setVolunteerAssignments([]);
      }
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }

  async function handleSignUp() {
    const currentRegisterForm = {
      name: readInputValue("register-name", registerForm.name).trim(),
      email: readInputValue("register-email", registerForm.email).trim(),
      role: readInputValue("register-role", registerForm.role),
      password: readInputValue("register-password", registerForm.password),
      confirmPassword: readInputValue("register-confirm-password", registerForm.confirmPassword)
    };

    setRegisterForm(currentRegisterForm);

    if (!currentRegisterForm.name) {
      showFlash("Full name is required.", "danger");
      return;
    }

    if (!currentRegisterForm.email) {
      showFlash("Email is required.", "danger");
      return;
    }

    if (!currentRegisterForm.role) {
      showFlash("Please select a role.", "danger");
      return;
    }

    if (!currentRegisterForm.password) {
      showFlash("Password is required.", "danger");
      return;
    }

    if (currentRegisterForm.password.length < 8) {
      showFlash("Password must be at least 8 characters long.", "danger");
      return;
    }

    if (!currentRegisterForm.confirmPassword) {
      showFlash("Please confirm your password.", "danger");
      return;
    }

    if (currentRegisterForm.password !== currentRegisterForm.confirmPassword) {
      showFlash("Passwords do not match.", "danger");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await apiFetch("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name: currentRegisterForm.name,
          email: currentRegisterForm.email,
          role: currentRegisterForm.role,
          password: currentRegisterForm.password
        })
      });

      setStoredToken(payload.token);
      setUser(payload.user);
      setRegisterForm({
        name: "",
        email: "",
        role: "Participant",
        password: "",
        confirmPassword: ""
      });
      showFlash("Registration successful. You are now signed in.");
      setIsLoading(true);
      await loadPublicDashboardData();
      await loadSponsorData();
      if (payload.user.role === "Volunteer") {
        await loadVolunteerData();
      } else {
        setVolunteerAssignments([]);
      }
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsLoading(false);
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
      setSponsors([]);
      setVolunteerAssignments([]);
      setSponsorForm({
        name: "",
        contact_info: "",
        contribution_amount: ""
      });
      setSponsorLinkForm({
        sponsor_id: "",
        event_id: ""
      });
      setVolunteerAssignForm({
        event_id: "",
        volunteer_id: "",
        task_description: ""
      });
      setBudgetForm({
        allocated_amount: ""
      });
      setExpenseForm({
        amount: "",
        description: "",
        expense_date: ""
      });
      setBudgetEventId("");
      setBudgetData(null);
      setShowEditEventModal(false);
      setShowCreateEventModal(false);
      setShowScheduleModal(false);
      setActiveView("overview");
      clearFlash();
    }
  }

  async function handleSelectEvent(eventItem) {
    setSelectedEvent(eventItem);
    syncEventForms(eventItem);
    syncEditEventForm(eventItem);
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
    syncEditEventForm(null);
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

  function handleOpenEditEvent() {
    if (!selectedEvent) {
      return;
    }

    syncEditEventForm(selectedEvent);
    setShowEditEventModal(true);
  }

  async function handleUpdateEvent(event) {
    event.preventDefault();

    if (!selectedEvent) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch(`/api/events/${selectedEvent.event_id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...editEventForm,
          max_participants: Number.parseInt(editEventForm.max_participants, 10)
        })
      });

      setShowEditEventModal(false);
      showFlash("Event updated successfully.");
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
      syncEditEventForm(null);
      setShowEditEventModal(false);
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

  async function handleChooseVolunteerEvent(eventId) {
    setIsSubmitting(true);

    try {
      await apiFetch("/api/volunteers/assign", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId
        })
      });

      showFlash("Volunteer event selected successfully.");
      await loadDashboard();
      setActiveView("volunteer");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAssignVolunteer(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch("/api/volunteers/assign", {
        method: "POST",
        body: JSON.stringify({
          event_id: Number.parseInt(volunteerAssignForm.event_id, 10),
          volunteer_id: Number.parseInt(volunteerAssignForm.volunteer_id, 10),
          task_description: volunteerAssignForm.task_description
        })
      });

      setVolunteerAssignForm({
        event_id: "",
        volunteer_id: "",
        task_description: ""
      });
      showFlash("Volunteer assigned successfully.");
      await loadDashboard();
      setActiveView("volunteer-roster");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateSponsor(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch("/api/sponsors", {
        method: "POST",
        body: JSON.stringify({
          name: sponsorForm.name,
          contact_info: sponsorForm.contact_info,
          contribution_amount:
            sponsorForm.contribution_amount === ""
              ? 0
              : Number.parseFloat(sponsorForm.contribution_amount)
        })
      });

      setSponsorForm({
        name: "",
        contact_info: "",
        contribution_amount: ""
      });
      showFlash("Sponsor created successfully.");
      await loadDashboard();
      setActiveView("sponsors");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLinkSponsor(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch(`/api/sponsors/${sponsorLinkForm.sponsor_id}/link`, {
        method: "POST",
        body: JSON.stringify({
          event_id: Number.parseInt(sponsorLinkForm.event_id, 10)
        })
      });

      showFlash("Sponsor linked successfully.");
      await loadDashboard();
      setActiveView("sponsors");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveBudget(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch(`/api/budgets/${budgetEventId}`, {
        method: "POST",
        body: JSON.stringify({
          allocated_amount: Number.parseFloat(budgetForm.allocated_amount)
        })
      });

      showFlash("Budget saved successfully.");
      await loadBudgetDetails(budgetEventId);
      await loadDashboard();
      setActiveView("budget");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecordExpense(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          event_id: Number.parseInt(budgetEventId, 10),
          amount: Number.parseFloat(expenseForm.amount),
          description: expenseForm.description,
          expense_date: expenseForm.expense_date
        })
      });

      setExpenseForm({
        amount: "",
        description: "",
        expense_date: ""
      });
      showFlash("Expense recorded successfully.");
      await loadBudgetDetails(budgetEventId);
      await loadDashboard();
      setActiveView("budget");
    } catch (error) {
      showFlash(error.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <LoginPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        handleLogin={handleLogin}
        handleRegister={handleSignUp}
        message={flash.message}
        messageType={flash.type}
        isSubmitting={isSubmitting}
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
        sponsors={sponsors}
        teams={teams}
        volunteerAssignments={volunteerAssignments}
        activeView={activeView}
        setActiveView={setActiveView}
        showCreateEventModal={showCreateEventModal}
        showEditEventModal={showEditEventModal}
        showScheduleModal={showScheduleModal}
        selectedEvent={selectedEvent}
        eventForm={eventForm}
        setEventForm={setEventForm}
        editEventForm={editEventForm}
        setEditEventForm={setEditEventForm}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        resultForm={resultForm}
        setResultForm={setResultForm}
        teamForm={teamForm}
        setTeamForm={setTeamForm}
        sponsorForm={sponsorForm}
        setSponsorForm={setSponsorForm}
        sponsorLinkForm={sponsorLinkForm}
        setSponsorLinkForm={setSponsorLinkForm}
        volunteerAssignForm={volunteerAssignForm}
        setVolunteerAssignForm={setVolunteerAssignForm}
        budgetEventId={budgetEventId}
        setBudgetEventId={setBudgetEventId}
        budgetData={budgetData}
        budgetForm={budgetForm}
        setBudgetForm={setBudgetForm}
        expenseForm={expenseForm}
        setExpenseForm={setExpenseForm}
        isLoading={isLoading}
        isBudgetLoading={isBudgetLoading}
        isSubmitting={isSubmitting}
        onRefresh={loadDashboard}
        onLogout={handleLogout}
        onSelectEvent={handleSelectEvent}
        onClearSelection={handleClearSelection}
        onCreateEvent={handleCreateEvent}
        onCloseCreateEvent={() => setShowCreateEventModal(false)}
        onOpenCreateEvent={() => setShowCreateEventModal(true)}
        onCloseEditEvent={() => setShowEditEventModal(false)}
        onOpenEditEvent={handleOpenEditEvent}
        onUpdateEvent={handleUpdateEvent}
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
        onChooseVolunteerEvent={handleChooseVolunteerEvent}
        onAssignVolunteer={handleAssignVolunteer}
        onCreateSponsor={handleCreateSponsor}
        onLinkSponsor={handleLinkSponsor}
        onLoadBudget={() => loadBudgetDetails(budgetEventId)}
        onSaveBudget={handleSaveBudget}
        onRecordExpense={handleRecordExpense}
      />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
