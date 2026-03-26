const API_BASE = "http://localhost:8080/api";
const STORAGE_KEY = "aztecmatch_user";
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;

function mergeStoredUser(updates) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const cur = raw ? JSON.parse(raw) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...updates }));
  } catch {
    /* ignore */
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function readPictureInput(inputEl) {
  if (!inputEl || !inputEl.files || !inputEl.files[0]) return null;
  const file = inputEl.files[0];
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, or similar).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be about 2.5MB or smaller.");
  }
  return fileToDataUrl(file);
}

async function saveProfilePayload(payload) {
  const res = await fetch(`${API_BASE}/profile/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "Could not read the server response. Make sure the API is running (python app.py on port 8080)."
    );
  }
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Could not save profile.");
  }
  if (data.user) {
    mergeStoredUser({ profile_complete: Boolean(data.user.profile_complete) });
  }
  return data;
}

async function initCreateProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const form = document.getElementById("profile-create-form");
  const errorEl = document.getElementById("profile-create-error");
  const preview = document.getElementById("profile-photo-preview");
  const fileInput = document.getElementById("profile-photo");

  if (!form || !errorEl) return;

  let userId = Number(user.id);
  let existingProfilePicture = null; // Store existing picture for edits

  /* Attach handlers before any await — otherwise a fast "Save" triggers a real form GET and reloads the page with nothing saved. */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    errorEl.style.display = "none";
    errorEl.textContent = "";
    userId = Number(user?.id);
    if (!userId || Number.isNaN(userId)) {
      errorEl.textContent = "Your session looks invalid. Please log out and sign in again.";
      errorEl.style.display = "block";
      return;
    }

    const gender = (document.getElementById("gender") || {}).value;
    const ageRaw = (document.getElementById("age") || {}).value;
    const height = ((document.getElementById("height") || {}).value || "").trim();
    const status = (document.getElementById("status") || {}).value;
    const major = ((document.getElementById("major") || {}).value || "").trim();
    const interests = ((document.getElementById("interests") || {}).value || "").trim();
    const bio = ((document.getElementById("bio") || {}).value || "").trim();

    let profile_picture = null;
    try {
      profile_picture = await readPictureInput(fileInput);
    } catch (err) {
      errorEl.textContent = err.message || "Invalid profile photo.";
      errorEl.style.display = "block";
      return;
    }

    if (!gender || !height || !status) {
      errorEl.textContent = "Gender, height, and status are required.";
      errorEl.style.display = "block";
      return;
    }

    if (!ageRaw) {
      errorEl.textContent = "Please enter your age.";
      errorEl.style.display = "block";
      return;
    }

    const age = parseInt(ageRaw, 10);
    if (Number.isNaN(age) || age < 13 || age > 120) {
      errorEl.textContent = "Age must be between 13 and 120.";
      errorEl.style.display = "block";
      return;
    }

    // Use existing profile picture if no new one was selected
    if (!profile_picture && existingProfilePicture) {
      profile_picture = existingProfilePicture;
    }

    if (!profile_picture) {
      errorEl.textContent = "Please add a profile picture.";
      errorEl.style.display = "block";
      return;
    }

    const submitBtn = document.getElementById("profile-create-submit");
    if (submitBtn) submitBtn.disabled = true;

    try {
      await saveProfilePayload({
        user_id: userId,
        gender,
        age,
        height,
        status,
        major: major || null,
        interests: interests || null,
        bio: bio || null,
        profile_picture,
      });
      window.location.href = "profile.html";
    } catch (err) {
      errorEl.textContent = err.message || "Something went wrong.";
      errorEl.style.display = "block";
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  if (fileInput && preview) {
    preview.addEventListener("load", () => {
      preview.hidden = false;
      const ph = document.getElementById("profile-photo-placeholder");
      if (ph) ph.style.display = "none";
    });
    fileInput.addEventListener("change", async () => {
      errorEl.style.display = "none";
      preview.removeAttribute("src");
      preview.hidden = true;
      const ph = document.getElementById("profile-photo-placeholder");
      if (ph) ph.style.display = "block";
      try {
        const url = await readPictureInput(fileInput);
        if (url) preview.src = url;
      } catch (e) {
        errorEl.textContent = e.message || "Invalid image.";
        errorEl.style.display = "block";
        fileInput.value = "";
      }
    });
  }

  // Fetch existing profile and populate form for editing
  try {
    const res = await fetch(`${API_BASE}/profile/${userId}`);
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      const u = data.user;
      
      // Store existing profile picture for potential reuse
      if (u.profile_picture) {
        existingProfilePicture = u.profile_picture;
        preview.src = u.profile_picture;
        preview.hidden = false;
        const ph = document.getElementById("profile-photo-placeholder");
        if (ph) ph.style.display = "none";
      }
      
      // Populate form fields with existing data
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val != null && val !== "") el.value = val;
      };
      setVal("gender", u.gender);
      setVal("age", u.age);
      setVal("height", u.height);
      setVal("status", u.status);
      setVal("major", u.major);
      setVal("interests", u.interests);
      setVal("bio", u.bio);
      
      // Update heading and button text for edit mode
      const heading = document.querySelector(".page-heading h1");
      if (heading) heading.textContent = "Edit your profile";
      const submitBtn = document.getElementById("profile-create-submit");
      if (submitBtn) submitBtn.textContent = "Update Profile";
    }
  } catch {
    /* stay on create form with empty fields */
  }
}

async function initMyProfile() {
  console.log("initMyProfile starting...");
  const user = getCurrentUser();
  console.log("Current user from localStorage:", user);
  
  const viewEl = document.getElementById("profile-view");
  const formEl = document.getElementById("profile-edit-form");
  const errorEl = document.getElementById("profile-edit-error");
  const editBtn = document.getElementById("profile-edit-btn");
  const cancelBtn = document.getElementById("profile-cancel-btn");
  const preview = document.getElementById("profile-edit-photo-preview");
  const fileInput = document.getElementById("profile-edit-photo");

  if (!user) {
    console.error("No user logged in");
    if (errorEl) {
      errorEl.textContent = "You are not logged in. Please log in first.";
      errorEl.style.display = "block";
    }
    if (viewEl) viewEl.style.display = "block";
    if (formEl) formEl.style.display = "none";
    return;
  }

  if (!viewEl || !formEl) {
    console.error("Required elements not found", { viewEl, formEl });
    return;
  }

  let loaded = null;

  try {
    console.log("Fetching profile for user ID:", user.id);
    const res = await fetch(`${API_BASE}/profile/${user.id}`);
    console.log("API response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    console.log("API response data:", data);
    if (!data.success || !data.user) {
      throw new Error(data.error || "Could not load profile.");
    }
    loaded = data.user;
    console.log("Loaded user data:", loaded);
  } catch (e) {
    console.error("Profile load error:", e);
    if (errorEl) {
      errorEl.textContent = e.message || "Could not load profile. Make sure the server is running.";
      errorEl.style.display = "block";
    }
    // still show the view section with whatever data we have
    viewEl.style.display = "block";
    formEl.style.display = "none";
    return;
  }

  function fillView(u) {
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val != null && val !== "" ? String(val) : "—";
    };
    const img = document.getElementById("profile-view-photo");
    if (img) {
      if (u.profile_picture) {
        img.src = u.profile_picture;
        img.style.display = "block";
      } else {
        img.removeAttribute("src");
        img.style.display = "none";
      }
    }
    setText("pv-name", `${u.first_name} ${u.last_name}`);
    setText("pv-email", u.email);
    setText("pv-gender", u.gender);
    setText("pv-age", u.age);
    setText("pv-height", u.height);
    setText("pv-status", u.status);
    setText("pv-major", u.major);
    setText("pv-interests", u.interests);
    setText("pv-bio", u.bio);
  }

  function fillForm(u) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val != null ? val : "";
    };
    setVal("edit-gender", u.gender);
    setVal("edit-age", u.age);
    setVal("edit-height", u.height);
    setVal("edit-status", u.status);
    setVal("edit-major", u.major);
    setVal("edit-interests", u.interests);
    setVal("edit-bio", u.bio);
    if (preview) {
      if (u.profile_picture) {
        preview.src = u.profile_picture;
        preview.style.display = "block";
      } else {
        preview.removeAttribute("src");
        preview.style.display = "none";
      }
    }
    if (fileInput) fileInput.value = "";
  }

  fillView(loaded);
  fillForm(loaded);
  console.log("fillView and fillForm completed");

  // always show the view section with data
  viewEl.style.display = "block";
  
  // if profile is incomplete, also show the edit form below
  if (loaded.profile_complete) {
    formEl.style.display = "none";
  } else {
    formEl.style.display = "flex";
    if (editBtn) editBtn.style.display = "none";
  }

  if (fileInput && preview) {
    fileInput.addEventListener("change", async () => {
      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }
      try {
        const url = await readPictureInput(fileInput);
        if (url) {
          preview.src = url;
          preview.style.display = "block";
        }
      } catch (e) {
        if (errorEl) {
          errorEl.textContent = e.message || "Invalid image.";
          errorEl.style.display = "block";
        }
        fileInput.value = "";
      }
    });
  }

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      fillForm(loaded);
      viewEl.style.display = "none";
      formEl.style.display = "flex";
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (!loaded.profile_complete) {
        window.location.href = "dashboard.html";
        return;
      }
      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }
      fillForm(loaded);
      viewEl.style.display = "block";
      formEl.style.display = "none";
    });
  }

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) {
      errorEl.style.display = "none";
      errorEl.textContent = "";
    }

    const gender = (document.getElementById("edit-gender") || {}).value;
    const ageRaw = (document.getElementById("edit-age") || {}).value;
    const height = ((document.getElementById("edit-height") || {}).value || "").trim();
    const status = (document.getElementById("edit-status") || {}).value;
    const major = ((document.getElementById("edit-major") || {}).value || "").trim();
    const interests = ((document.getElementById("edit-interests") || {}).value || "").trim();
    const bio = ((document.getElementById("edit-bio") || {}).value || "").trim();

    let profile_picture = loaded.profile_picture;
    try {
      const newPic = await readPictureInput(fileInput);
      if (newPic) profile_picture = newPic;
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || "Invalid image.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (!gender || !height || !status) {
      if (errorEl) {
        errorEl.textContent = "Gender, height, and status are required.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (!ageRaw) {
      if (errorEl) {
        errorEl.textContent = "Please enter your age.";
        errorEl.style.display = "block";
      }
      return;
    }

    const age = parseInt(ageRaw, 10);
    if (Number.isNaN(age) || age < 13 || age > 120) {
      if (errorEl) {
        errorEl.textContent = "Age must be between 13 and 120.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (!profile_picture) {
      if (errorEl) {
        errorEl.textContent = "Please add a profile picture.";
        errorEl.style.display = "block";
      }
      return;
    }

    const submitBtn = document.getElementById("profile-save-btn");
    if (submitBtn) submitBtn.disabled = true;

    try {
      const data = await saveProfilePayload({
        user_id: user.id,
        gender,
        age,
        height,
        status,
        major: major || null,
        interests: interests || null,
        bio: bio || null,
        profile_picture,
      });
      loaded = data.user;
      fillView(loaded);
      fillForm(loaded);
      viewEl.style.display = "block";
      formEl.style.display = "none";
      if (editBtn) editBtn.style.display = "inline-flex";
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || "Could not save.";
        errorEl.style.display = "block";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("profile.js DOMContentLoaded fired");
  console.log("Current URL:", window.location.href);
  console.log("profile-create-form exists:", !!document.getElementById("profile-create-form"));
  console.log("profile-edit-form exists:", !!document.getElementById("profile-edit-form"));
  
  // check if opened as file:// which won't work
  if (window.location.protocol === "file:") {
    const errorEl = document.getElementById("profile-edit-error") || document.getElementById("profile-create-error");
    if (errorEl) {
      errorEl.textContent = "ERROR: Open this page through http://localhost:8080/profile.html - not as a file!";
      errorEl.style.display = "block";
    }
    alert("Please open this page through http://localhost:8080/profile.html");
    return;
  }
  
  if (document.getElementById("profile-create-form")) {
    initCreateProfile();
  }
  if (document.getElementById("profile-edit-form")) {
    initMyProfile();
  }
});
