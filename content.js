window.__feedbackBubbleVisible = true;

// === RESET feedback status ON PAGE LOAD ===
try {
  chrome.runtime.sendMessage({ action: "getTabId" }, function (tabId) {
    if (tabId) {
      chrome.storage.local.get(["feedbackStatus"], (res) => {
        const statusObj = res.feedbackStatus || {};
        statusObj[tabId] = false;
        chrome.storage.local.set({ feedbackStatus: statusObj });
      });
    }
  });
} catch (e) {
  // ignore error (sandbox iframe, etc)
}

// Visibility toggle untuk bubble feedback
function setFeedbackBubbleVisibility(isVisible) {
  window.__feedbackBubbleVisible = isVisible;
  document.querySelectorAll(".feedback-sent").forEach((el) => {
    if (isVisible) {
      el.classList.remove("feedback-hidden");
    } else {
      el.classList.add("feedback-hidden");
    }
  });
}

// Utilitas untuk simpan dan ambil feedback
function saveFeedback(feedback) {
  const url = location.href;
  const key = "feedbacks-" + url;
  try {
    chrome.storage.local.get([key], function (result) {
      if (chrome.runtime.lastError) return;
      const list = result[key] || [];
      list.push(feedback);
      chrome.storage.local.set({ [key]: list }, function () {
        // bisa cek error juga di sini jika mau
      });
    });
  } catch (e) {
    /* ignore */
  }
}

function updateFeedbackComment(index, newComment, callback) {
  const url = location.href;
  const key = "feedbacks-" + url;
  chrome.storage.local.get([key], function (result) {
    const list = result[key] || [];
    if (list[index]) {
      list[index].comment = newComment;
      chrome.storage.local.set({ [key]: list }, callback);
    }
  });
}

function loadFeedbacks(callback) {
  const url = location.href;
  const key = "feedbacks-" + url;
  chrome.storage.local.get([key], function (result) {
    callback(result[key] || []);
  });
}

// Render semua feedback lama
function renderAllFeedbacks() {
  document.querySelectorAll(".feedback-sent").forEach((el) => el.remove());
  loadFeedbacks((feedbacks) => {
    feedbacks.forEach((fb, idx) => {
      renderFeedbackBubble(fb, idx);
    });
  });
}

