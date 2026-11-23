const API_BASE = "https://tracuufb-baoduy-api.onrender.com";
const HISTORY_KEY = "tracuufb_baoduy_history_v1";
const AR_RULES_KEY = "tracuufb_baoduy_autoreply_rules_v1";
const AR_DEFAULT_KEY = "tracuufb_baoduy_autoreply_default_v1";

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

const batchExtractBox = document.getElementById("batchExtractBox");
const batchInput = document.getElementById("batchInput");
const runBatchExtractBtn = document.getElementById("runBatchExtractBtn");
const copyBatchBtn = document.getElementById("copyBatchBtn");
const batchOutput = document.getElementById("batchOutput");

const videoUrlInput = document.getElementById("videoUrlInput");
const syncVideoFromQueryBtn = document.getElementById("syncVideoFromQueryBtn");
const analyzeVideoBtn = document.getElementById("analyzeVideoBtn");
const openVideoTabBtn = document.getElementById("openVideoTabBtn");
const copyVideoUrlBtn = document.getElementById("copyVideoUrlBtn");
const fetchBackendVideoBtn = document.getElementById("fetchBackendVideoBtn");
const vdKindEl = document.getElementById("vdKind");
const vdIdEl = document.getElementById("vdId");
const vdNormalizedEl = document.getElementById("vdNormalized");
const vdStatusEl = document.getElementById("vdStatus");

const ttUrlInput = document.getElementById("ttUrlInput");
const ttFetchBtn = document.getElementById("ttFetchBtn");
const ttClearBtn = document.getElementById("ttClearBtn");
const ttDownloadLink = document.getElementById("ttDownloadLink");
const ttCopyNoWatermarkBtn = document.getElementById("ttCopyNoWatermarkBtn");
const ttOpenOriginalBtn = document.getElementById("ttOpenOriginalBtn");
const ttAuthorEl = document.getElementById("ttAuthor");
const ttVideoIdEl = document.getElementById("ttVideoId");
const ttNoWmStatusEl = document.getElementById("ttNoWmStatus");
const ttStatusEl = document.getElementById("ttStatus");

const arKeywordsEl = document.getElementById("arKeywords");
const arMatchModeEl = document.getElementById("arMatchMode");
const arReplyTextEl = document.getElementById("arReplyText");
const addRuleBtn = document.getElementById("addRuleBtn");
const saveDefaultReplyBtn = document.getElementById("saveDefaultReplyBtn");
const syncRulesApiBtn = document.getElementById("syncRulesApiBtn");
const clearRulesBtn = document.getElementById("clearRulesBtn");
const arDefaultInputEl = document.getElementById("arDefaultInput");
const arRuleCountEl = document.getElementById("arRuleCount");
const arRulesListEl = document.getElementById("arRulesList");
const arTestMsgEl = document.getElementById("arTestMsg");
const testAutoReplyBtn = document.getElementById("testAutoReplyBtn");
const arSimOutputEl = document.getElementById("arSimOutput");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

let activeFilter = "top";
let activeMode = "smart";
let latestAnalysis = null;
let latestVideoInfo = null;
let latestTikTokResult = null;

const FILTER_PATHS = {
  top: "https://www.facebook.com/search/top/?q=",
  people: "https://www.facebook.com/search/people/?q=",
  pages: "https://www.facebook.com/search/pages/?q=",
  groups: "https://www.facebook.com/search/groups/?q=",
  posts: "https://www.facebook.com/search/posts/?q=",
  videos: "https://www.facebook.com/search/videos/?q="
};

const QUICK_ROUTES = {
  home: "https://www.facebook.com/",
  friends: "https://www.facebook.com/friends",
  groups: "https://www.facebook.com/groups/feed/",
  pages: "https://www.facebook.com/pages/",
  watch: "https://www.facebook.com/watch/",
  bookmarks: "https://www.facebook.com/bookmarks/"
};

