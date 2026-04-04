const state = {
  user: null,
  events: [],
  schedule: [],
  results: []
};

const selectors = {
  loginForm: document.getElementById("loginForm"),
  logoutButton: document.getElementById("logoutButton"),
  loginMessage: document.getElementById("loginMessage"),
  sessionName: document.getElementById("sessionName"),
  sessionRole: document.getElementById("sessionRole"),
  sessionEmail: document.getElementById("sessionEmail"),
  sessionPanel: document.getElementById("sessionPanel"),
  eventsBody: document.getElementById("eventsBody"),
  scheduleBody: document.getElementById("scheduleBody"),
  resultsBody: document.getElementById("resultsBody"),
  totalEvents: document.getElementById("totalEvents"),
  totalSchedules: document.getElementById("totalSchedules"),
  totalResults: document.getElementById("totalResults")
};

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

function formatDate(value) {
  if (!value) {
    return "TBD";
  }

  return new Date(value).toLocaleString();
}

function setMessage(message, isError = false) {
  selectors.loginMessage.textContent = message;
  selectors.loginMessage.className = isError
    ? "text-danger small mt-2"
    : "text-success small mt-2";
}

function renderSession() {
  if (!state.user) {
    selectors.sessionPanel.classList.add("hidden");
    return;
  }

  selectors.sessionPanel.classList.remove("hidden");
  selectors.sessionName.textContent = state.user.name;
  selectors.sessionRole.textContent = state.user.role;
  selectors.sessionEmail.textContent = state.user.email;
}

function renderEvents() {
  selectors.totalEvents.textContent = state.events.length;

  selectors.eventsBody.innerHTML =
    state.events
      .map(
        (event) => `
          <tr>
            <td>
              <strong>${event.name}</strong><br>
              <span class="muted-note">${event.type}</span>
            </td>
            <td>${event.creator_name}</td>
            <td>${event.max_participants}</td>
            <td>${event.venue || "TBD"}</td>
          </tr>
        `
      )
      .join("") ||
    `<tr><td colspan="4" class="text-center muted-note py-4">No events available yet.</td></tr>`;
}

function renderSchedule() {
  selectors.totalSchedules.textContent = state.schedule.length;

  selectors.scheduleBody.innerHTML =
    state.schedule
      .map(
        (item) => `
          <tr>
            <td><strong>${item.event_name}</strong></td>
            <td>${item.venue}</td>
            <td>${formatDate(item.start_time)}</td>
            <td><span class="status-pill">${item.status}</span></td>
          </tr>
        `
      )
      .join("") ||
    `<tr><td colspan="4" class="text-center muted-note py-4">Schedule has not been published yet.</td></tr>`;
}

function renderResults() {
  selectors.totalResults.textContent = state.results.length;

  selectors.resultsBody.innerHTML =
    state.results
      .map(
        (result) => `
          <tr>
            <td><strong>${result.event_name}</strong></td>
            <td>${result.winner_details}</td>
            <td>${formatDate(result.published_at)}</td>
          </tr>
        `
      )
      .join("") ||
    `<tr><td colspan="3" class="text-center muted-note py-4">Results will appear here after publication.</td></tr>`;
}

async function loadDashboard() {
  const [sessionPayload, eventsPayload, schedulePayload, resultsPayload] =
    await Promise.all([
      apiFetch("/api/me"),
      apiFetch("/api/events"),
      apiFetch("/api/schedule"),
      apiFetch("/api/results")
    ]);

  state.user = sessionPayload.user;
  state.events = eventsPayload;
  state.schedule = schedulePayload;
  state.results = resultsPayload;

  renderSession();
  renderEvents();
  renderSchedule();
  renderResults();
}

selectors.loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(selectors.loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const payload = await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    state.user = payload.user;
    renderSession();
    setMessage("Login successful.");
    selectors.loginForm.reset();
  } catch (error) {
    setMessage(error.message, true);
  }
});

selectors.logoutButton?.addEventListener("click", async () => {
  try {
    await apiFetch("/api/logout", {
      method: "POST"
    });

    state.user = null;
    renderSession();
    setMessage("You have been logged out.");
  } catch (error) {
    setMessage(error.message, true);
  }
});

loadDashboard().catch((error) => {
  setMessage(error.message, true);
});
