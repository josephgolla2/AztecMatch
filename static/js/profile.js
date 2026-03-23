const API_BASE = "http://localhost:8080/api";
const STORAGE_KEY = "aztecmatch_user";
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mergeStoredUser(updates) {
  const existing = getStoredUser() || {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
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
  if (!inputEl || !inputEl.files || !inputEl.files[0]) {
    return null;
  }
  const file = inputEl.files[0];
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be about 2.5MB or smaller.");
  }
  return fileToDataUrl(file);
}

function setError(el, message) {
  if (!el) {
    return;
  }
  el.textContent = message || "";
  el.style.display = message ? "block" : "none";
}

async function saveProfile(payload) {
  const response = await fetch(`${API_BASE}/profile/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Could not save profile.");
  }
  mergeStoredUser({ profile_complete: Boolean(data.user?.profile_complete) });
  return data.user;
}

function fillProfilePreview(user) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value != null && value !== "" ? String(value) : "-";
    }
  };

  const image = document.getElementById("profile-view-photo");
  if (image) {
    if (user.profile_picture) {
      image.src = user.profile_picture;
      image.style.display = "block";
    } else {
      image.removeAttribute("src");
      image.style.display = "none";
    }
  }

  setText("pv-name", `${user.first_name || ""} ${user.last_name || ""}`.trim());
  setText("pv-email", user.email);
  setText("pv-gender", user.gender);
  setText("pv-age", user.age);
  setText("pv-height", user.height);
  setText("pv-status", user.status);
  setText("pv-major", user.major);
  setText("pv-interests", user.interests);
  setText("pv-bio", user.bio);
}

function fillProfileForm(user) {
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = value != null ? value : "";
    }
  };

  setValue("edit-gender", user.gender);
  setValue("edit-age", user.age);
  setValue("edit-height", user.height);
  setValue("edit-status", user.status);
  setValue("edit-major", user.major);
  setValue("edit-interests", user.interests);
  setValue("edit-bio", user.bio);
}

async function initCreateProfilePage() {
  const user = getStoredUser();
  const form = document.getElementById("profile-create-form");
  if (!user || !form) {
    return;
  }

  const errorEl = document.getElementById("profile-create-error");
  const photoInput = document.getElementById("profile-photo");
  const photoPreview = document.getElementById("profile-photo-preview");
  const photoPlaceholder = document.getElementById("profile-photo-placeholder");

  if (photoInput && photoPreview) {
    photoInput.addEventListener("change", async () => {
      setError(errorEl, "");
      try {
        const url = await readPictureInput(photoInput);
        if (url) {
          photoPreview.src = url;
          photoPreview.hidden = false;
          if (photoPlaceholder) {
            photoPlaceholder.style.display = "none";
          }
        }
      } catch (error) {
        photoInput.value = "";
        photoPreview.hidden = true;
        photoPreview.removeAttribute("src");
        if (photoPlaceholder) {
          photoPlaceholder.style.display = "block";
        }
        setError(errorEl, error.message || "Invalid image.");
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setError(errorEl, "");

    const userId = Number(user.id);
    const gender = (document.getElementById("gender") || {}).value;
    const ageRaw = (document.getElementById("age") || {}).value;
    const height = ((document.getElementById("height") || {}).value || "").trim();
    const status = (document.getElementById("status") || {}).value;
    const major = ((document.getElementById("major") || {}).value || "").trim();
    const interests = ((document.getElementById("interests") || {}).value || "").trim();
    const bio = ((document.getElementById("bio") || {}).value || "").trim();

    let profilePicture = null;
    try {
      profilePicture = await readPictureInput(photoInput);
    } catch (error) {
      setError(errorEl, error.message || "Invalid profile picture.");
      return;
    }

    if (!userId || Number.isNaN(userId)) {
      setError(errorEl, "Your session is invalid. Log out and log in again.");
      return;
    }
    if (!gender || !height || !status) {
      setError(errorEl, "Gender, height, and status are required.");
      return;
    }

    const age = parseInt(ageRaw, 10);
    if (Number.isNaN(age) || age < 13 || age > 120) {
      setError(errorEl, "Age must be between 13 and 120.");
      return;
    }
    if (!profilePicture) {
      setError(errorEl, "Please add a profile picture.");
      return;
    }

    const submitBtn = document.getElementById("profile-create-submit");
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      await saveProfile({
        user_id: userId,
        gender,
        age,
        height,
        status,
        major: major || null,
        interests: interests || null,
        bio: bio || null,
        profile_picture: profilePicture,
      });
      window.location.href = "profile.html";
    } catch (error) {
      setError(errorEl, error.message || "Could not save profile.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
}

async function initProfilePage() {
  const user = getStoredUser();
  const viewEl = document.getElementById("profile-view");
  const formEl = document.getElementById("profile-edit-form");
  if (!user || !viewEl || !formEl) {
    return;
  }

  const errorEl = document.getElementById("profile-edit-error");
  const editBtn = document.getElementById("profile-edit-btn");
  const cancelBtn = document.getElementById("profile-cancel-btn");
  const photoInput = document.getElementById("profile-edit-photo");
  const photoPreview = document.getElementById("profile-edit-photo-preview");

  let loadedUser = null;
  let selectedPicture = null;

  try {
    const response = await fetch(`${API_BASE}/profile/${user.id}`);
    const data = await response.json();
    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.error || "Could not load profile.");
    }
    loadedUser = data.user;
  } catch (error) {
    setError(errorEl, error.message || "Could not load profile.");
    return;
  }

  const showViewMode = () => {
    fillProfilePreview(loadedUser);
    viewEl.style.display = "block";
    formEl.style.display = "none";
    if (editBtn) {
      editBtn.style.display = "inline-flex";
    }
  };

  const showEditMode = () => {
    fillProfileForm(loadedUser);
    formEl.style.display = "flex";
    viewEl.style.display = "none";
  };

  if (loadedUser.profile_complete) {
    showViewMode();
  } else {
    showEditMode();
    if (editBtn) {
      editBtn.style.display = "none";
    }
  }

  if (photoInput && photoPreview) {
    if (loadedUser.profile_picture) {
      photoPreview.src = loadedUser.profile_picture;
      photoPreview.style.display = "block";
    }
    photoInput.addEventListener("change", async () => {
      setError(errorEl, "");
      try {
        selectedPicture = await readPictureInput(photoInput);
        if (selectedPicture) {
          photoPreview.src = selectedPicture;
          photoPreview.style.display = "block";
        }
      } catch (error) {
        selectedPicture = null;
        photoInput.value = "";
        setError(errorEl, error.message || "Invalid image.");
      }
    });
  }

  if (editBtn) {
    editBtn.addEventListener("click", showEditMode);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (loadedUser.profile_complete) {
        showViewMode();
      } else {
        window.location.href = "dashboard.html";
      }
    });
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError(errorEl, "");

    const gender = (document.getElementById("edit-gender") || {}).value;
    const ageRaw = (document.getElementById("edit-age") || {}).value;
    const height = ((document.getElementById("edit-height") || {}).value || "").trim();
    const status = (document.getElementById("edit-status") || {}).value;
    const major = ((document.getElementById("edit-major") || {}).value || "").trim();
    const interests = ((document.getElementById("edit-interests") || {}).value || "").trim();
    const bio = ((document.getElementById("edit-bio") || {}).value || "").trim();

    if (!gender || !height || !status) {
      setError(errorEl, "Gender, height, and status are required.");
      return;
    }
    const age = parseInt(ageRaw, 10);
    if (Number.isNaN(age) || age < 13 || age > 120) {
      setError(errorEl, "Age must be between 13 and 120.");
      return;
    }

    const profilePicture = selectedPicture || loadedUser.profile_picture;
    if (!profilePicture) {
      setError(errorEl, "Please add a profile picture.");
      return;
    }

    const saveBtn = document.getElementById("profile-save-btn");
    if (saveBtn) {
      saveBtn.disabled = true;
    }

    try {
      loadedUser = await saveProfile({
        user_id: Number(user.id),
        gender,
        age,
        height,
        status,
        major: major || null,
        interests: interests || null,
        bio: bio || null,
        profile_picture: profilePicture,
      });
      selectedPicture = null;
      if (photoInput) {
        photoInput.value = "";
      }
      showViewMode();
    } catch (error) {
      setError(errorEl, error.message || "Could not save profile.");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("profile-create-form")) {
    initCreateProfilePage();
  }
  if (document.getElementById("profile-edit-form")) {
    initProfilePage();
  }
});
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

  try {
    const res = await fetch(`${API_BASE}/profile/${userId}`);
    const data = await res.json();
    if (res.ok && data.success && data.user && data.user.profile_complete) {
      window.location.href = "profile.html";
    }
  } catch {
    /* stay on create form */
  }
}

async function initMyProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const viewEl = document.getElementById("profile-view");
  const formEl = document.getElementById("profile-edit-form");
  const errorEl = document.getElementById("profile-edit-error");
  const editBtn = document.getElementById("profile-edit-btn");
  const cancelBtn = document.getElementById("profile-cancel-btn");
  const preview = document.getElementById("profile-edit-photo-preview");
  const fileInput = document.getElementById("profile-edit-photo");

  if (!viewEl || !formEl) return;

  let loaded = null;

  try {
    const res = await fetch(`${API_BASE}/profile/${user.id}`);
    const data = await res.json();
    if (!res.ok || !data.success || !data.user) {
      throw new Error(data.error || "Could not load profile.");
    }
    loaded = data.user;
  } catch (e) {
    if (errorEl) {
      errorEl.textContent = e.message || "Could not load profile.";
      errorEl.style.display = "block";
    }
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

  if (loaded.profile_complete) {
    viewEl.style.display = "block";
    formEl.style.display = "none";
  } else {
    viewEl.style.display = "none";
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
  if (document.getElementById("profile-create-form")) {
    initCreateProfile();
  }
  if (document.getElementById("profile-edit-form")) {
    initMyProfile();
  }
});