function sanitizeInput(raw) {
  return String(raw || "").trim();
}

function analyzeInput(raw, filter = activeFilter) {
  const value = sanitizeInput(raw);
  if (!value) return null;

  const baseSearch = FILTER_PATHS[filter] || FILTER_PATHS.top;
  const searchUrl = baseSearch + encodeURIComponent(value);

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

  const withProtocol = /^https?:\/\//i.test(value)
    ? value
    : (/^(www\.|m\.|mbasic\.)?facebook\.com\//i.test(value) ? "https://" + value : null);

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
      // Fallback to keyword
    }
  }

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

function parseFacebookVideoUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  try {
    const u = new URL(candidate);
    const host = u.hostname.toLowerCase();
    const isFbHost = /(^|\.)facebook\.com$/.test(host) || /(^|\.)fb\.watch$/.test(host) || host === "fb.com" || host === "www.fb.com";
    if (!isFbHost) {
      return {
        valid: false,
        reason: "Liên kết không thuộc tên miền Facebook (facebook.com / fb.watch)."
      };
    }

    const segments = u.pathname.split("/").filter(Boolean);
    const vParam = u.searchParams.get("v") || u.searchParams.get("story_fbid");
    let kind = "Video Facebook";
    let videoId = vParam || "—";
    let normalized = `https://www.facebook.com${u.pathname}${u.search}`;

    if (host.endsWith("fb.watch")) {
      kind = "Facebook Watch Short (fb.watch)";
      videoId = segments[0] || "—";
      normalized = `https://fb.watch/${segments.join("/")}`;
    } else if (u.pathname.includes("/reel/")) {
      kind = "Facebook Reels";
      const idx = segments.indexOf("reel");
      videoId = (idx >= 0 && segments[idx + 1]) ? segments[idx + 1] : (vParam || "—");
      normalized = `https://www.facebook.com/reel/${videoId}`;
    } else if (u.pathname.includes("/videos/")) {
      kind = "Video bài đăng / Trang";
      const idx = segments.indexOf("videos");
      videoId = (idx >= 0 && segments[idx + 1]) ? segments[idx + 1] : (vParam || "—");
    } else if (u.pathname.includes("/watch")) {
      kind = "Facebook Watch";
      videoId = vParam || segments[1] || "—";
      normalized = vParam ? `https://www.facebook.com/watch/?v=${encodeURIComponent(vParam)}` : normalized;
    }

    return {
      valid: true,
      raw: trimmed,
      kind,
      videoId,
      normalized
    };
  } catch {
    return {
      valid: false,
      reason: "Định dạng URL video không hợp lệ."
    };
  }
}

function renderVideoAnalysis(info) {
  latestVideoInfo = info && info.valid ? info : null;
  if (!info) {
    vdKindEl.textContent = "—";
    vdIdEl.textContent = "—";
    vdNormalizedEl.textContent = "—";
    return;
  }
  if (!info.valid) {
    vdKindEl.textContent = "Không hợp lệ";
    vdIdEl.textContent = "—";
    vdNormalizedEl.textContent = "—";
    vdStatusEl.textContent = info.reason;
    return;
  }
  vdKindEl.textContent = info.kind;
  vdIdEl.textContent = info.videoId;
  vdNormalizedEl.textContent = info.normalized;
  vdStatusEl.textContent = `Đã nhận diện ${info.kind} (ID: ${info.videoId}). Bạn có thể mở video tab mới hoặc sao chép link chuẩn.`;
}

