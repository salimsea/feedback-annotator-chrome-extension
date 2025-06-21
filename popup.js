function showSectionByRole(role) {
  document.getElementById("role-selection").style.display = "none";
  document.getElementById("back-section").style.display = "";
  if (role === "user") {
    document.getElementById("user-interface").style.display = "";
    document.getElementById("developer-interface").style.display = "none";
    // Tunggu DOM render, lalu panggil render list
    requestAnimationFrame(() => renderFeedbackList());
  } else if (role === "developer") {
    document.getElementById("user-interface").style.display = "none";
    document.getElementById("developer-interface").style.display = "";
    document.getElementById("developer-feedback-section").style.display =
      "none";
    document.getElementById("developer-feedback-list").innerHTML = "";
    document.getElementById("feedback-stats").innerHTML = "";
    document.getElementById("employee-number").value = "";
  }
}

function showRoleSelection() {
  document.getElementById("role-selection").style.display = "";
  document.getElementById("user-interface").style.display = "none";
  document.getElementById("developer-interface").style.display = "none";
  document.getElementById("back-section").style.display = "none";
}

// ========== HANDLE ROLE PILIHAN ==========
function setRole(role) {
  chrome.storage.local.set({ feedback_role: role }, () => {
    showSectionByRole(role);
  });
}

function getRole(callback) {
  chrome.storage.local.get(["feedback_role"], (res) => {
    callback(res.feedback_role || null);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Role logic
  getRole(function (role) {
    if (!role) {
      showRoleSelection();
    } else {
      showSectionByRole(role);
    }
  });

  // Role Option Click
  document.querySelectorAll(".role-option").forEach((opt) => {
    opt.onclick = function () {
      setRole(this.dataset.role);
    };
  });

  // Tombol "Kembali"
  document.getElementById("back-btn").onclick = function () {
    chrome.storage.local.remove("feedback_role", showRoleSelection);
  };

  // ========== USER MODE (DEFAULT) ==========
  const tabId = await getCurrentTabId();
  getTabFeedbackStatus(tabId, function (isActive) {
    updateToggleUI(isActive);
  });

  document.getElementById("toggle-switch").onclick = async function () {
    const tabId = await getCurrentTabId();
    getTabFeedbackStatus(tabId, function (isActive) {
      if (!isActive) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            window.dispatchEvent(new CustomEvent("ENABLE_FEEDBACK_MODE"));
          },
        });
        setTabFeedbackStatus(tabId, true);
        updateToggleUI(true);
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            window.dispatchEvent(new CustomEvent("DISABLE_FEEDBACK_MODE"));
          },
        });
        setTabFeedbackStatus(tabId, false);
        updateToggleUI(false);
      }
    });
  };

  document.getElementById("clear-all-btn").onclick = function () {
    if (confirm("Are you sure you want to delete all feedback?")) {
      clearAllFeedback(() => {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.tabs.reload(tabs[0].id);
          }
        );
        window.location.reload();
      });
    }
  };

  // ========== DEVELOPER MODE ==========
  document.getElementById("check-feedback-btn").onclick = function () {
    const section = document.getElementById("developer-feedback-section");
    const listDiv = document.getElementById("developer-feedback-list");
    const statsDiv = document.getElementById("feedback-stats");
    section.style.display = "block";
    listDiv.innerHTML = "";
    statsDiv.innerHTML = "";
    // Real: Kamu bisa filter feedback berdasarkan employee number kalau memang ada field-nya, di sini tampilkan semua
    getAllFeedbackGrouped(function (all) {
      let total = 0;
      all.forEach((item) => {
        item.feedbacks.forEach((fb) => {
          const feedbackDiv = document.createElement("div");
          feedbackDiv.className = "feedback-item";
          feedbackDiv.innerHTML = `
              <div class="feedback-content">
                <div class="feedback-text">💬 ${fb.comment}</div>
                <div class="feedback-meta">${item.url} | 🕒 ${
            fb.timestamp ? new Date(fb.timestamp).toLocaleString() : "-"
          }</div>
              </div>
            `;
          listDiv.appendChild(feedbackDiv);
          total++;
        });
      });
      statsDiv.innerHTML = `<span class="stat-item">Total: <strong>${total}</strong></span>`;
      if (total === 0) {
        listDiv.innerHTML = `<div class="empty-state"><i data-lucide="message-circle" class="empty-icon"></i><p class="empty-text">There is no user feedback yet.</p></div>`;
      }
    });
  };

  document.getElementById("visible").onclick = async function () {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.__feedbackBubbleVisible = !window.__feedbackBubbleVisible;
        document.querySelectorAll(".feedback-sent").forEach((el) => {
          if (window.__feedbackBubbleVisible) {
            el.classList.remove("feedback-hidden");
          } else {
            el.classList.add("feedback-hidden");
          }
        });
      },
    });
  };
});

// ============ FEEDBACK MODE TOGGLE ============

async function getCurrentTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0].id);
    });
  });
}

function getTabFeedbackStatus(tabId, callback) {
  chrome.storage.local.get(["feedbackStatus"], (res) => {
    const statusObj = res.feedbackStatus || {};
    callback(Boolean(statusObj[tabId]));
  });
}

function setTabFeedbackStatus(tabId, isActive) {
  chrome.storage.local.get(["feedbackStatus"], (res) => {
    const statusObj = res.feedbackStatus || {};
    statusObj[tabId] = isActive;
    chrome.storage.local.set({ feedbackStatus: statusObj });
  });
}

