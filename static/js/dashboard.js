const DASHBOARD_API_BASE = "http://localhost:8080/api";

const dashboardState = {
  currentUser: null,
  matches: [],
  selectedMatch: null,
};

function dashboardUser() {
  if (typeof getCurrentUser === "function") {
    return getCurrentUser();
  }
  return null;
}

function setDashboardError(message) {
  const errorEl = document.getElementById("dashboard-error");
  if (!errorEl) return;
  if (!message) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
    return;
  }
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInterestLabel(value) {
  if (!value) return "";
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initialsFor(name) {
  const parts = String(name || "")
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.slice(0, 2).map((item) => item[0].toUpperCase()).join("") || "?";
}

function avatarMarkup(match, className) {
  if (match.profile_picture) {
    return `<img src="${escapeHtml(match.profile_picture)}" alt="${escapeHtml(match.name)}" class="${className}">`;
  }
  return `<div class="${className}" aria-hidden="true">${escapeHtml(initialsFor(match.name))}</div>`;
}

function renderMatches() {
  const listEl = document.getElementById("matches-list");
  if (!listEl) return;

  if (!dashboardState.matches.length) {
    listEl.innerHTML = `<div class="empty-state">No matches yet. Add more interests to your profile to meet more people.</div>`;
    return;
  }

  listEl.innerHTML = dashboardState.matches
    .map((match) => {
      const shared = match.shared_interests?.length
        ? `${match.shared_interests.slice(0, 3).map(formatInterestLabel).join(", ")}`
        : "Same major match";

      return `
        <button class="match-list-card${dashboardState.selectedMatch?.id === match.id ? " active" : ""}" data-match-id="${match.id}" type="button">
          ${avatarMarkup(match, "match-list-photo")}
          <div class="match-list-copy">
            <div class="match-list-topline">
              <div>
                <div class="match-name">${escapeHtml(match.name)}</div>
                <div class="match-major">${escapeHtml(match.major || "Major not listed")}</div>
              </div>
              <span class="match-score">${escapeHtml(match.score)} pts</span>
            </div>
            <p class="match-summary">${escapeHtml(shared)}</p>
          </div>
        </button>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-match-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const matchId = Number(button.getAttribute("data-match-id"));
      const match = dashboardState.matches.find((item) => item.id === matchId);
      if (match) {
        selectMatch(match);
      }
    });
  });
}

function renderSelectedMatch() {
  const emptyState = document.getElementById("chat-empty-state");
  const panel = document.getElementById("chat-panel");
  const match = dashboardState.selectedMatch;

  if (!emptyState || !panel) return;

  if (!match) {
    emptyState.style.display = "block";
    panel.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  panel.style.display = "flex";

  const nameEl = document.getElementById("chat-match-name");
  const scoreEl = document.getElementById("chat-match-score");
  const majorEl = document.getElementById("chat-match-major");
  const bioEl = document.getElementById("chat-match-bio");
  const sharedEl = document.getElementById("chat-match-shared");
  const photoEl = document.getElementById("chat-profile-photo");

  if (nameEl) nameEl.textContent = match.name;
  if (scoreEl) scoreEl.textContent = `${match.score} pts`;
  if (majorEl) majorEl.textContent = match.major || "Major not listed";
  if (bioEl) bioEl.textContent = match.bio || "No bio yet, but you can still start the conversation.";
  if (photoEl) {
    if (match.profile_picture) {
      photoEl.src = match.profile_picture;
      photoEl.style.display = "block";
    } else {
      photoEl.removeAttribute("src");
      photoEl.style.display = "none";
    }
  }

  if (sharedEl) {
    const tags = [];
    if (match.same_major && match.major) {
      tags.push(`<span class="shared-tag">Same major</span>`);
    }
    (match.shared_interests || []).forEach((interest) => {
      tags.push(`<span class="shared-tag">${escapeHtml(formatInterestLabel(interest))}</span>`);
    });
    sharedEl.innerHTML = tags.length ? tags.join("") : `<span class="shared-tag">Potential connection</span>`;
  }
}

function renderMessages(messages) {
  const container = document.getElementById("chat-messages");
  if (!container) return;

  if (!messages.length) {
    container.innerHTML = `<div class="empty-state">No messages yet. Say hello and break the ice.</div>`;
    return;
  }

  container.innerHTML = messages
    .map((message) => {
      const mine = message.sender_id === dashboardState.currentUser.id;
      const sentAt = new Date(message.timestamp);
      const timeLabel = Number.isNaN(sentAt.getTime())
        ? ""
        : sentAt.toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

      return `
        <div class="chat-message ${mine ? "me" : "them"}">
          <div class="chat-bubble">
            <div>${escapeHtml(message.message_text)}</div>
            <div class="chat-meta">${escapeHtml(timeLabel)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  container.scrollTop = container.scrollHeight;
}

async function loadConversation(otherUserId) {
  const container = document.getElementById("chat-messages");
  if (container) {
    container.innerHTML = `<div class="empty-state">Loading conversation...</div>`;
  }

  const res = await fetch(
    `${DASHBOARD_API_BASE}/messages/${otherUserId}?user_id=${dashboardState.currentUser.id}`
  );
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Could not load messages.");
  }

  renderMessages(data.messages || []);
}

async function selectMatch(match) {
  dashboardState.selectedMatch = match;
  renderMatches();
  renderSelectedMatch();
  setDashboardError("");

  try {
    await loadConversation(match.id);
  } catch (error) {
    renderMessages([]);
    setDashboardError(error.message || "Could not load the conversation.");
  }
}

async function loadMatches() {
  const res = await fetch(`${DASHBOARD_API_BASE}/matches/${dashboardState.currentUser.id}`);
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Could not load matches.");
  }

  dashboardState.matches = Array.isArray(data.matches) ? data.matches : [];
  renderMatches();

  if (dashboardState.matches.length) {
    await selectMatch(dashboardState.matches[0]);
  } else {
    renderSelectedMatch();
  }
}

async function handleSendMessage(event) {
  event.preventDefault();
  setDashboardError("");

  if (!dashboardState.selectedMatch) {
    setDashboardError("Choose someone to message first.");
    return;
  }

  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  const message = (input?.value || "").trim();

  if (!message) {
    setDashboardError("Type a message before sending.");
    return;
  }

  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch(`${DASHBOARD_API_BASE}/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: dashboardState.currentUser.id,
        receiver_id: dashboardState.selectedMatch.id,
        message,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Could not send message.");
    }

    if (input) input.value = "";
    await loadConversation(dashboardState.selectedMatch.id);
  } catch (error) {
    setDashboardError(error.message || "Could not send the message.");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

async function initDashboard() {
  if (!document.getElementById("matches-list")) return;

  dashboardState.currentUser = dashboardUser();
  if (!dashboardState.currentUser) return;

  if (!dashboardState.currentUser.profile_complete) {
    window.location.href = "create-profile.html";
    return;
  }

  const chatForm = document.getElementById("chat-form");
  if (chatForm) {
    chatForm.addEventListener("submit", handleSendMessage);
  }

  try {
    await loadMatches();
  } catch (error) {
    setDashboardError(error.message || "Could not load the dashboard.");
  }
}

document.addEventListener("DOMContentLoaded", initDashboard);