function parseTikTokUrlLocal(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  try {
    const u = new URL(candidate);
    const host = u.hostname.toLowerCase();
    const isTikTok = /(^|\.)tiktok\.com$/.test(host);
    if (!isTikTok) {
      return { valid: false, reason: "Liên kết không thuộc tên miền tiktok.com." };
    }
    const segments = u.pathname.split("/").filter(Boolean);
    const authorMatch = segments.find((s) => s.startsWith("@")) || (segments[0] && !["t", "v", "embed"].includes(segments[0]) ? segments[0] : "—");
    const vidIdx = segments.indexOf("video");
    const videoId = (vidIdx >= 0 && segments[vidIdx + 1])
      ? segments[vidIdx + 1].replace(/[^\d]/g, "")
      : (segments.find((s) => /^\d{8,25}$/.test(s)) || "—");

    return {
      valid: true,
      originalUrl: u.toString(),
      author: authorMatch ? authorMatch.replace(/^@/, "") : "—",
      videoId: videoId || "—"
    };
  } catch {
    return { valid: false, reason: "Định dạng URL TikTok không hợp lệ." };
  }
}

function resetTikTokDownloadButton() {
  if (!ttDownloadLink) return;
  ttDownloadLink.setAttribute("aria-disabled", "true");
  ttDownloadLink.href = "#";
  ttDownloadLink.removeAttribute("download");
}

function setTikTokDownloadReady(noWatermarkUrl, filename = "tiktok-no-watermark.mp4") {
  if (!ttDownloadLink || !noWatermarkUrl) {
    resetTikTokDownloadButton();
    return;
  }
  ttDownloadLink.href = noWatermarkUrl;
  ttDownloadLink.setAttribute("download", filename);
  ttDownloadLink.setAttribute("aria-disabled", "false");
}