function updateToggleUI(isActive) {
  const toggleSwitch = document.getElementById("toggle-switch");
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const statusDot = document.querySelector(".status-dot");
  if (isActive) {
    toggleSwitch.classList.add("active");
    statusIndicator.classList.add("active");
    statusIndicator.classList.remove("inactive");
    statusText.textContent = "Active";
    statusDot.style.background = "#22c55e";
  } else {
    toggleSwitch.classList.remove("active");
    statusIndicator.classList.remove("active");
    statusIndicator.classList.add("inactive");
    statusText.textContent = "Not Active";
    statusDot.style.background = "#d1d5db";
  }
}

// ============ FEEDBACK LIST RENDERING ============

function getAllFeedbackGrouped(callback) {
  chrome.storage.local.get(null, function (all) {
    const result = [];
    const keys = Object.keys(all).filter((k) => k.startsWith("feedbacks-"));
    keys.forEach((key) => {
      const url = key.replace("feedbacks-", "");
      const feedbacks = all[key];
      result.push({ url, feedbacks });
    });
    callback(result);
  });
}

function renderFeedbackList() {
  const container = document.getElementById("feedback-list");
  const emptyState = document.getElementById("empty-state");

  getAllFeedbackGrouped(function (all) {
    if (all.length === 0) {
      emptyState.style.display = "inline-block";
      return;
    }
    emptyState.style.display = "none";
    container.innerHTML = "";
    all.forEach((item, idx) => {
      const url = item.url;
      const feedbacks = item.feedbacks || [];
      const groupDiv = document.createElement("div");
      groupDiv.className = "feedback-group";
      groupDiv.innerHTML = `
          <div class="group-header" data-idx="${idx}">
            <div class="group-header-content">
              <div class="url-info">
                <div class="url-title">${url}</div>
                <div class="url-count">${feedbacks.length} feedback</div>
              </div>
              <svg class="expand-icon" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 8L10 12L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
          <div class="group-content"></div>
        `;
      // List feedbacks per web
      const detailDiv = groupDiv.querySelector(".group-content");
      feedbacks.forEach((fb) => {
        const date = fb.timestamp
          ? new Date(fb.timestamp).toLocaleString()
          : "-";
        const pos =
          fb.top && fb.left
            ? `(${fb.top.replace("px", "")}, ${fb.left.replace("px", "")})`
            : "-";
        const itemDiv = document.createElement("div");
        itemDiv.className = "feedback-item";
        itemDiv.innerHTML = `
              <div class="feedback-content">
                <div class="feedback-text">💬 ${fb.comment}</div>
                <div class="feedback-meta">🕒 ${date} | 🖱️ Posisi: ${pos}</div>
              </div>
          `;
        detailDiv.appendChild(itemDiv);
      });
      detailDiv.classList.add("group-content"); // Jangan set display di sini

      // Expand/collapse group
      groupDiv
        .querySelector(".group-header")
        .addEventListener("click", function () {
          const alreadyOpen = detailDiv.classList.contains("expanded");
          // Tutup semua dulu
          document
            .querySelectorAll(".group-content")
            .forEach((el) => el.classList.remove("expanded"));
          document
            .querySelectorAll(".group-header")
            .forEach((el) => el.classList.remove("expanded"));
          // Jika sebelumnya belum terbuka, buka yg ini
          if (!alreadyOpen) {
            detailDiv.classList.add("expanded");
            this.classList.add("expanded");
          }
        });

      container.appendChild(groupDiv);
    });
  });
}

// ============ CLEAR ALL FEEDBACK ============

function clearAllFeedback(callback) {
  chrome.storage.local.get(null, function (all) {
    const keysToRemove = Object.keys(all).filter((k) =>
      k.startsWith("feedbacks-")
    );
    if (keysToRemove.length === 0) {
      if (callback) callback();
      return;
    }
    chrome.storage.local.remove(keysToRemove, () => {
      renderFeedbackList();
      if (callback) callback();
    });
  });
}

// // ============ EVENT BINDING & INIT ============
// document.addEventListener("DOMContentLoaded", async () => {
//   renderFeedbackList();

//   const tabId = await getCurrentTabId();
//   getTabFeedbackStatus(tabId, function (isActive) {
//     updateToggleUI(isActive);
//   });

//   // === [TOGGLE FEEDBACK MODE] ===
//   document.getElementById("toggle-switch").onclick = async function () {
//     const tabId = await getCurrentTabId();
//     getTabFeedbackStatus(tabId, function (isActive) {
//       if (!isActive) {
//         chrome.scripting.executeScript({
//           target: { tabId: tabId },
//           func: () => {
//             window.dispatchEvent(new CustomEvent("ENABLE_FEEDBACK_MODE"));
//           },
//         });
//         setTabFeedbackStatus(tabId, true);
//         updateToggleUI(true);
//       } else {
//         chrome.scripting.executeScript({
//           target: { tabId: tabId },
//           func: () => {
//             window.dispatchEvent(new CustomEvent("DISABLE_FEEDBACK_MODE"));
//           },
//         });
//         setTabFeedbackStatus(tabId, false);
//         updateToggleUI(false);
//       }
//     });
//   };

//   // === [CLEAR ALL FEEDBACK] ===
//   document.getElementById("clear-all-btn").onclick = function () {
//     if (confirm("Yakin ingin menghapus semua feedback?")) {
//       clearAllFeedback(() => {
//         // reload tab aktif (bukan popup)
//         chrome.tabs.query(
//           { active: true, currentWindow: true },
//           function (tabs) {
//             chrome.tabs.reload(tabs[0].id);
//           }
//         );
//         // reload popup juga
//         window.location.reload();
//       });
//     }
//   };
// });