// Fungsi untuk render satu feedback dengan tombol edit
function renderFeedbackBubble(feedback, index) {
  const bubble = document.createElement("div");
  bubble.className = "feedback-sent";
  bubble.style.position = "absolute";
  bubble.style.top = feedback.top;
  bubble.style.left = feedback.left;
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.gap = "4px";
  bubble.style.maxWidth = "320px";
  bubble.style.background = "#fff";
  bubble.style.border = "1.5px solid #dbeafe";
  bubble.style.borderRadius = "14px";
  bubble.style.boxShadow = "0 2px 12px rgba(36,99,235,0.07)";
  bubble.style.padding = "10px 16px 10px 16px";
  bubble.style.minHeight = "38px";
  bubble.style.zIndex = 9999;

  // BADGE NOMOR URUT
  const badge = document.createElement("span");
  badge.className = "feedback-badge";
  badge.textContent = index + 1;
  bubble.appendChild(badge);

  // Buat elemen span text feedback
  const textSpan = document.createElement("span");
  textSpan.className = "feedback-text";
  textSpan.style.fontSize = "0.99em";
  textSpan.style.maxWidth = "200px";
  textSpan.style.overflow = "hidden";
  textSpan.style.whiteSpace = "nowrap";
  textSpan.style.textOverflow = "ellipsis";
  textSpan.textContent = feedback.comment;

  // Cek apakah teks melebihi 200px (harus di-append dulu ke DOM!)
  // Untuk sementara, append, lalu cek scrollWidth > clientWidth
  bubble.appendChild(textSpan);
  document.body.appendChild(bubble);

  let showMoreBtn = null;
  if (textSpan.scrollWidth > textSpan.clientWidth) {
    showMoreBtn = document.createElement("button");
    showMoreBtn.textContent = "Readmore";
    showMoreBtn.className = "show-more-feedback-btn";
    showMoreBtn.style.background = "transparent";
    showMoreBtn.style.border = "none";
    showMoreBtn.style.color = "#2563eb";
    showMoreBtn.style.fontSize = "0.95em";
    showMoreBtn.style.cursor = "pointer";
    showMoreBtn.style.marginLeft = "2px";

    showMoreBtn.onclick = function (e) {
      e.stopPropagation();
      showFullFeedback(feedback.comment, bubble);
    };
    bubble.appendChild(showMoreBtn);
  }

  // Tombol edit
  const editBtn = document.createElement("button");
  editBtn.className = "edit-feedback-btn";
  editBtn.style.background = "#f1f5ff"; // Biru muda soft
  editBtn.style.border = "none";
  editBtn.style.color = "#2563eb";
  editBtn.style.fontSize = "1em";
  editBtn.style.cursor = "pointer";
  editBtn.style.marginLeft = "6px";
  editBtn.style.padding = "3px 7px";
  editBtn.style.borderRadius = "7px";
  editBtn.style.display = "flex";
  editBtn.style.alignItems = "center";
  editBtn.style.justifyContent = "center";
  editBtn.title = "Edit feedback";
  editBtn.innerHTML = `<svg data-icon-name="edit-alt-2" data-style="line" icon_origin_id="20450" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" id="edit-alt-2" class="icon line" width="14" height="14"><path style="fill: none; stroke: #2563eb; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5;" d="M10.47,9.29l4.24,4.24L7.24,21H3V16.76Zm9.94-2.88L17.59,3.59a1,1,0,0,0-1.42,0L13.29,6.47l4.24,4.24,2.88-2.88A1,1,0,0,0,20.41,6.41Z" id="primary"></path></svg>`;
  editBtn.onmouseover = () => (editBtn.style.background = "#e0e7ff");
  editBtn.onmouseout = () => (editBtn.style.background = "#f1f5ff");
  editBtn.onclick = function (e) {
    e.stopPropagation();
    showEditBox(bubble, feedback, index);
  };
  bubble.appendChild(editBtn);

  // Tombol hapus
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-feedback-btn";
  deleteBtn.style.background = "#fef2f2"; // Merah muda soft
  deleteBtn.style.border = "none";
  deleteBtn.style.color = "#ef4444";
  deleteBtn.style.fontSize = "1em";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.style.marginLeft = "0px";
  deleteBtn.style.padding = "3px 7px";
  deleteBtn.style.borderRadius = "7px";
  deleteBtn.style.display = "flex";
  deleteBtn.style.alignItems = "center";
  deleteBtn.style.justifyContent = "center";
  deleteBtn.title = "Hapus feedback";
  deleteBtn.innerHTML = `<svg data-icon-name="delete-alt" data-style="line" icon_origin_id="20441" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" id="delete-alt" class="icon line" width="14" height="14"><path style="fill: none; stroke: #ef4444; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5;" d="M4,7H20M16,7V4a1,1,0,0,0-1-1H9A1,1,0,0,0,8,4V7M18,20V7H6V20a1,1,0,0,0,1,1H17A1,1,0,0,0,18,20Zm-8-9v6m4-6v6" id="primary"></path></svg>`;
  deleteBtn.onmouseover = () => (deleteBtn.style.background = "#fde4e4");
  deleteBtn.onmouseout = () => (deleteBtn.style.background = "#fef2f2");
  deleteBtn.onclick = function (e) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this feedback?")) {
      deleteFeedbackByIndex(index, () => {
        renderAllFeedbacks();
      });
    }
  };
  bubble.appendChild(deleteBtn);

  // (Karena tadi sudah sempat append, biar tidak dobel, cek dan remove lalu re-append biar urutan benar)
  document.body.removeChild(bubble);
  document.body.appendChild(bubble);

  let isDragging = false;
  let offsetX = 0,
    offsetY = 0;

  bubble.style.cursor = "grab";
  bubble.onmousedown = function (e) {
    if (
      e.target.closest(".edit-feedback-btn") ||
      e.target.closest(".delete-feedback-btn") ||
      e.target.closest(".show-more-feedback-btn") ||
      e.target.classList.contains("feedback-badge")
    ) {
      // Jangan drag kalau klik tombol edit/hapus/badge
      return;
    }
    isDragging = true;
    bubble.style.cursor = "grabbing";
    offsetX = e.clientX - bubble.offsetLeft;
    offsetY = e.clientY - bubble.offsetTop;
    document.body.style.userSelect = "none";
  };

  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", onDrop);

  function onDrag(e) {
    if (!isDragging) return;
    const newLeft = e.clientX - offsetX;
    const newTop = e.clientY - offsetY;
    bubble.style.left = newLeft + "px";
    bubble.style.top = newTop + "px";
  }

  function onDrop(e) {
    if (isDragging) {
      isDragging = false;
      bubble.style.cursor = "grab";
      document.body.style.userSelect = "";
      // Save new position to storage
      updateFeedbackPosition(
        index,
        bubble.style.top,
        bubble.style.left,
        renderAllFeedbacks
      );
    }
  }
}