if (ttFetchBtn) {
  ttFetchBtn.addEventListener("click", async () => {
    const raw = (ttUrlInput?.value || "").trim();
    const parsed = parseTikTokUrlLocal(raw);
    if (!parsed || !parsed.valid) {
      resetTikTokDownloadButton();
      latestTikTokResult = null;
      ttAuthorEl.textContent = "—";
      ttVideoIdEl.textContent = "—";
      ttNoWmStatusEl.textContent = "Không hợp lệ";
      ttStatusEl.textContent = parsed?.reason || "Vui lòng nhập liên kết video TikTok hợp lệ.";
      return;
    }

    latestTikTokResult = {
      originalUrl: parsed.originalUrl,
      author: parsed.author,
      videoId: parsed.videoId,
      noWatermarkUrl: ""
    };
    ttAuthorEl.textContent = parsed.author ? `@${parsed.author}` : "—";
    ttVideoIdEl.textContent = parsed.videoId || "—";
    ttNoWmStatusEl.textContent = "Đang xử lý…";
    ttStatusEl.textContent = "Đang gửi yêu cầu phân tích link TikTok không logo tới backend API…";
    resetTikTokDownloadButton();

    try {
      const endpoint = API_BASE.replace(/\/$/, "") + "/api/tiktok/download?url=" + encodeURIComponent(parsed.originalUrl);
      const res = await fetch(endpoint, { credentials: "include" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        ttNoWmStatusEl.textContent = "Cần cấu hình resolver";
        ttStatusEl.textContent = data.message || `Backend phản hồi mã ${res.status}. Hãy cấu hình TIKTOK_RESOLVER_API hoặc TIKTOK_NO_WM_URL trên server Render.`;
        return;
      }

      const noWmUrl = data.noWatermarkUrl || data.playUrl || "";
      latestTikTokResult = {
        originalUrl: parsed.originalUrl,
        author: data.author || parsed.author,
        videoId: data.videoId || parsed.videoId,
        noWatermarkUrl: noWmUrl
      };
      ttAuthorEl.textContent = latestTikTokResult.author ? `@${latestTikTokResult.author.replace(/^@/, "")}` : "—";
      ttVideoIdEl.textContent = latestTikTokResult.videoId || "—";

      if (noWmUrl) {
        const fileName = `tiktok-${latestTikTokResult.videoId || "video"}-no-watermark.mp4`;
        setTikTokDownloadReady(noWmUrl, fileName);
        ttNoWmStatusEl.textContent = "Sẵn sàng tải (.mp4)";
        ttStatusEl.textContent = data.message || "Đã lấy được liên kết video TikTok không logo. Nhấn “Tải video không logo (.mp4)” hoặc sao chép link.";
      } else {
        ttNoWmStatusEl.textContent = "Chưa có URL video";
        ttStatusEl.textContent = data.message || "API đã phản hồi nhưng chưa trả về URL file video không logo.";
      }
    } catch {
      ttNoWmStatusEl.textContent = "Lỗi kết nối API";
      ttStatusEl.textContent = "Không kết nối được backend API để lấy luồng video không logo. Kiểm tra máy chủ Render và endpoint /api/tiktok/download.";
    }
  });
}

if (ttClearBtn) {
  ttClearBtn.addEventListener("click", () => {
    if (ttUrlInput) ttUrlInput.value = "";
    latestTikTokResult = null;
    ttAuthorEl.textContent = "—";
    ttVideoIdEl.textContent = "—";
    ttNoWmStatusEl.textContent = "Chưa lấy link";
    ttStatusEl.textContent = "Đã xóa nội dung liên kết TikTok.";
    resetTikTokDownloadButton();
  });
}

if (ttCopyNoWatermarkBtn) {
  ttCopyNoWatermarkBtn.addEventListener("click", async () => {
    const url = latestTikTokResult?.noWatermarkUrl || "";
    if (!url) {
      ttStatusEl.textContent = "Chưa có liên kết video không logo để sao chép.";
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      ttStatusEl.textContent = "Đã sao chép liên kết video TikTok không logo vào bộ nhớ tạm.";
    } catch {
      ttStatusEl.textContent = "Không thể tự động sao chép; hãy sao chép trực tiếp từ nút tải.";
    }
  });
}

if (ttOpenOriginalBtn) {
  ttOpenOriginalBtn.addEventListener("click", () => {
    const parsed = parseTikTokUrlLocal(ttUrlInput?.value || "");
    if (!parsed || !parsed.valid) {
      ttStatusEl.textContent = "Vui lòng nhập link TikTok hợp lệ trước khi mở.";
      return;
    }
    window.open(parsed.originalUrl, "_blank", "noopener,noreferrer");
    ttStatusEl.textContent = "Đã mở liên kết gốc TikTok trong tab mới.";
  });
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
  const summary = `Loại: ${info.kind}\nĐịnh danh: ${info.identifier}\nURL chuẩn hóa: ${info.normalizedUrl}\nURL tìm kiếm: ${info.searchUrl}`;
  try {
    await navigator.clipboard.writeText(summary);
    noticeEl.textContent = "Đã sao chép thông tin phân tích vào bộ nhớ tạm.";
  } catch {
    noticeEl.textContent = "Trình duyệt chặn sao chép tự động; hãy sao chép trực tiếp từ các ô phía trên.";
  }
});

document.querySelectorAll(".qn-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const route = btn.getAttribute("data-fb-route");
    if (route === "extract-batch") {
      if (batchExtractBox) {
        batchExtractBox.hidden = !batchExtractBox.hidden;
        if (!batchExtractBox.hidden && batchInput) {
          batchInput.focus();
        }
      }
      return;
    }
    if (route === "sharer") {
      const targetUrl = latestAnalysis?.normalizedUrl || queryInput.value.trim() || "https://nguyenbaoduy-bdi.github.io/TraCuFb-BaoDuy/";
      const shareUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(targetUrl);
      window.open(shareUrl, "_blank", "noopener,noreferrer");
      noticeEl.textContent = "Đã mở hộp thoại chia sẻ liên kết trên Facebook.";
      return;
    }
    if (route && QUICK_ROUTES[route]) {
      window.open(QUICK_ROUTES[route], "_blank", "noopener,noreferrer");
      noticeEl.textContent = `Đã mở lối tắt ${btn.textContent.trim()} trên Facebook.`;
    }
  });
});

