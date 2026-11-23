const API_BASE = "https://tracuufb-baoduy-api.onrender.com";
const HISTORY_KEY = "tracuufb_baoduy_history_v1";

const yearEl = document.getElementById("year");
const queryInput = document.getElementById("query");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const openDirectBtn = document.getElementById("openDirectBtn");
const copyResultBtn = document.getElementById("copyResultBtn");
const fbLoginBtn = document.getElementById("facebookLogin");
const loadProfileBtn = document.getElementById("loadProfile");
const logoutBtn = document.getElementById("logoutBtn");
const noticeEl = document.getElementById("notice");
const profileBox = document.getElementById("fbProfile");
const apiHealthBadge = document.getElementById("apiHealthBadge");
const historyListEl = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const resultTypeEl = document.getElementById("resultType");
const outKindEl = document.getElementById("outKind");
const outIdentifierEl = document.getElementById("outIdentifier");
const outNormalizedUrlEl = document.getElementById("outNormalizedUrl");
const outSearchUrlEl = document.getElementById("outSearchUrl");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

let activeFilter = "top";
let activeMode = "smart";
let latestAnalysis = null;

const FILTER_PATHS = {
  top: "https://www.facebook.com/search/top/?q=",
  people: "https://www.facebook.com/search/people/?q=",
  pages: "https://www.facebook.com/search/pages/?q=",
  groups: "https://www.facebook.com/search/groups/?q=",
  posts: "https://www.facebook.com/search/posts/?q=",
  videos: "https://www.facebook.com/search/videos/?q="
};

function sanitizeInput(raw) {
  return String(raw || "").trim();
}

function analyzeInput(raw, filter = activeFilter) {
  const value = sanitizeInput(raw);
  if (!value) {
    return null;
  }

  const baseSearch = FILTER_PATHS[filter] || FILTER_PATHS.top;
  const searchUrl = baseSearch + encodeURIComponent(value);

  // Numeric UID
  if (/^\d{5,25}$/.test(value)) {
    return {
      raw: value,
      kind: "ID số Facebook (UID)",
      badge: "UID SỐ",
      identifier: value,
      normalizedUrl: `https://www.facebook.com/profile.php?id=${value}`,
      searchUrl
    };
  }

  // URL input
  const withProtocol = /^https?:\/\//i.test(value) ? value : (/^(www\.|m\.|mbasic\.)?facebook\.com\//i.test(value) ? "https://" + value : null);
  if (withProtocol) {
    try {
      const parsed = new URL(withProtocol);
      const isFb = /(^|\.)facebook\.com$/i.test(parsed.hostname) || /(^|\.)fb\.watch$/i.test(parsed.hostname);
      const cleanHost = isFb ? "https://www.facebook.com" : `${parsed.protocol}//${parsed.hostname}`;
      const idParam = parsed.searchParams.get("id") || parsed.searchParams.get("story_fbid") || parsed.searchParams.get("v");
      const segments = parsed.pathname.split("/").filter(Boolean);
      let identifier = idParam || (segments.length ? segments.join("/") : parsed.hostname);
      if (segments[0] === "profile.php" && idParam) {
        identifier = idParam;
      }
      const normalizedUrl = isFb ? `${cleanHost}${parsed.pathname}${parsed.search}` : parsed.toString();
      return {
        raw: value,
        kind: isFb ? "Liên kết Facebook" : "Liên kết ngoài",
        badge: isFb ? "FACEBOOK URL" : "LIÊN KẾT",
        identifier,
        normalizedUrl,
        searchUrl: baseSearch + encodeURIComponent(identifier)
      };
    } catch {
      // Fall through to keyword
    }
  }

  // Handle / username without spaces
  if (/^@?[a-zA-Z0-9._]{3,50}$/.test(value)) {
    const handle = value.replace(/^@/, "");
    return {
      raw: value,
      kind: "Tên người dùng / Trang",
      badge: "USERNAME",
      identifier: handle,
      normalizedUrl: `https://www.facebook.com/${encodeURIComponent(handle)}`,
      searchUrl
    };
  }

  // Keyword / name
  return {
    raw: value,
    kind: "Từ khóa / Tên tìm kiếm",
    badge: "TỪ KHÓA",
    identifier: value,
    normalizedUrl: searchUrl,
    searchUrl
  };
}

