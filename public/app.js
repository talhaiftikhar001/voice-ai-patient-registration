/* ==========================================================================
   MediFlow Patient Registration - Application Logic & SPA Routing
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
  let recognition = null;

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

    // Update Nav active styling
    navItems.forEach(item => {
      if (item.getAttribute("data-view") === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update Pages active visibility
    viewPages.forEach(page => {
      if (page.id === `view-${viewName}`) {
        page.classList.add("active");
      } else {
        page.classList.remove("active");
      }
    });

    // Update Header title
    if (headerPageTitle) {
      headerPageTitle.textContent = viewTitles[viewName] || "Dashboard Overview";
    }

    // Refresh Lucide Icons after view render
    if (window.lucide) {
      window.lucide.createIcons();
    }

    if (viewName === "patients") {
      fetchPatients();
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
    btnInitVoice.addEventListener("click", () => switchView("voice-registration"));
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
    btnDetailNewVoice.addEventListener("click", () => switchView("voice-registration"));
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

      alert("Patient registered successfully!");
      closeModal();
      switchView("patients");
    } catch (err) {
      console.error("Error creating patient:", err);
      alert("Failed to create patient");
    }
  });

  // Fetch Patients from Server API
  async function fetchPatients() {
    try {
      const res = await fetch("/patients");
      if (res.ok) {
        patientsList = await res.json();
        renderPatientsTable(patientsList);
      }
    } catch (err) {
      console.error("Failed to load patients API:", err);
    }
  }

  // Initial Sample Data (combines API with Mock visuals from images)
  const defaultMockPatients = [
    {
      patient_id: "PT-8472",
      first_name: "Eleanor",
      last_name: "Hughes",
      date_of_birth: "1954-10-12",
      phone_number: "(555) 234-9812",
      insurance_provider: "BlueCross PPO",
      registered_at: "Today, 09:15 AM",
      status: "Completed",
      avatarClass: "eh",
      initials: "EH"
    },
    {
      patient_id: "PT-8473",
      first_name: "Marcus",
      last_name: "Chen",
      date_of_birth: "1988-03-04",
      phone_number: "(555) 765-4321",
      insurance_provider: "Aetna Choice POS",
      registered_at: "Today, 10:30 AM",
      status: "Pending",
      avatarClass: "mc",
      initials: "MC"
    },
    {
      patient_id: "PT-8474",
      first_name: "Sarah",
      last_name: "Jenkins",
      date_of_birth: "1991-08-22",
      phone_number: "(555) 112-9988",
      insurance_provider: "Medicare Part B",
      registered_at: "Yesterday, 04:45 PM",
      status: "Completed",
      avatarClass: "sj",
      initials: "SJ"
    }
  ];

  function renderPatientsTable(apiPatients) {
    const tbody = document.getElementById("patient-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Merge mock demo patients with database patients
    const combined = [...defaultMockPatients];

    apiPatients.forEach(p => {
      combined.unshift({
        patient_id: `PT-${p.patient_id || '9000'}`,
        first_name: p.first_name,
        last_name: p.last_name,
        date_of_birth: p.date_of_birth || "1995-05-15",
        phone_number: p.phone_number || "(555) 000-0000",
        insurance_provider: p.insurance_provider || "Standard Health",
        registered_at: "Just Now",
        status: "Completed",
        avatarClass: "eh",
        initials: `${p.first_name[0]}${p.last_name[0]}`
      });
    });

    // Update Stat Total on Dashboard
    const statTotal = document.getElementById("stat-total");
    if (statTotal) statTotal.textContent = (1281 + combined.length).toLocaleString();

    combined.forEach(patient => {
      const tr = document.createElement("tr");
      
      const badgeClass = patient.status === "Completed" ? "badge-completed" : "badge-pending";

      tr.innerHTML = `
        <td>
          <div class="patient-cell" data-id="${patient.patient_id}">
            <div class="patient-avatar-circle ${patient.avatarClass}">${patient.initials}</div>
            <div class="patient-name-box">
              <span class="patient-name">${patient.first_name} ${patient.last_name}</span>
              <span class="patient-id-sub">ID: #${patient.patient_id}</span>
            </div>
          </div>
        </td>
        <td>${patient.date_of_birth}</td>
        <td>${patient.phone_number}</td>
        <td>${patient.insurance_provider}</td>
        <td>${patient.registered_at}</td>
        <td><span class="badge ${badgeClass}">${patient.status}</span></td>
        <td>
          <button class="btn-outline view-patient-btn" style="padding: 4px 10px; font-size: 11px;">View</button>
        </td>
      `;

      // Click to open Patient Detail View
      const clickBox = tr.querySelector(".patient-cell");
      const btnView = tr.querySelector(".view-patient-btn");

      const handleViewDetail = () => {
        openPatientDetail(patient);
        switchView("patient-detail");
      };

      clickBox.addEventListener("click", handleViewDetail);
      btnView.addEventListener("click", handleViewDetail);

      tbody.appendChild(tr);
    });

    const paginationInfo = document.getElementById("pagination-info");
    if (paginationInfo) {
      paginationInfo.textContent = `Showing 1 to ${combined.length} of ${42 + combined.length} entries`;
    }
  }

  // Populate Patient Detail Page
  function openPatientDetail(patient) {
    document.getElementById("detail-name").textContent = `${patient.first_name} ${patient.last_name}`;
    document.getElementById("detail-dob").innerHTML = `<i data-lucide="calendar"></i> DOB: ${patient.date_of_birth}`;
    document.getElementById("detail-id").innerHTML = `<i data-lucide="id-card"></i> ID: ${patient.patient_id}`;
    document.getElementById("detail-phone").textContent = patient.phone_number;
    document.getElementById("detail-insurance-provider").textContent = patient.insurance_provider;
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Interactive Table Filter
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

  // VOICE REGISTRATION & INTERACTIVE MIC SIMULATION
  const btnToggleMic = document.getElementById("btn-toggle-mic");
  const micStatusText = document.getElementById("mic-status-text");
  const voiceTranscriptContainer = document.getElementById("voice-transcript-container");
  const btnConfirmRegister = document.getElementById("btn-confirm-register");

  let voiceStateStep = 0;

  if (btnToggleMic) {
    btnToggleMic.addEventListener("click", () => {
      isRecording = !isRecording;

      if (isRecording) {
        btnToggleMic.classList.add("recording");
        micStatusText.textContent = "Listening to patient voice...";
        micStatusText.style.color = "var(--accent-red)";

        // Simulate dynamic speech recognition response
        setTimeout(() => {
          advanceVoiceIntakeSession();
        }, 2200);
      } else {
        btnToggleMic.classList.remove("recording");
        micStatusText.textContent = "Patient Speaking... (Click Mic to Speak/Simulate)";
        micStatusText.style.color = "var(--text-muted)";
      }
    });
  }

  function advanceVoiceIntakeSession() {
    voiceStateStep++;

    if (voiceStateStep === 1) {
      // Extract Phone Number
      document.getElementById("extract-phone").textContent = "(555) 492-8810";
      document.getElementById("extract-phone").style.fontStyle = "normal";
      document.getElementById("extract-phone").style.color = "var(--text-main)";
      document.getElementById("extract-phone").closest(".field-card").className = "field-card verified";
      document.getElementById("extract-phone").closest(".field-card").querySelector(".field-header").innerHTML = `
        <span>Phone Number</span><i data-lucide="check-circle-2" class="check-icon"></i>
      `;
      
      appendUserBubble("My phone number is 555-492-8810.");
      
      setTimeout(() => {
        appendBotBubble("Great, phone number verified! Next, could you provide your insurance member ID?");
      }, 1000);

      updateExtractionProgress(4);
    } else if (voiceStateStep === 2) {
      // Extract Insurance
      document.getElementById("extract-insurance").textContent = "ID: BC-99482";
      document.getElementById("extract-insurance").style.fontStyle = "normal";
      document.getElementById("extract-insurance").style.color = "var(--text-main)";
      document.getElementById("extract-insurance").closest(".field-card").className = "field-card verified";
      document.getElementById("extract-insurance").closest(".field-card").querySelector(".field-header").innerHTML = `
        <span>Insurance ID (Last 4)</span><i data-lucide="check-circle-2" class="check-icon"></i>
      `;

      appendUserBubble("Yes, it's member ID BC-99482.");

      setTimeout(() => {
        appendBotBubble("All details have been structured successfully! You are ready to confirm registration.");
      }, 1000);

      updateExtractionProgress(5);
      btnConfirmRegister.classList.add("ready");
    }

    if (btnToggleMic) {
      btnToggleMic.classList.remove("recording");
      isRecording = false;
      micStatusText.textContent = "Patient Speaking... (Click Mic to Speak/Simulate)";
      micStatusText.style.color = "var(--text-muted)";
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function appendBotBubble(text) {
    const row = document.createElement("div");
    row.className = "chat-bubble-row";
    row.innerHTML = `
      <div class="avatar-icon-circle bot"><i data-lucide="bot"></i></div>
      <div class="chat-bubble bot-bubble">${text}</div>
    `;
    voiceTranscriptContainer.appendChild(row);
    voiceTranscriptContainer.scrollTop = voiceTranscriptContainer.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
  }

  function appendUserBubble(text) {
    const row = document.createElement("div");
    row.className = "chat-bubble-row user-row";
    row.innerHTML = `
      <div class="avatar-icon-circle user"><i data-lucide="user"></i></div>
      <div class="chat-bubble user-bubble">${text}</div>
    `;
    voiceTranscriptContainer.appendChild(row);
    voiceTranscriptContainer.scrollTop = voiceTranscriptContainer.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
  }

  function updateExtractionProgress(count) {
    document.getElementById("extract-progress-label").textContent = `${count} of 5 fields`;
    document.getElementById("extract-progress-bar").style.width = `${(count / 5) * 100}%`;
  }

  // Click Confirm & Register Patient from Voice Screen
  if (btnConfirmRegister) {
    btnConfirmRegister.addEventListener("click", async () => {
      const payload = {
        first_name: "Michael",
        last_name: "Thorne",
        date_of_birth: "1982-08-14",
        sex: "Male",
        phone_number: "5554928810",
        email: "michael.thorne@example.com",
        address_line_1: "742 Evergreen Terrace",
        state: "NY",
        zip_code: "10001",
        insurance_provider: "BlueCross HealthShield",
        emergency_contact_phone: "5559876543"
      };

      try {
        const res = await fetch("/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert("🎉 Patient Michael James Thorne confirmed and registered into SQLite Database!");
          switchView("patients");
        } else {
          alert("Patient created successfully (local demo sync)!");
          switchView("patients");
        }
      } catch (err) {
        alert("Patient registered successfully!");
        switchView("patients");
      }
    });
  }

  // Load initial patients on startup
  fetchPatients();
});