function extractBatchItems(rawText) {
  const lines = String(rawText || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    const analyzed = analyzeInput(line, activeFilter);
    if (analyzed) {
      results.push(`${analyzed.badge} | ${analyzed.identifier} -> ${analyzed.normalizedUrl}`);
    }
  }
  return results;
}

if (runBatchExtractBtn) {
  runBatchExtractBtn.addEventListener("click", () => {
    const items = extractBatchItems(batchInput?.value || "");
    if (!items.length) {
      batchOutput.textContent = "Không tìm thấy dòng hợp lệ để chuẩn hóa.";
      return;
    }
    batchOutput.textContent = items.join("\n");
    noticeEl.textContent = `Đã chuẩn hóa ${items.length} dòng trong danh sách.`;
  });
}

if (copyBatchBtn) {
  copyBatchBtn.addEventListener("click", async () => {
    const text = (batchOutput?.textContent || "").trim();
    if (!text || text.startsWith("Chưa có") || text.startsWith("Không tìm thấy")) {
      noticeEl.textContent = "Chưa có kết quả danh sách để sao chép.";
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      noticeEl.textContent = "Đã sao chép kết quả danh sách vào bộ nhớ tạm.";
    } catch {
      noticeEl.textContent = "Không thể tự động sao chép; hãy sao chép trực tiếp từ khung kết quả.";
    }
  });
}

syncVideoFromQueryBtn.addEventListener("click", () => {
  const val = queryInput.value.trim();
  if (!val) {
    vdStatusEl.textContent = "Ô tra cứu ở trên đang trống. Hãy dán link video trước.";
    return;
  }
  videoUrlInput.value = val;
  renderVideoAnalysis(parseFacebookVideoUrl(val));
});

analyzeVideoBtn.addEventListener("click", () => {
  const val = videoUrlInput.value.trim();
  if (!val) {
    vdStatusEl.textContent = "Vui lòng nhập đường dẫn video Facebook.";
    videoUrlInput.focus();
    return;
  }
  renderVideoAnalysis(parseFacebookVideoUrl(val));
});

videoUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    renderVideoAnalysis(parseFacebookVideoUrl(videoUrlInput.value));
  }
});

openVideoTabBtn.addEventListener("click", () => {
  const info = latestVideoInfo || parseFacebookVideoUrl(videoUrlInput.value);
  if (!info || !info.valid) {
    vdStatusEl.textContent = "Chưa có link video Facebook hợp lệ để mở.";
    return;
  }
  renderVideoAnalysis(info);
  window.open(info.normalized, "_blank", "noopener,noreferrer");
  vdStatusEl.textContent = "Đã mở liên kết video trong tab mới.";
});

copyVideoUrlBtn.addEventListener("click", async () => {
  const info = latestVideoInfo || parseFacebookVideoUrl(videoUrlInput.value);
  if (!info || !info.valid) {
    vdStatusEl.textContent = "Chưa có link video hợp lệ để sao chép.";
    return;
  }
  try {
    await navigator.clipboard.writeText(info.normalized);
    vdStatusEl.textContent = "Đã sao chép URL video chuẩn hóa vào bộ nhớ tạm.";
  } catch {
    vdStatusEl.textContent = "Không thể tự động sao chép; hãy sao chép trực tiếp từ ô URL video chuẩn hóa.";
  }
});

fetchBackendVideoBtn.addEventListener("click", async () => {
  const info = latestVideoInfo || parseFacebookVideoUrl(videoUrlInput.value);
  if (!info || !info.valid) {
    vdStatusEl.textContent = "Hãy nhập link video Facebook hợp lệ trước khi kiểm tra qua API.";
    return;
  }
  vdStatusEl.textContent = "Đang kiểm tra thông tin đường dẫn video qua backend…";
  try {
    const endpoint = API_BASE.replace(/\/$/, "") + "/api/video-info?url=" + encodeURIComponent(info.normalized);
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      vdStatusEl.textContent = `Backend phản hồi mã ${res.status}. Bạn vẫn có thể dùng link chuẩn hóa phía trên.`;
      return;
    }
    const data = await res.json();
    vdStatusEl.textContent = data.message || `Đã kiểm tra link (${info.kind}). Việc tải media phụ thuộc trạng thái công khai và chính sách Facebook.`;
  } catch {
    vdStatusEl.textContent = "Không kết nối được backend hoặc CORS chưa bật; bạn vẫn có thể mở trực tiếp link video chuẩn hóa.";
  }
});