function renderAnalysis(info) {
  latestAnalysis = info;
  if (!info) {
    resultTypeEl.textContent = "CHỜ NHẬP DỮ LIỆU";
    outKindEl.textContent = "—";
    outIdentifierEl.textContent = "—";
    outNormalizedUrlEl.textContent = "—";
    outSearchUrlEl.textContent = "—";
    return;
  }
  resultTypeEl.textContent = info.badge;
  outKindEl.textContent = info.kind;
  outIdentifierEl.textContent = info.identifier;
  outNormalizedUrlEl.textContent = info.normalizedUrl;
  outSearchUrlEl.textContent = info.searchUrl;
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryItem(info) {
  if (!info) return;
  const current = getHistory().filter((item) => item.raw !== info.raw);
  current.unshift({ raw: info.raw, badge: info.badge });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(0, 12)));
  renderHistory();
}

function renderHistory() {
  const items = getHistory();
  historyListEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "Chưa có truy vấn nào được lưu.";
    historyListEl.appendChild(empty);
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    li.className = "history-item";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.raw;
    btn.title = item.raw;
    btn.addEventListener("click", () => {
      queryInput.value = item.raw;
      const analyzed = analyzeInput(item.raw);
      renderAnalysis(analyzed);
      noticeEl.textContent = "Đã nạp lại truy vấn từ lịch sử.";
    });
    const tag = document.createElement("span");
    tag.className = "history-tag";
    tag.textContent = item.badge || "MỤC";
    li.appendChild(btn);
    li.appendChild(tag);
    historyListEl.appendChild(li);
  }
}

function runLookup(openInNewTab = true) {
  const info = analyzeInput(queryInput.value, activeFilter);
  if (!info) {
    renderAnalysis(null);
    noticeEl.textContent = "Vui lòng nhập đường dẫn Facebook, ID số hoặc từ khóa trước.";
    queryInput.focus();
    return;
  }
  renderAnalysis(info);
  saveHistoryItem(info);

  const targetUrl = activeMode === "link-tools" ? info.normalizedUrl : info.searchUrl;
  if (openInNewTab) {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    noticeEl.textContent = `Đã phân tích (${info.kind}) và mở tab kết quả trên Facebook.`;
  } else {
    noticeEl.textContent = `Đã phân tích (${info.kind}). Bạn có thể mở liên kết hoặc sao chép kết quả.`;
  }
}

searchBtn.addEventListener("click", () => runLookup(true));
queryInput.addEventListener("input", () => {
  renderAnalysis(analyzeInput(queryInput.value, activeFilter));
});
queryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runLookup(true);
  }
});

clearBtn.addEventListener("click", () => {
  queryInput.value = "";
  renderAnalysis(null);
  noticeEl.textContent = "Đã xóa nội dung ô tra cứu.";
  queryInput.focus();
});

openDirectBtn.addEventListener("click", () => {
  const info = latestAnalysis || analyzeInput(queryInput.value, activeFilter);
  if (!info) {
    noticeEl.textContent = "Hãy nhập liên kết hoặc tên/ID trước khi mở trực tiếp.";
    return;
  }
  renderAnalysis(info);
  window.open(info.normalizedUrl, "_blank", "noopener,noreferrer");
  noticeEl.textContent = "Đang mở URL chuẩn hóa trong tab mới.";
});

copyResultBtn.addEventListener("click", async () => {
  const info = latestAnalysis || analyzeInput(queryInput.value, activeFilter);
  if (!info) {
    noticeEl.textContent = "Chưa có dữ liệu phân tích để sao chép.";
    return;
  }
  const summary = `Loại: ${info.kind}
Định danh: ${info.identifier}
URL chuẩn hóa: ${info.normalizedUrl}
URL tìm kiếm: ${info.searchUrl}`;
  try {
    await navigator.clipboard.writeText(summary);
    noticeEl.textContent = "Đã sao chép thông tin phân tích vào bộ nhớ tạm.";
  } catch {
    noticeEl.textContent = "Trình duyệt chặn sao chép tự động; hãy sao chép trực tiếp từ các ô phía trên.";
  }
});

document.querySelectorAll(".sample-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sample = btn.getAttribute("data-sample") || "";
    queryInput.value = sample;
    const info = analyzeInput(sample, activeFilter);
    renderAnalysis(info);
    noticeEl.textContent = `Đã điền dữ liệu mẫu: ${sample}`;
  });
});

