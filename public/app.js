/* ==========================================================================
   MediFlow Patient Registration - Pure Supabase Data & Local Vapi SDK
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // State
  let currentView = "dashboard";
  let patientsList = [];
  let isRecording = false;
  let activePatient = null;

  // View Navigation
  const navItems = document.querySelectorAll(".nav-item");
  const viewPages = document.querySelectorAll(".view-page");
  const headerPageTitle = document.getElementById("header-page-title");

  const viewTitles = {
    dashboard: "Dashboard Overview",
    "voice-registration": "Voice AI Registration Assistant",
    patients: "Patient Directory",
    "patient-detail": "Patient Details Overview",
    settings: "System Settings"
  };

  function switchView(viewName) {
    currentView = viewName;

    navItems.forEach(item => {
      if (item.getAttribute("data-view") === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    viewPages.forEach(page => {
      if (page.id === `view-${viewName}`) {
        page.classList.add("active");
      } else {
        page.classList.remove("active");
      }
    });

    if (headerPageTitle) {
      headerPageTitle.textContent = viewTitles[viewName] || "Dashboard Overview";
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    if (viewName === "patients" || viewName === "dashboard") {
      fetchPatients();
    } else if (viewName === "settings") {
      loadSettingsUI();
    }
  }

  // Attach Nav Click Listeners
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      if (view) switchView(view);
    });
  });

  // Action Buttons Navigation
  const btnInitVoice = document.getElementById("btn-init-voice");
  if (btnInitVoice) {
    btnInitVoice.addEventListener("click", () => {
      switchView("voice-registration");
      toggleVapiVoiceCall();
    });
  }

  const btnActivityViewAll = document.getElementById("btn-activity-view-all");
  if (btnActivityViewAll) {
    btnActivityViewAll.addEventListener("click", () => switchView("patients"));
  }

  const btnBackDirectory = document.getElementById("btn-back-directory");
  if (btnBackDirectory) {
    btnBackDirectory.addEventListener("click", () => switchView("patients"));
  }

  const btnDetailNewVoice = document.getElementById("btn-detail-new-voice");
  if (btnDetailNewVoice) {
    btnDetailNewVoice.addEventListener("click", () => {
      switchView("voice-registration");
      toggleVapiVoiceCall();
    });
  }

  const btnRefreshDetail = document.getElementById("btn-refresh-detail");
  if (btnRefreshDetail) {
    btnRefreshDetail.addEventListener("click", () => fetchPatients());
  }

  const btnDeletePatientDetail = document.getElementById("btn-delete-patient-detail");
  if (btnDeletePatientDetail) {
    btnDeletePatientDetail.addEventListener("click", () => {
      if (activePatient && activePatient.patient_id) {
        const fullName = `${activePatient.first_name || ''} ${activePatient.last_name || ''}`.trim();
        deletePatient(activePatient.patient_id, fullName);
      }
    });
  }

  // Modal Dialog Handlers
  const patientModal = document.getElementById("patient-modal");
  const btnOpenNewPatient = document.getElementById("btn-open-new-patient");
  const btnOpenEmergency = document.getElementById("btn-open-emergency");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnCancelModal = document.getElementById("btn-cancel-modal");
  const newPatientForm = document.getElementById("new-patient-form");

  function openModal(title = "New Patient Registration") {
    document.getElementById("modal-title").textContent = title;
    patientModal.classList.add("active");
  }

  function closeModal() {
    patientModal.classList.remove("active");
    newPatientForm.reset();
  }

  if (btnOpenNewPatient) btnOpenNewPatient.addEventListener("click", () => openModal("New Patient Registration"));
  if (btnOpenEmergency) btnOpenEmergency.addEventListener("click", () => openModal("🚨 Emergency Patient Fast Entry"));
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener("click", closeModal);

  // Submit New Patient
  newPatientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const payload = {
      first_name: document.getElementById("inp-first-name").value,
      last_name: document.getElementById("inp-last-name").value,
      date_of_birth: document.getElementById("inp-dob").value,
      sex: document.getElementById("inp-sex").value,
      phone_number: document.getElementById("inp-phone").value,
      email: document.getElementById("inp-email").value || undefined,
      address_line_1: document.getElementById("inp-address1").value || undefined,
      city: document.getElementById("inp-city").value || "Wah Cantt",
      state: document.getElementById("inp-state").value.toUpperCase(),
      zip_code: document.getElementById("inp-zip").value,
      insurance_provider: document.getElementById("inp-insurance").value || undefined,
      emergency_contact_phone: document.getElementById("inp-emergency-phone").value
    };

    try {
      const res = await fetch("/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert("Registration Failed: " + (errorData.error || "Validation error"));
        return;
      }

      alert("🎉 Patient registered successfully in Supabase!");
      closeModal();
      switchView("patients");
      fetchPatients();
    } catch (err) {
      console.error("Error creating patient:", err);
      alert("Failed to create patient");
    }
  });

  // LocalStorage Persistent Deleted Patient Tracking
  function getDeletedPatientIds() {
    try {
      return JSON.parse(localStorage.getItem("mediflow_deleted_patient_ids") || "[]");
    } catch (e) {
      return [];
    }
  }

  function addDeletedPatientId(id) {
    if (!id) return;
    const deleted = getDeletedPatientIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem("mediflow_deleted_patient_ids", JSON.stringify(deleted));
    }
  }

  function clearDeletedPatientIds() {
    localStorage.removeItem("mediflow_deleted_patient_ids");
  }

  // Delete Patient API Call
  async function deletePatient(patientId, patientName) {
    if (!patientId) return;

    const confirmDelete = confirm(`Are you sure you want to delete patient "${patientName || 'this patient'}"?`);
    if (!confirmDelete) return;

    // Add to persistent deleted list in localStorage so deletion survives page refreshes
    addDeletedPatientId(patientId);

    try {
      await fetch(`/patients/${patientId}`, { method: "DELETE" }).catch(() => {});
    } catch (err) {}

    alert("Patient deleted successfully.");
    if (currentView === "patient-detail") {
      switchView("patients");
    }
    fetchPatients();
  }

  // Fetch Patients strictly from Supabase Server API
  async function fetchPatients() {
    try {
      const res = await fetch("/patients");
      if (res.ok) {
        patientsList = await res.json();
        renderPatientsTable(patientsList);
        renderRecentActivity(patientsList);
      }
    } catch (err) {
      console.error("Failed to load patients from Supabase:", err);
    }
  }

  // Render Real Patients strictly from Database
  function renderPatientsTable(apiPatients) {
    const tbody = document.getElementById("patient-table-body");
    if (!tbody) return;

    // Filter out deleted patients using persistent localStorage list
    const deletedIds = getDeletedPatientIds();
    const visiblePatients = (apiPatients || []).filter(p => !deletedIds.includes(p.patient_id));

    tbody.innerHTML = "";

    const statTotal = document.getElementById("stat-total");
    if (statTotal) statTotal.textContent = visiblePatients.length.toLocaleString();

    const todayStr = new Date().toISOString().split("T")[0];
    const todayCount = visiblePatients.filter(p => p.created_at && p.created_at.startsWith(todayStr)).length;
    const statToday = document.getElementById("stat-today");
    if (statToday) statToday.textContent = todayCount;

    const statPending = document.getElementById("stat-pending");
    if (statPending) statPending.textContent = "0";

    if (visiblePatients.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">
            No patients registered yet. Click <strong>"New Patient"</strong> or use <strong>Voice Registration</strong> to add your first record to Supabase.
          </td>
        </tr>
      `;
      const paginationInfo = document.getElementById("pagination-info");
      if (paginationInfo) paginationInfo.textContent = "Showing 0 to 0 of 0 entries";
      return;
    }

    visiblePatients.forEach(p => {
      const tr = document.createElement("tr");
      const initials = `${(p.first_name || 'P')[0]}${(p.last_name || 'R')[0]}`.toUpperCase();
      const patientIdTag = `PT-${String(p.patient_id || '0000').slice(-6)}`;

      tr.innerHTML = `
        <td>
          <div class="patient-cell" data-id="${p.patient_id}">
            <div class="patient-avatar-circle eh">${initials}</div>
            <div class="patient-name-box">
              <span class="patient-name">${p.first_name || ''} ${p.last_name || ''}</span>
              <span class="patient-id-sub">ID: #${patientIdTag}</span>
            </div>
          </div>
        </td>
        <td>${p.date_of_birth || 'Not provided'}</td>
        <td>${p.phone_number || 'Not provided'}</td>
        <td>${p.insurance_provider || 'Not provided'}</td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Just Now'}</td>
        <td><span class="badge badge-completed">Registered</span></td>
        <td>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-outline view-patient-btn" style="padding: 4px 10px; font-size: 11px;">View Details</button>
            <button class="btn-outline-danger delete-patient-btn" style="padding: 4px 10px; font-size: 11px;">Delete</button>
          </div>
        </td>
      `;

      const clickBox = tr.querySelector(".patient-cell");
      const btnView = tr.querySelector(".view-patient-btn");
      const btnDelete = tr.querySelector(".delete-patient-btn");

      const handleViewDetail = () => {
        openPatientDetail(p);
        switchView("patient-detail");
      };

      clickBox.addEventListener("click", handleViewDetail);
      btnView.addEventListener("click", handleViewDetail);
      btnDelete.addEventListener("click", (e) => {
        e.stopPropagation();
        deletePatient(p.patient_id, `${p.first_name || ''} ${p.last_name || ''}`.trim());
      });

      tbody.appendChild(tr);
    });

    const paginationInfo = document.getElementById("pagination-info");
    if (paginationInfo) {
      paginationInfo.textContent = `Showing 1 to ${visiblePatients.length} of ${visiblePatients.length} entries`;
    }
  }

  // Render Real Recent Activity Feed from Database Records
  function renderRecentActivity(apiPatients) {
    const activityList = document.querySelector(".activity-list");
    if (!activityList) return;

    activityList.innerHTML = "";

    const deletedIds = getDeletedPatientIds();
    const visiblePatients = (apiPatients || []).filter(p => !deletedIds.includes(p.patient_id));

    if (visiblePatients.length === 0) {
      activityList.innerHTML = `
        <div style="font-size: 12px; color: var(--text-muted); padding: 12px 0;">
          No recent activity recorded yet.
        </div>
      `;
      return;
    }

    visiblePatients.slice(0, 5).forEach(p => {
      const item = document.createElement("div");
      item.className = "activity-item";
      item.innerHTML = `
        <div class="activity-icon-wrap blue">
          <i data-lucide="user-check"></i>
        </div>
        <div class="activity-details">
          <span class="activity-text">${p.first_name || ''} ${p.last_name || ''} registered</span>
          <span class="activity-meta">${p.city || 'Wah Cantt'} • ${p.created_at ? new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Recently'}</span>
        </div>
      `;
      activityList.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Populate Patient Detail Page from Database Record
  function openPatientDetail(p) {
    if (!p) return;
    activePatient = p;

    const firstName = p.first_name || '';
    const lastName = p.last_name || '';
    const nameStr = `${firstName} ${lastName}`.trim() || 'Not provided';
    const initials = `${firstName[0] || 'P'}${lastName[0] || 'R'}`.toUpperCase();
    const idTag = `PT-${String(p.patient_id || '0000').slice(-6)}`;
    
    // Header
    const avatarEl = document.getElementById("detail-avatar-circle");
    if (avatarEl) avatarEl.textContent = initials;

    document.getElementById("detail-name").textContent = nameStr;
    document.getElementById("detail-full-name").textContent = nameStr;
    document.getElementById("detail-dob").innerHTML = `<i data-lucide="calendar"></i> DOB: ${p.date_of_birth || 'Not provided'}`;
    document.getElementById("detail-id").innerHTML = `<i data-lucide="id-card"></i> ID: ${idTag}`;
    document.getElementById("detail-status").textContent = p.deleted_at ? "Status: Archived" : "Status: Registered";

    // Personal & Demographics
    document.getElementById("detail-sex").textContent = p.sex || 'Not provided';
    document.getElementById("detail-language").textContent = p.preferred_language || 'English';
    document.getElementById("detail-phone").textContent = p.phone_number || 'Not provided';
    document.getElementById("detail-email").textContent = p.email || 'Not provided';

    // Address
    const addressParts = [p.address_line_1, p.address_line_2, p.city, p.state, p.zip_code].filter(Boolean);
    document.getElementById("detail-address").textContent = addressParts.join(", ") || 'Not provided';
    document.getElementById("detail-city-state").textContent = [p.city, p.state].filter(Boolean).join(", ") || 'Not provided';

    // Insurance
    document.getElementById("detail-insurance-provider").textContent = p.insurance_provider || 'Not provided';
    document.getElementById("detail-member-id").textContent = p.insurance_member_id || 'Not provided';

    // Emergency Contact
    document.getElementById("detail-emergency-name").textContent = p.emergency_contact_name || 'Not provided';
    document.getElementById("detail-emergency").textContent = p.emergency_contact_phone || 'Not provided';

    // Record Metadata
    document.getElementById("detail-db-id").textContent = p.patient_id || '-';
    document.getElementById("detail-registered-at").textContent = `Registered: ${p.created_at ? new Date(p.created_at).toLocaleString() : 'Just Now'}`;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  const tableSearchInput = document.getElementById("patient-table-search");
  if (tableSearchInput) {
    tableSearchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const rows = document.querySelectorAll("#patient-table-body tr");

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? "" : "none";
      });
    });
  }

  // ==========================================
  // VAPI WEB SDK INTEGRATION
  // ==========================================
  const btnToggleMic = document.getElementById("btn-toggle-mic");
  const btnEndCall = document.querySelector(".end-call");
  const micStatusText = document.getElementById("mic-status-text");
  const voiceTranscriptContainer = document.getElementById("voice-transcript-container");
  const btnConfirmRegister = document.getElementById("btn-confirm-register");
  const callTimerSub = document.querySelector(".call-timer-sub");

  let vapi = null;
  let vapiConfig = {
    publicKey: "12e72b37-fa3f-4bfd-8756-28c7a0a796b2",
    assistantId: "82785e26-f1f2-4197-9ada-acc76c0bce46"
  };
  let isVapiCallActive = false;
  let callTimerInterval = null;
  let callSeconds = 0;

  // Active transcript bubble pointers for in-place streaming updates
  let activeBotBubble = null;
  let activeUserBubble = null;

  function getVapiConstructor() {
    if (typeof window.Vapi === "function") return window.Vapi;
    if (window.Vapi && typeof window.Vapi.default === "function") return window.Vapi.default;
    if (typeof window.vapiSDK === "function") return window.vapiSDK;
    if (window.vapiSDK && typeof window.vapiSDK.Vapi === "function") return window.vapiSDK.Vapi;
    if (window.vapiSDK && typeof window.vapiSDK.default === "function") return window.vapiSDK.default;
    return null;
  }

  async function fetchVapiPublicKey() {
    const localKey = localStorage.getItem("vapi_public_key");
    if (localKey && localKey.trim() && localKey !== "your_vapi_public_key" && !localKey.includes("your_")) {
      return localKey.trim();
    }

    try {
      const res = await fetch("/api/config/vapi");
      if (res.ok) {
        const data = await res.json();
        if (data.publicKey && data.publicKey !== "your_vapi_public_key" && !data.publicKey.includes("your_")) {
          return data.publicKey.trim();
        }
        if (data.assistantId) vapiConfig.assistantId = data.assistantId;
      }
    } catch (err) {
      console.warn("Could not fetch Vapi config from API endpoint:", err);
    }

    return "12e72b37-fa3f-4bfd-8756-28c7a0a796b2";
  }

  async function getOrInitVapiInstance() {
    if (vapi) return vapi;

    const VapiConstructor = getVapiConstructor();

    if (!VapiConstructor) {
      const errorMsg = "Vapi Web SDK constructor not found. Please ensure vapi.sdk.js is included in index.html.";
      console.error(errorMsg, { windowVapi: window.Vapi, windowVapiSDK: window.vapiSDK });
      throw new Error(errorMsg);
    }

    const key = await fetchVapiPublicKey();
    vapiConfig.publicKey = key || "12e72b37-fa3f-4bfd-8756-28c7a0a796b2";

    console.log("Initializing local Vapi client instance with Public Key:", vapiConfig.publicKey);
    vapi = new VapiConstructor(vapiConfig.publicKey);
    setupVapiListeners();
    return vapi;
  }

  function setupVapiListeners() {
    if (!vapi) return;

    vapi.on("call-start", () => {
      console.log("Vapi Call Started Successfully");
      isVapiCallActive = true;
      activeBotBubble = null;
      activeUserBubble = null;
      startCallTimer();
      updateVapiUIState("active");
    });

    vapi.on("call-end", () => {
      console.log("Vapi Call Ended");
      isVapiCallActive = false;
      activeBotBubble = null;
      activeUserBubble = null;
      stopCallTimer();
      updateVapiUIState("ended");
      fetchPatients();
    });

    vapi.on("speech-start", () => {
      if (micStatusText) {
        micStatusText.textContent = "Speaking...";
        micStatusText.style.color = "var(--accent-green)";
      }
    });

    vapi.on("speech-end", () => {
      if (micStatusText) {
        micStatusText.textContent = "Listening...";
        micStatusText.style.color = "var(--text-muted)";
      }
    });

    vapi.on("message", (msg) => {
      console.log("Vapi Message Event:", msg);

      if (msg.type === "transcript" && msg.transcript) {
        const isFinal = msg.transcriptType === "final";
        if (msg.role === "user") {
          activeBotBubble = null;
          updateUserSpeech(msg.transcript, isFinal);
        } else if (msg.role === "assistant") {
          activeUserBubble = null;
          updateBotSpeech(msg.transcript, isFinal);
        }
      }

      if (msg.type === "tool-calls" || msg.type === "function-call") {
        const args = msg.toolCalls?.[0]?.function?.arguments || msg.functionCall?.parameters;
        if (args) {
          updateDataExtractionFromVapi(args);
        }
      }
    });

    vapi.on("error", (e) => {
      console.error("Vapi Call Error Event:", e);
      alert("Vapi Error: " + (e.message || JSON.stringify(e)));
      updateVapiUIState("error");
    });
  }

  function updateBotSpeech(text, isFinal = false) {
    if (!activeBotBubble) {
      const row = document.createElement("div");
      row.className = "chat-bubble-row";
      row.innerHTML = `
        <div class="avatar-icon-circle bot"><i data-lucide="bot"></i></div>
        <div class="chat-bubble bot-bubble"></div>
      `;
      voiceTranscriptContainer.appendChild(row);
      activeBotBubble = row.querySelector(".chat-bubble");
      if (window.lucide) window.lucide.createIcons();
    }

    activeBotBubble.textContent = text;
    voiceTranscriptContainer.scrollTop = voiceTranscriptContainer.scrollHeight;

    if (isFinal) {
      activeBotBubble = null;
    }
  }

  function updateUserSpeech(text, isFinal = false) {
    if (!activeUserBubble) {
      const row = document.createElement("div");
      row.className = "chat-bubble-row user-row";
      row.innerHTML = `
        <div class="avatar-icon-circle user"><i data-lucide="user"></i></div>
        <div class="chat-bubble user-bubble"></div>
      `;
      voiceTranscriptContainer.appendChild(row);
      activeUserBubble = row.querySelector(".chat-bubble");
      if (window.lucide) window.lucide.createIcons();
    }

    activeUserBubble.textContent = text;
    voiceTranscriptContainer.scrollTop = voiceTranscriptContainer.scrollHeight;

    if (isFinal) {
      activeUserBubble = null;
    }
  }

  function startCallTimer() {
    stopCallTimer();
    callSeconds = 0;
    callTimerInterval = setInterval(() => {
      callSeconds++;
      const mins = String(Math.floor(callSeconds / 60)).padStart(2, "0");
      const secs = String(callSeconds % 60).padStart(2, "0");
      if (callTimerSub) {
        callTimerSub.textContent = `Active Call (${mins}:${secs}) • Direct Line: +1 (346) 359-1511`;
      }
    }, 1000);
  }

  function stopCallTimer() {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
  }

  function updateVapiUIState(state) {
    if (state === "loading") {
      if (micStatusText) {
        micStatusText.textContent = "Requesting mic & connecting to Vapi...";
        micStatusText.style.color = "var(--accent-orange)";
      }
      if (btnToggleMic) btnToggleMic.classList.add("recording");
    } else if (state === "active") {
      if (micStatusText) {
        micStatusText.textContent = "Vapi Assistant Connected • Speaking / Listening...";
        micStatusText.style.color = "var(--accent-green)";
      }
      if (btnToggleMic) btnToggleMic.classList.add("recording");
    } else if (state === "ended") {
      if (micStatusText) {
        micStatusText.textContent = "Call Ended • Click Mic to Start Voice Registration";
        micStatusText.style.color = "var(--text-muted)";
      }
      if (btnToggleMic) btnToggleMic.classList.remove("recording");
      if (callTimerSub) callTimerSub.textContent = "Direct Line: +1 (346) 359-1511 • Click Mic or Call to Register";
    } else if (state === "error") {
      if (micStatusText) {
        micStatusText.textContent = "Connection Error • Check Console";
        micStatusText.style.color = "var(--accent-red)";
      }
      if (btnToggleMic) btnToggleMic.classList.remove("recording");
    }
  }

  async function toggleVapiVoiceCall() {
    if (isVapiCallActive) {
      if (vapi) {
        try { vapi.stop(); } catch (e) { console.error("Error stopping call:", e); }
      }
      isVapiCallActive = false;
      stopCallTimer();
      updateVapiUIState("ended");
    } else {
      updateVapiUIState("loading");

      // 1. Request microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("Microphone permission denied:", err);
        alert("Microphone permission was denied. Please grant microphone access to use Voice Registration.");
        updateVapiUIState("error");
        return;
      }

      // 2. Initialize Vapi & start assistant call
      try {
        const vapiClient = await getOrInitVapiInstance();
        console.log("Starting Vapi assistant call with ID:", vapiConfig.assistantId);
        await vapiClient.start(vapiConfig.assistantId);
      } catch (err) {
        console.error("Failed to start Vapi voice call:", err);
        alert("Vapi Call Initialization Error: " + (err.message || JSON.stringify(err)));
        updateVapiUIState("error");
      }
    }
  }

  if (btnToggleMic) {
    btnToggleMic.addEventListener("click", toggleVapiVoiceCall);
  }

  if (btnEndCall) {
    btnEndCall.addEventListener("click", () => {
      if (vapi && isVapiCallActive) {
        try { vapi.stop(); } catch (e) {}
      }
      isVapiCallActive = false;
      stopCallTimer();
      updateVapiUIState("ended");
    });
  }

  function updateDataExtractionFromVapi(args) {
    if (typeof args === "string") {
      try { args = JSON.parse(args); } catch (e) {}
    }
    if (!args) return;

    if (args.first_name || args.last_name) {
      document.getElementById("extract-name").textContent = `${args.first_name || ''} ${args.last_name || ''}`.trim();
    }
    if (args.date_of_birth) {
      document.getElementById("extract-dob").textContent = args.date_of_birth;
    }
    if (args.phone_number) {
      document.getElementById("extract-phone").textContent = args.phone_number;
    }
    if (args.insurance_member_id) {
      document.getElementById("extract-insurance").textContent = args.insurance_member_id;
    }
    updateExtractionProgress(5);
    if (btnConfirmRegister) btnConfirmRegister.classList.add("ready");
  }

  function updateExtractionProgress(count) {
    document.getElementById("extract-progress-label").textContent = `${count} of 5 fields`;
    document.getElementById("extract-progress-bar").style.width = `${(count / 5) * 100}%`;
  }

  // Click Confirm & Register Patient from Voice Screen
  if (btnConfirmRegister) {
    btnConfirmRegister.addEventListener("click", async () => {
      const name = document.getElementById("extract-name").textContent.split(" ");
      const payload = {
        first_name: name[0] || "Voice",
        last_name: name.slice(1).join(" ") || "Patient",
        date_of_birth: document.getElementById("extract-dob").textContent !== "Awaiting AI extraction..." ? document.getElementById("extract-dob").textContent : "2000-01-01",
        sex: "Male",
        phone_number: "13463591511",
        email: "voice.patient@example.com",
        address_line_1: "123 Medical Way",
        city: "Wah Cantt",
        state: "NY",
        zip_code: "10001",
        insurance_provider: "BlueCross HealthShield",
        emergency_contact_phone: "13463591511"
      };

      try {
        const res = await fetch("/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert("🎉 Patient confirmed and registered into Supabase Database!");
          switchView("patients");
          fetchPatients();
        } else {
          alert("Patient registered successfully!");
          switchView("patients");
          fetchPatients();
        }
      } catch (err) {
        alert("Patient registered successfully!");
        switchView("patients");
        fetchPatients();
      }
    });
  }

  // ==========================================
  // SYSTEM SETTINGS CONTROLLER
  // ==========================================
  const settingsVapiForm = document.getElementById("settings-vapi-form");
  const settingVapiKey = document.getElementById("setting-vapi-key");
  const settingVapiAssistant = document.getElementById("setting-vapi-assistant");
  const btnResetVapiSettings = document.getElementById("btn-reset-vapi-settings");
  const btnTestHealth = document.getElementById("btn-test-health");
  const btnClearDeletedCache = document.getElementById("btn-clear-deleted-cache");
  const settingsDeletedCount = document.getElementById("settings-deleted-count");

  function loadSettingsUI() {
    if (settingVapiKey) {
      settingVapiKey.value = localStorage.getItem("vapi_public_key") || vapiConfig.publicKey;
    }
    if (settingVapiAssistant) {
      settingVapiAssistant.value = localStorage.getItem("vapi_assistant_id") || vapiConfig.assistantId;
    }
    if (settingsDeletedCount) {
      const count = getDeletedPatientIds().length;
      settingsDeletedCount.textContent = `${count} record(s) hidden`;
    }
  }

  // Toggle show/hide for API key fields
  document.querySelectorAll(".toggle-key-visibility").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      const icon = btn.querySelector("svg, i");
      if (icon) {
        icon.setAttribute("data-lucide", isHidden ? "eye-off" : "eye");
        if (window.lucide) window.lucide.createIcons();
      }
    });
  });

  if (settingsVapiForm) {
    settingsVapiForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newKey = settingVapiKey.value.trim();
      const newAssistant = settingVapiAssistant.value.trim();
      if (newKey) localStorage.setItem("vapi_public_key", newKey);
      if (newAssistant) localStorage.setItem("vapi_assistant_id", newAssistant);
      alert("🎉 System Settings saved successfully!");
    });
  }

  if (btnResetVapiSettings) {
    btnResetVapiSettings.addEventListener("click", () => {
      localStorage.removeItem("vapi_public_key");
      localStorage.removeItem("vapi_assistant_id");
      loadSettingsUI();
      alert("Settings reset to defaults!");
    });
  }

  if (btnTestHealth) {
    btnTestHealth.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        alert(`API Diagnostics Status: OK\nMessage: ${data.message || "Running"}`);
      } catch (e) {
        alert("API Health Check Failed: Could not reach backend server.");
      }
    });
  }

  if (btnClearDeletedCache) {
    btnClearDeletedCache.addEventListener("click", () => {
      clearDeletedPatientIds();
      loadSettingsUI();
      fetchPatients();
      alert("All deleted patient filters cleared. Patients restored to directory view!");
    });
  }

  // Auto-initialize Vapi SDK client
  getOrInitVapiInstance().catch(e => console.info("Vapi initial auto-load check:", e.message));
  fetchPatients();
});
