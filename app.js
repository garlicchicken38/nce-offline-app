const homeScreen = document.getElementById("home-screen");
const formScreen = document.getElementById("form-screen");

const staffInput = document.getElementById("staffInitials");
const saveInitialsBtn = document.getElementById("saveInitialsBtn");

const photoInput = document.getElementById("studentPhoto");
const photoPreview = document.getElementById("photoPreview");

const syncBtn = document.getElementById("syncBtn");
const API_URL = "https://script.google.com/macros/s/AKfycbyCz6NTz7LQv3i548TlkbxU8kZaDh_sq5ymyiT2-cWknNZEDA9sBK8kg1iuWD1yMis/exec";

function updateOfflineCount() {
  const records = JSON.parse(localStorage.getItem("applications")) || [];
  document.getElementById("offlineCount").textContent =
    "Offline Applications: " + records.length;
}


let photoBase64 = null;

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    photoBase64 = reader.result;
    photoPreview.src = photoBase64;
    photoPreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// Load saved initials
const savedInitials = localStorage.getItem("staffInitials");
if (savedInitials) {
  staffInput.value = savedInitials;
}

// Save initials
saveInitialsBtn.onclick = () => {
  if (staffInput.value.trim() === "") {
    alert("Please enter staff initials.");
    return;
  }
  localStorage.setItem("staffInitials", staffInput.value.toUpperCase());
  alert("Staff initials saved.");
};

// Screen switching
document.getElementById("newAppBtn").onclick = () => {
  if (!localStorage.getItem("staffInitials")) {
    alert("Please set staff initials first.");
    return;
  }
  homeScreen.hidden = true;
  formScreen.hidden = false;
};

document.getElementById("backBtn").onclick = () => {
  formScreen.hidden = true;
  homeScreen.hidden = false;
};

document.getElementById("saveBtn").onclick = () => {
  const form = document.getElementById("applicationForm");
  if (!form.checkValidity()) {
  alert("Please complete all required fields.");
  return;
}

if (!photoBase64) {
  alert("Student photo is required.");
  return;
}


  const data = Object.fromEntries(new FormData(form).entries());

  const initials = localStorage.getItem("staffInitials");
  const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

  data.Application_ID = `NCE-2026-${initials}-${randomCode}`;
  data.Submission_Status = "Offline";
  data.Timestamp = new Date().toISOString();

  let records = JSON.parse(localStorage.getItem("applications")) || [];
  data.Student_Photo_Base64 = photoBase64;
records.push(data);

  localStorage.setItem("applications", JSON.stringify(records));

  updateOfflineCount();
  renderOfflineList();


  alert("Application saved offline.");

  form.reset();

  photoBase64 = null;
  photoInput.value = "";
  photoPreview.style.display = "none";

  formScreen.hidden = true;
  homeScreen.hidden = false;
};

syncBtn.onclick = async () => {
  let records = JSON.parse(localStorage.getItem("applications")) || [];
  if (records.length === 0) {
    alert("No offline applications to sync.");
    return;
  }

  syncBtn.textContent = "Syncing...";
  syncBtn.disabled = true;

  let remaining = [];

  for (let record of records) {
    try {
      // 1. Upload photo
      const base64Data = record.Student_Photo_Base64.split(",")[1];

      const photoResponse = await fetch(API_URL + "?action=uploadPhoto", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          file: base64Data,
          filename: `${record.Application_ID}.jpg`
        })
      });

      const photoResult = await photoResponse.json();
      record.Student_Photo_URL = photoResult.photoUrl;

      // 2. Upload form data
      record.Submission_Status = "Uploaded";
      delete record.Student_Photo_Base64;

      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(record)
      });

    } catch (err) {
      console.error(err);
      remaining.push(record);
    }
  }

  localStorage.setItem("applications", JSON.stringify(remaining));
  updateOfflineCount();
  renderOfflineList();

  syncBtn.textContent = "Sync Now";
  syncBtn.disabled = false;

  if (remaining.length === 0) {
    alert("All applications uploaded successfully.");
  } else {
    alert("Some applications failed. You can retry syncing.");
  }
};


window.addEventListener("online", () => {
  syncBtn.hidden = false;
});

window.addEventListener("offline", () => {
  syncBtn.hidden = true;
});

updateOfflineCount();

function renderOfflineList() {
  const list = document.getElementById("offlineList");
  list.innerHTML = "";

  const records = JSON.parse(localStorage.getItem("applications")) || [];

  records.forEach((record, index) => {
    const li = document.createElement("li");
    li.textContent = `${record.Application_ID} – ${record.Last_Name}, ${record.First_Name}`;
    list.appendChild(li);
  });
}

renderOfflineList();