document.querySelectorAll(".filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    activeFilter = pill.getAttribute("data-filter") || "top";
    if (queryInput.value.trim()) {
      renderAnalysis(analyzeInput(queryInput.value, activeFilter));
    }
  });
});

document.querySelectorAll(".tab-btn").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((t) => {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    activeMode = tab.getAttribute("data-mode") || "smart";
    if (activeMode === "oauth") {
      noticeEl.textContent = "Chế độ Hồ sơ OAuth: Nhấn “Đăng nhập Facebook” để xác thực, sau đó nhấn “Xem hồ sơ đã cấp quyền”.";
    } else if (activeMode === "link-tools") {
      noticeEl.textContent = "Chế độ Chuẩn hóa & Tách ID: Tự động nhận diện UID số, username và URL chuẩn hóa.";
    } else {
      noticeEl.textContent = "Chế độ Phân tích & Tra cứu: Phân tích đầu vào và mở tìm kiếm theo bộ lọc Facebook.";
    }
  });
});

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  noticeEl.textContent = "Đã xóa lịch sử tra cứu cục bộ.";
});

fbLoginBtn.addEventListener("click", () => {
  window.location.href = API_BASE.replace(/\/$/, "") + "/auth/facebook";
});

loadProfileBtn.addEventListener("click", async () => {
  noticeEl.textContent = "Đang kiểm tra hồ sơ Facebook từ backend…";
  try {
    const response = await fetch(API_BASE.replace(/\/$/, "") + "/api/me", {
      credentials: "include"
    });
    if (response.status === 401) {
      profileBox.hidden = true;
      noticeEl.textContent = "Phiên chưa đăng nhập Facebook (401). Hãy nhấn “Đăng nhập Facebook” trước.";
      return;
    }
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    const result = await response.json();
    const user = result.data || {};
    profileBox.innerHTML = "";
    if (user.picture?.data?.url) {
      const img = document.createElement("img");
      img.src = user.picture.data.url;
      img.alt = "Ảnh đại diện Facebook";
      profileBox.appendChild(img);
    }
    const meta = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.style.fontWeight = "700";
    nameEl.textContent = user.name || "Facebook User";
    const idEl = document.createElement("div");
    idEl.style.fontSize = "12px";
    idEl.style.color = "#93c5fd";
    idEl.textContent = user.id ? `ID được cấp quyền: ${user.id}` : "Đã xác thực";
    meta.appendChild(nameEl);
    meta.appendChild(idEl);
    profileBox.appendChild(meta);
    profileBox.hidden = false;
    noticeEl.textContent = "Đã tải thông tin hồ sơ Facebook được cấp quyền.";
  } catch {
    noticeEl.textContent = "Không kết nối được API backend. Kiểm tra máy chủ Render, HTTPS và CORS.";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch(API_BASE.replace(/\/$/, "") + "/auth/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch {
    // Ignore network error on logout
  }
  profileBox.hidden = true;
  profileBox.innerHTML = "";
  noticeEl.textContent = "Đã đăng xuất phiên hồ sơ cục bộ.";
});

async function checkBackendHealth() {
  try {
    const res = await fetch(API_BASE.replace(/\/$/, "") + "/health", { cache: "no-store" });
    if (res.ok) {
      apiHealthBadge.textContent = "API Render: Sẵn sàng";
      apiHealthBadge.className = "api-status is-online";
    } else {
      apiHealthBadge.textContent = "API Render: Đang phản hồi mã " + res.status;
      apiHealthBadge.className = "api-status is-offline";
    }
  } catch {
    apiHealthBadge.textContent = "API Render: Đang thức giấc / Chưa kết nối";
    apiHealthBadge.className = "api-status is-offline";
  }
}

const fbLoginStatus = new URLSearchParams(location.search).get("fb_login");
if (fbLoginStatus === "success") {
  noticeEl.textContent = "Đăng nhập Facebook thành công! Nhấn “Xem hồ sơ đã cấp quyền” để hiển thị.";
  history.replaceState({}, document.title, location.pathname);
} else if (fbLoginStatus === "error") {
  noticeEl.textContent = "Đăng nhập Facebook chưa thành công. Kiểm tra cấu hình Meta App ID/Secret và Redirect URI trên Meta.";
  history.replaceState({}, document.title, location.pathname);
}

renderHistory();
checkBackendHealth();
