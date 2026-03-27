const API_BASE = "http://localhost:8080/api";
const STORAGE_KEY = "aztecmatch_user";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY);
}

async function handleLogin(event) {
  event.preventDefault();
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");

  if (!emailInput || !passwordInput || !errorEl || !submitBtn) return;

  errorEl.style.display = "none";
  errorEl.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorEl.textContent = "Please enter your email and password.";
    errorEl.style.display = "block";
    return;
  }

  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      errorEl.textContent = data.error || "Unable to log in. Please check your details.";
      errorEl.style.display = "block";
      submitBtn.disabled = false;
      return;
    }

    saveCurrentUser({
      id: data.user_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email,
      profile_complete: Boolean(data.profile_complete),
    });

    window.location.href = "dashboard.html";
  } catch (err) {
    errorEl.textContent = "Network error contacting AztecMatch. Try again.";
    errorEl.style.display = "block";
    submitBtn.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const emailInput = document.getElementById("reg-email");
  const passwordInput = document.getElementById("reg-password");
  const errorEl = document.getElementById("register-error");
  const successEl = document.getElementById("register-success");
  const submitBtn = document.getElementById("register-submit");

  if (
    !firstNameInput ||
    !lastNameInput ||
    !emailInput ||
    !passwordInput ||
    !errorEl ||
    !successEl ||
    !submitBtn
  ) {
    return;
  }

  errorEl.style.display = "none";
  errorEl.textContent = "";
  successEl.style.display = "none";
  successEl.textContent = "";

  const first_name = firstNameInput.value.trim();
  const last_name = lastNameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!email.endsWith("@sdsu.edu")) {
    errorEl.textContent = "Please use a valid SDSU email address ending in @sdsu.edu.";
    errorEl.style.display = "block";
    return;
  }

  if (!first_name || !last_name || !email || !password) {
    errorEl.textContent = "All fields are required.";
    errorEl.style.display = "block";
    return;
  }

  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name, last_name, email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      errorEl.textContent = data.error || "Unable to register. Please try again.";
      errorEl.style.display = "block";
      submitBtn.disabled = false;
      return;
    }

    successEl.textContent = "Account created! You can now log in.";
    successEl.style.display = "block";
    submitBtn.disabled = false;

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (err) {
    errorEl.textContent = "Network error contacting AztecMatch. Try again.";
    errorEl.style.display = "block";
    submitBtn.disabled = false;
  }
}

function handleLogout(event) {
  event.preventDefault();
  clearCurrentUser();
  window.location.href = "index.html";
}

function initAuthUI() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutBtn = document.getElementById("logout-btn");
  const dashboardTitle = document.getElementById("dashboard-title");

  const user = getCurrentUser();
  const isAuthPage = !!loginForm || !!registerForm;

  if (!user && !isAuthPage) {
    window.location.href = "index.html";
    return;
  }

  if (dashboardTitle && user) {
    dashboardTitle.textContent = `Welcome back, ${user.first_name} ♥`;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}

document.addEventListener("DOMContentLoaded", initAuthUI);