// Menampilkan modal/tips isi lengkap
function showFullFeedback(text, relativeToBubble) {
  // Hilangkan jika sudah ada
  let existing = document.getElementById("full-feedback-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "full-feedback-modal";
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%,-50%)";
  modal.style.background = "#fff";
  modal.style.border = "1.5px solid #2563eb";
  modal.style.borderRadius = "12px";
  modal.style.boxShadow = "0 4px 32px rgba(36,99,235,0.12)";
  modal.style.padding = "22px 22px 18px 22px";
  modal.style.zIndex = "999999";
  modal.style.maxWidth = "90vw";
  modal.style.minWidth = "260px";
  modal.style.maxHeight = "80vh";
  modal.style.overflowY = "auto";

  modal.innerHTML = `
      <div style="font-size:1.06em; margin-bottom:16px; color:#2563eb; font-weight:600;">Feedback Detail</div>
      <div style="font-size:1em; color:#222; word-break:break-word; margin-bottom:18px;">${escapeHtml(
        text
      )}</div>
      <button id="close-full-feedback-btn" style="background:#2563eb; color:#fff; border:none; border-radius:6px; padding:7px 18px; font-weight:600; font-size:1em; cursor:pointer;">Close</button>
    `;
  document.body.appendChild(modal);

  document.getElementById("close-full-feedback-btn").onclick = function () {
    modal.remove();
  };
  // Escape
  function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m];
    });
  }
}

// Edit feedback in-place
function showEditBox(bubble, feedback, index) {
  // Jangan buat double box
  if (document.getElementById("edit-feedback-box")) return;

  // Buat box edit di posisi bubble
  const editBox = document.createElement("div");
  editBox.id = "edit-feedback-box";
  editBox.className = "feedback-box";
  editBox.style.position = "absolute";
  editBox.style.zIndex = 999999;
  editBox.style.top = bubble.style.top;
  editBox.style.left = bubble.style.left;
  //   editBox.style.background = "#f9fafb";
  //   editBox.style.border = "1px solid #2563eb";
  editBox.style.borderRadius = "8px";
  editBox.style.padding = "8px";
  editBox.style.boxShadow = "0 2px 12px rgba(36,99,235,0.11)";

  editBox.innerHTML = `
      <textarea placeholder="Tulis feedback..." id="edit-feedback-text">${feedback.comment}</textarea>
      <div style="margin-top:7px; display:flex; gap:8px;">
        <button id="save-edit-btn">Save</button>
        <button id="cancel-edit-btn" class="close">Cancel</button>
      </div>
    `;
  document.body.appendChild(editBox);

  // Focus
  editBox.querySelector("#edit-feedback-text").focus();

  // Simpan perubahan
  editBox.querySelector("#save-edit-btn").onclick = () => {
    const newComment = editBox
      .querySelector("#edit-feedback-text")
      .value.trim();
    if (!newComment) {
      alert("Feedback cannot be empty.");
      return;
    }
    updateFeedbackComment(index, newComment, () => {
      document.body.removeChild(editBox);
      renderAllFeedbacks();
    });
  };

  // Batal
  editBox.querySelector("#cancel-edit-btn").onclick = () => {
    document.body.removeChild(editBox);
  };
}