function loadArRules() {
  try {
    const raw = JSON.parse(localStorage.getItem(AR_RULES_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveArRules(rules) {
  localStorage.setItem(AR_RULES_KEY, JSON.stringify(rules));
  renderArRules();
}

function getDefaultArReply() {
  return localStorage.getItem(AR_DEFAULT_KEY) || (arDefaultInputEl?.value || "").trim() ||
    "Cảm ơn bạn đã liên hệ TraCuuFB-BaoDuy. Tin nhắn của bạn đã được ghi nhận.";
}

function setDefaultArReply(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  localStorage.setItem(AR_DEFAULT_KEY, clean);
  if (arDefaultInputEl) arDefaultInputEl.value = clean;
}

function matchSingleRule(message, rule) {
  const msg = String(message || "").trim();
  const mode = rule.matchMode || "contains";
  const keywords = Array.isArray(rule.keywords) ? rule.keywords : [];

  for (const kw of keywords) {
    const k = String(kw || "").trim();
    if (!k) continue;
    const msgLower = msg.toLowerCase();
    const kLower = k.toLowerCase();
    if (mode === "exact" && msgLower === kLower) return k;
    if (mode === "startswith" && msgLower.startsWith(kLower)) return k;
    if (mode === "contains" && msgLower.includes(kLower)) return k;
  }
  return null;
}

function evaluateAutoReply(message) {
  const rules = loadArRules();
  for (const rule of rules) {
    const matchedKw = matchSingleRule(message, rule);
    if (matchedKw) {
      return {
        matched: true,
        matchedKeyword: matchedKw,
        reply: rule.reply
      };
    }
  }
  return {
    matched: false,
    matchedKeyword: null,
    reply: getDefaultArReply()
  };
}

function renderArRules() {
  if (!arRulesListEl || !arRuleCountEl) return;
  const rules = loadArRules();
  arRuleCountEl.textContent = `${rules.length} quy tắc`;
  arRulesListEl.innerHTML = "";

  if (!rules.length) {
    const li = document.createElement("li");
    li.className = "ar-empty";
    li.textContent = "Chưa có quy tắc từ khóa nào. Hệ thống sẽ dùng câu trả lời mặc định.";
    arRulesListEl.appendChild(li);
    return;
  }

  rules.forEach((rule, index) => {
    const li = document.createElement("li");
    li.className = "ar-rule-item";

    const body = document.createElement("div");
    body.className = "ar-rule-body";

    const kwDiv = document.createElement("div");
    kwDiv.className = "ar-rule-kw";
    const modeLabel = rule.matchMode === "exact" ? "Khớp hẳn" : (rule.matchMode === "startswith" ? "Đầu câu" : "Chứa từ");
    kwDiv.textContent = `[${modeLabel}] Từ khóa: ${(rule.keywords || []).join(", ")}`;

    const replyDiv = document.createElement("div");
    replyDiv.className = "ar-rule-text";
    replyDiv.textContent = `Trả lời: ${rule.reply}`;

    body.appendChild(kwDiv);
    body.appendChild(replyDiv);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ar-rule-del";
    delBtn.textContent = "Xóa";
    delBtn.addEventListener("click", () => {
      const next = loadArRules().filter((_, i) => i !== index);
      saveArRules(next);
      noticeEl.textContent = "Đã xóa một quy tắc trả lời tự động.";
    });

    li.appendChild(body);
    li.appendChild(delBtn);
    arRulesListEl.appendChild(li);
  });
}

if (addRuleBtn) {
  addRuleBtn.addEventListener("click", () => {
    const rawKw = (arKeywordsEl?.value || "").trim();
    const replyText = (arReplyTextEl?.value || "").trim();
    const matchMode = arMatchModeEl?.value || "contains";

    const keywords = rawKw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!keywords.length || !replyText) {
      arSimOutputEl.textContent = "Vui lòng nhập ít nhất một từ khóa và nội dung trả lời tự động.";
      return;
    }

    const rules = loadArRules();
    rules.unshift({
      id: String(Date.now()),
      keywords,
      matchMode,
      reply: replyText
    });
    saveArRules(rules);

    if (arKeywordsEl) arKeywordsEl.value = "";
    if (arReplyTextEl) arReplyTextEl.value = "";
    arSimOutputEl.textContent = `Đã thêm quy tắc cho từ khóa: ${keywords.join(", ")}. Bạn có thể nhập tin nhắn bên dưới để chạy thử.`;
    noticeEl.textContent = "Đã lưu quy tắc tự động trả lời mới.";
  });
}

if (saveDefaultReplyBtn) {
  saveDefaultReplyBtn.addEventListener("click", () => {
    const text = (arDefaultInputEl?.value || "").trim();
    if (!text) {
      arSimOutputEl.textContent = "Câu trả lời mặc định không được để trống.";
      return;
    }
    setDefaultArReply(text);
    arSimOutputEl.textContent = `Đã lưu câu trả lời mặc định: "${text}"`;
    noticeEl.textContent = "Đã cập nhật câu trả lời mặc định.";
  });
}

if (clearRulesBtn) {
  clearRulesBtn.addEventListener("click", () => {
    saveArRules([]);
    arSimOutputEl.textContent = "Đã xóa toàn bộ quy tắc từ khóa.";
    noticeEl.textContent = "Đã xóa danh sách quy tắc tự động trả lời.";
  });
}

if (testAutoReplyBtn) {
  testAutoReplyBtn.addEventListener("click", () => {
    const msg = (arTestMsgEl?.value || "").trim();
    if (!msg) {
      arSimOutputEl.textContent = "Hãy nhập nội dung tin nhắn khách gửi để kiểm tra phản hồi tự động.";
      return;
    }
    const res = evaluateAutoReply(msg);
    if (res.matched) {
      arSimOutputEl.textContent = `Khớp từ khóa "${res.matchedKeyword}" → Phản hồi tự động:\n${res.reply}`;
    } else {
      arSimOutputEl.textContent = `Không khớp từ khóa riêng → Phản hồi mặc định:\n${res.reply}`;
    }
  });
}

if (arTestMsgEl) {
  arTestMsgEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      testAutoReplyBtn?.click();
    }
  });
}

if (syncRulesApiBtn) {
  syncRulesApiBtn.addEventListener("click", async () => {
    const payload = {
      defaultReply: getDefaultArReply(),
      rules: loadArRules()
    };
    arSimOutputEl.textContent = "Đang đồng bộ quy tắc trả lời tự động lên backend API…";
    try {
      const res = await fetch(API_BASE.replace(/\/$/, "") + "/api/auto-reply/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        arSimOutputEl.textContent = `Backend phản hồi mã ${res.status}. Quy tắc đã được lưu cục bộ trên trình duyệt.`;
        return;
      }
      const data = await res.json();
      arSimOutputEl.textContent = data.message || `Đã đồng bộ ${payload.rules.length} quy tắc lên backend thành công.`;
    } catch {
      arSimOutputEl.textContent = "Chưa kết nối được backend; quy tắc vẫn được lưu và chạy mô phỏng trên trình duyệt.";
    }
  });
}

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
    // Ignore error
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

if (arDefaultInputEl) {
  arDefaultInputEl.value = getDefaultArReply();
}
renderArRules();
renderHistory();
checkBackendHealth();
