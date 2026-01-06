/***********************
 * SCREEN REFERENCES
 ***********************/
const homeScreen = document.getElementById("home-screen");
const formScreen = document.getElementById("form-screen");

const syncBtn = document.getElementById("syncBtn");
const offlineCountEl = document.getElementById("offlineCount");
const offlineListEl = document.getElementById("offlineList");

const staffInput = document.getElementById("staffInitials");
const saveInitialsBtn = document.getElementById("saveInitialsBtn");

const photoInput = document.getElementById("studentPhoto");
const photoPreview = document.getElementById("photoPreview");

const API_URL = "https://script.google.com/macros/s/AKfycbyCz6NTz7LQv3i548TlkbxU8kZaDh_sq5ymyiT2-cWknNZEDA9sBK8kg1iuWD1yMis/exec";

let photoBase64 = null;

/***********************
 * STAFF INITIALS
 ***********************/
const savedInitials = localStorage.getItem("staffInitials");
if (savedInitials) {
  staffInput.value = savedInitials;
}

saveInitialsBtn.onclick = () => {
  if (!staffInput.value.trim()) {
    alert("Please enter staff initials.");
    return;
  }
  localStorage.setItem("staffInitials", staffInput.value.toUpperCase());
  alert("Staff initials saved.");
};

/***********************
 * SCREEN NAVIGATION
 ***********************/
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

/***********************
 * PHOTO CAPTURE
 ***********************/
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

/***********************
 * OFFLINE STORAGE HELPERS
 ***********************/
function getRecords() {
  return JSON.parse(localStorage.getItem("applications")) || [];
}

function saveRecords(records) {
  localStorage.setItem("applications", JSON.stringify(records));
}

function updateOfflineCount() {
  const records = getRecords();
  offlineCountEl.textContent = "Offline Applications: " + records.length;
}

function renderOfflineList() {
  offlineListEl.innerHTML = "";
  const records = getRecords();

  records.forEach(rec => {
    const li = document.createElement("li");
    li.textContent = `${rec.Application_ID} – ${rec.Last_Name}, ${rec.First_Name}`;
    offlineListEl.appendChild(li);
  });
}

/***********************
 * SAVE APPLICATION (OFFLINE FIRST)
 ***********************/
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

  data.Application_ID = `NCE-2027-${initials}-${randomCode}`;
  data.Timestamp = new Date().toISOString();
  data.Submission_Status = "Offline";
  data.Student_Photo_Base64 = photoBase64;

  const records = getRecords();
  records.push(data);
  saveRecords(records);

  updateOfflineCount();
  renderOfflineList();

  if (navigator.onLine) {
    alert("Application saved. Tap Sync Now to upload.");
  } else {
    alert("Application saved offline. Will upload when connected.");
  }

  form.reset();
  photoBase64 = null;
  photoInput.value = "";
  photoPreview.style.display = "none";

  formScreen.hidden = true;
  homeScreen.hidden = false;
};

/***********************
 * SYNC LOGIC (CORS-SAFE)
 ***********************/
syncBtn.onclick = async () => {
  const records = getRecords();
  if (records.length === 0) {
    alert("No offline applications to sync.");
    return;
  }

  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";

  const remaining = [];

  for (const record of records) {
    try {
      // 1️⃣ Upload photo (NO-CORS, fire-and-forget)
      if (!record.Student_Photo_Base64) {
  console.warn("Skipping record without photo:", record.Application_ID);
  remaining.push(record);
  continue;
}

const base64Data = record.Student_Photo_Base64.split(",")[1];


      await fetch(API_URL + "?action=uploadPhoto", {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          file: base64Data,
          filename: record.Application_ID + ".jpg"
        })
      });

      // 2️⃣ Upload form data
      delete record.Student_Photo_Base64;
      record.Submission_Status = "Uploaded";
      record.Student_Photo_URL = "See Drive folder";

     await fetch(API_URL, {
  method: "POST",
  mode: "no-cors",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(record)
});


    } catch (err) {
      console.error(err);
      remaining.push(record);
    }
  }

  saveRecords(remaining);
  updateOfflineCount();
  renderOfflineList();

  syncBtn.disabled = false;
  syncBtn.textContent = "Sync Now";

  if (remaining.length === 0) {
    alert("All applications uploaded successfully.");
  } else {
    alert("Some applications failed. You can retry syncing.");
  }
};

/***********************
 * ONLINE / OFFLINE UI
 ***********************/
window.addEventListener("online", () => {
  syncBtn.hidden = false;
});

window.addEventListener("offline", () => {
  syncBtn.hidden = true;
});

/***********************
 * INITIAL LOAD
 ***********************/
updateOfflineCount();
renderOfflineList();
syncBtn.hidden = !navigator.onLine;