// Hapus feedback berdasarkan index
function deleteFeedbackByIndex(index, callback) {
  const url = location.href;
  const key = "feedbacks-" + url;
  if (key === "feedbacks-undefined") return; // Cegah error jika URL tidak valid
  chrome.storage.local.get([key], function (result) {
    if (chrome.runtime.lastError) return;
    const list = result[key] || [];
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      chrome.storage.local.set({ [key]: list }, function () {
        if (callback) callback();
      });
    }
  });
}

// Update posisi feedback berdasarkan index
function updateFeedbackPosition(index, newTop, newLeft, callback) {
  const url = location.href;
  const key = "feedbacks-" + url;
  chrome.storage.local.get([key], function (result) {
    if (chrome.runtime.lastError) return;
    const list = result[key] || [];
    if (list[index]) {
      list[index].top = newTop;
      list[index].left = newLeft;
      chrome.storage.local.set({ [key]: list }, function () {
        if (callback) callback();
      });
    }
  });
}

// Handler state global agar bisa diaktifkan/dimatikan
let feedbackModeHandler = null;

// Handler Aktifkan
window.addEventListener("ENABLE_FEEDBACK_MODE", () => {
  if (window.__feedbackModeActive) return;
  window.__feedbackModeActive = true;
  //   alert("Feedback Mode Aktif: Klik elemen mana saja untuk beri komentar.");

  feedbackModeHandler = function handler(e) {
    if (e.target.closest(".feedback-box") || e.target.closest(".feedback-sent"))
      return;

    e.preventDefault();
    e.stopPropagation();

    const rect = e.target.getBoundingClientRect();
    const top = `${rect.top + window.scrollY}px`;
    const left = `${rect.left + window.scrollX}px`;

    const commentBox = document.createElement("div");
    commentBox.className = "feedback-box";
    commentBox.style.position = "absolute";
    commentBox.style.zIndex = 99999;
    commentBox.style.top = top;
    commentBox.style.left = left;
    commentBox.innerHTML = `
            <textarea placeholder="Write feedback..."></textarea>
            <div style="margin-top:8px; display:flex; gap:8px;">
              <button class="submit">Save</button>
              <button class="close">Cancel</button>
            </div>
          `;
    document.body.appendChild(commentBox);

    commentBox.querySelector("textarea").focus();

    commentBox.querySelector(".submit").addEventListener("click", () => {
      const comment = commentBox.querySelector("textarea").value.trim();
      if (!comment) {
        alert("Feedback cannot be empty.");
        return;
      }

      const feedback = {
        comment,
        top,
        left,
        timestamp: Date.now(),
      };

      // Simpan feedback
      saveFeedback(feedback);

      // Hapus comment box terlebih dahulu
      commentBox.remove();

      // Gunakan setTimeout untuk memastikan DOM update selesai
      setTimeout(() => {
        renderAllFeedbacks();
      }, 1000);
    });

    commentBox.querySelector(".close").addEventListener("click", () => {
      commentBox.remove();
    });
  };

  document.body.addEventListener("click", feedbackModeHandler, true);
});

// Handler Nonaktifkan
window.addEventListener("DISABLE_FEEDBACK_MODE", () => {
  window.__feedbackModeActive = false;
  if (feedbackModeHandler) {
    document.body.removeEventListener("click", feedbackModeHandler, true);
    feedbackModeHandler = null;
  }
});

// Render semua feedback yang sudah pernah dikirim, saat halaman dimuat
window.addEventListener("DOMContentLoaded", renderAllFeedbacks);
window.addEventListener("load", renderAllFeedbacks);
