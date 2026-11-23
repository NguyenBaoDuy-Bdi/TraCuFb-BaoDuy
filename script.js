const DEFAULT_API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : localStorage.getItem('tracufb_api_base') || 'http://localhost:3000';

let selectedPlatform = 'auto';
let backendOnline = false;

const targetInput = document.getElementById('targetInput');
const lookupBtn = document.getElementById('lookupBtn');
const pasteBtn = document.getElementById('pasteBtn');
const resultArea = document.getElementById('resultArea');
const apiBaseInput = document.getElementById('apiBaseInput');
const saveApiBtn = document.getElementById('saveApiBtn');
const apiStatusPill = document.getElementById('apiStatusPill');
const apiStatusText = document.getElementById('apiStatusText');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

apiBaseInput.value = localStorage.getItem('tracufb_api_base') || DEFAULT_API_BASE;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép vào bộ nhớ tạm!'));
}

// Check Backend Health
async function checkBackendHealth() {
  const base = apiBaseInput.value.trim().replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${base}/api/health`, { signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      backendOnline = true;
      apiStatusPill.className = 'status-pill online';
      apiStatusText.textContent = 'Backend API: Đã kết nối';
      return;
    }
  } catch {}
  backendOnline = false;
  apiStatusPill.className = 'status-pill fallback';
  apiStatusText.textContent = 'Chế độ Client Đa Nguồn (Sẵn sàng)';
}

// ================= CLIENT FALLBACK ENGINE (Chạy không cần Backend) =================
function extractYouTubeIdClient(rawUrl) {
  const trimmed = rawUrl.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (u.hostname.includes('youtu.be')) return u.pathname.replace(/^\//, '').split('/')[0] || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => ['shorts', 'embed', 'v', 'live'].includes(p));
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {}
  return null;
}

async function clientFallbackLookup(platform, rawUrl) {
  let detected = platform;
  if (detected === 'auto') {
    const low = rawUrl.toLowerCase();
    if (low.includes('tiktok.com')) detected = 'tiktok';
    else if (low.includes('youtube.com') || low.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(rawUrl.trim()))
      detected = 'youtube';
    else detected = 'facebook';
  }

  if (detected === 'youtube') {
    const videoId = extractYouTubeIdClient(rawUrl);
    if (!videoId) throw new Error('Không tìm thấy YouTube Video ID hợp lệ.');
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let title = `Video YouTube (${videoId})`;
    let authorName = 'Kênh YouTube công khai';
    let authorUrl = '';
    const sourcesUsed = ['Client URL Parser'];

    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          title = data.title || title;
          authorName = data.author_name || authorName;
          authorUrl = data.author_url || '';
          sourcesUsed.push('Noembed API');
        }
      }
    } catch {}

    return {
      ok: true,
      platform: 'youtube',
      videoId,
      watchUrl,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      title,
      author: { name: authorName, url: authorUrl },
      thumbnails: {
        maxres: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        hq: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      },
      sourcesUsed
    };
  }

  if (detected === 'tiktok') {
    const cleanUrl = rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`;
    const sourcesUsed = ['TikTok oEmbed Public'];
    let oembed = null;
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`);
      if (res.ok) oembed = await res.json();
    } catch {}

    let username = null;
    let videoId = null;
    try {
      const u = new URL(cleanUrl);
      const um = u.pathname.match(/\/@([^/]+)/);
      if (um) username = um[1];
      const vm = u.pathname.match(/\/(video|photo)\/(\d+)/);
      if (vm) videoId = vm[2];
    } catch {}

    return {
      ok: true,
      platform: 'tiktok',
      inputUrl: rawUrl,
      resolvedUrl: cleanUrl,
      videoId,
      username,
      title: oembed?.title || (username ? `Kênh TikTok @${username}` : 'Liên kết TikTok'),
      author: {
        name: oembed?.author_name || username || 'Tài khoản TikTok',
        username: username || '',
        url: oembed?.author_url || (username ? `https://www.tiktok.com/@${username}` : cleanUrl)
      },
      thumbnail: oembed?.thumbnail_url || '',
      sourcesUsed
    };
  }

  // Facebook client parser
  const input = rawUrl.trim();
  if (/^\d{5,20}$/.test(input)) {
    return {
      ok: true,
      platform: 'facebook',
      type: 'numeric_uid',
      uid: input,
      cleanUrl: `https://www.facebook.com/profile.php?id=${input}`,
      quickLinks: {
        profile: `https://www.facebook.com/${input}`,
        photos: `https://www.facebook.com/${input}/photos`,
        videos: `https://www.facebook.com/${input}/videos`,
        about: `https://www.facebook.com/${input}/about`
      },
      sourcesUsed: ['Client UID & Graph Parser']
    };
  }

  const normalized = input.startsWith('http') ? input : `https://www.facebook.com/${input.replace(/^@/, '')}`;
  const u = new URL(normalized);
  const parts = u.pathname.split('/').filter(Boolean);
  const uid = u.searchParams.get('id') || (/^\d{5,20}$/.test(parts[0] || '') ? parts[0] : null);
  const username = !uid && parts[0] && parts[0] !== 'profile.php' ? parts[0] : null;
  const target = uid || username || '';
  const cleanUrl = uid
    ? `https://www.facebook.com/profile.php?id=${uid}`
    : username
    ? `https://www.facebook.com/${username}`
    : normalized;

  return {
    ok: true,
    platform: 'facebook',
    type: uid ? 'profile_uid' : 'username_or_page',
    uid,
    username,
    cleanUrl,
    quickLinks: target
      ? {
          profile: cleanUrl,
          photos: `https://www.facebook.com/${target}/photos`,
          videos: `https://www.facebook.com/${target}/videos`,
          about: `https://www.facebook.com/${target}/about`
        }
      : { profile: cleanUrl },
    sourcesUsed: ['Client URL Parser']
  };
}

// ================= RENDER RESULT =================
function renderResult(data) {
  resultArea.classList.remove('hidden');
  const sourcesHtml = (data.sourcesUsed || [])
    .map((s) => `<span class="source-tag">✓ ${escapeHtml(s)}</span>`)
    .join('');

  if (data.platform === 'youtube') {
    const statsHtml = data.stats
      ? `<div class="stats-bar">
          <span class="stat-pill">👁️ ${data.stats.views.toLocaleString('vi-VN')} lượt xem</span>
          <span class="stat-pill">👍 ${data.stats.likes.toLocaleString('vi-VN')} thích</span>
          <span class="stat-pill">💬 ${data.stats.comments.toLocaleString('vi-VN')} bình luận</span>
        </div>`
      : '';

    resultArea.innerHTML = `
      <div class="res-header">
        <span class="badge-platform">▶️ YouTube Intelligence</span>
        <div class="source-tags">${sourcesHtml}</div>
      </div>
      <div class="res-grid">
        <img class="res-thumb" src="${escapeHtml(data.thumbnails?.hq || '')}" alt="Thumbnail" />
        <div>
          <table class="kv-table">
            <tr>
              <td class="k">Tiêu đề</td>
              <td class="v"><strong>${escapeHtml(data.title)}</strong></td>
            </tr>
            <tr>
              <td class="k">Video ID</td>
              <td class="v"><code>${escapeHtml(data.videoId)}</code>
                <button class="copy-mini" onclick="copyText('${escapeHtml(data.videoId)}')">Copy ID</button>
              </td>
            </tr>
            <tr>
              <td class="k">Kênh đăng tải</td>
              <td class="v">${escapeHtml(data.author?.name || '')}</td>
            </tr>
            <tr>
              <td class="k">Link nhúng (Embed)</td>
              <td class="v">${escapeHtml(data.embedUrl)}
                <button class="copy-mini" onclick="copyText('${escapeHtml(data.embedUrl)}')">Copy</button>
              </td>
            </tr>
          </table>
          ${statsHtml}
          <div class="action-links">
            <a href="${escapeHtml(data.watchUrl)}" target="_blank" rel="noopener">Mở trên YouTube</a>
            <a href="${escapeHtml(data.thumbnails?.maxres)}" target="_blank" rel="noopener">Ảnh bìa MaxRes HD</a>
            <a href="${escapeHtml(data.thumbnails?.hq)}" target="_blank" rel="noopener">Ảnh bìa HQ</a>
            ${data.author?.url ? `<a href="${escapeHtml(data.author.url)}" target="_blank" rel="noopener">Xem kênh</a>` : ''}
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (data.platform === 'tiktok') {
    const statsHtml = data.stats
      ? `<div class="stats-bar">
          <span class="stat-pill">▶️ ${Number(data.stats.plays || 0).toLocaleString('vi-VN')} lượt phát</span>
          <span class="stat-pill">❤️ ${Number(data.stats.likes || 0).toLocaleString('vi-VN')} tim</span>
          <span class="stat-pill">💬 ${Number(data.stats.comments || 0).toLocaleString('vi-VN')} bình luận</span>
          <span class="stat-pill">🔁 ${Number(data.stats.shares || 0).toLocaleString('vi-VN')} chia sẻ</span>
        </div>`
      : '';

    const thumbBlock = data.thumbnail
      ? `<img class="res-thumb" src="${escapeHtml(data.thumbnail)}" alt="TikTok Cover" />`
      : `<div class="res-thumb" style="height:140px;display:grid;place-items:center;color:#94a3b8;font-size:12px;">TikTok Media</div>`;

    resultArea.innerHTML = `
      <div class="res-header">
        <span class="badge-platform">🎵 TikTok Intelligence</span>
        <div class="source-tags">${sourcesHtml}</div>
      </div>
      <div class="res-grid">
        ${thumbBlock}
        <div>
          <table class="kv-table">
            <tr>
              <td class="k">Mô tả / Tiêu đề</td>
              <td class="v"><strong>${escapeHtml(data.title)}</strong></td>
            </tr>
            <tr>
              <td class="k">Tác giả</td>
              <td class="v">${escapeHtml(data.author?.name || '')} ${data.username ? `(@${escapeHtml(data.username)})` : ''}</td>
            </tr>
            ${data.videoId ? `<tr><td class="k">Video ID</td><td class="v"><code>${escapeHtml(data.videoId)}</code> <button class="copy-mini" onclick="copyText('${escapeHtml(data.videoId)}')">Copy</button></td></tr>` : ''}
            <tr>
              <td class="k">Link chuẩn hóa</td>
              <td class="v">${escapeHtml(data.resolvedUrl)} <button class="copy-mini" onclick="copyText('${escapeHtml(data.resolvedUrl)}')">Copy</button></td>
            </tr>
          </table>
          ${statsHtml}
          <div class="action-links">
            <a href="${escapeHtml(data.resolvedUrl)}" target="_blank" rel="noopener">Mở trên TikTok</a>
            ${data.author?.url ? `<a href="${escapeHtml(data.author.url)}" target="_blank" rel="noopener">Trang cá nhân</a>` : ''}
            ${data.thumbnail ? `<a href="${escapeHtml(data.thumbnail)}" target="_blank" rel="noopener">Tải ảnh bìa</a>` : ''}
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Facebook render
  const qLinks = data.quickLinks || {};
  resultArea.innerHTML = `
    <div class="res-header">
      <span class="badge-platform">📘 Facebook Intelligence</span>
      <div class="source-tags">${sourcesHtml}</div>
    </div>
    <table class="kv-table">
      <tr>
        <td class="k">Loại đối tượng</td>
        <td class="v"><strong>${escapeHtml(data.type || 'Facebook Entity')}</strong></td>
      </tr>
      <tr>
        <td class="k">UID / ID số</td>
        <td class="v">${data.uid ? `<code>${escapeHtml(data.uid)}</code> <button class="copy-mini" onclick="copyText('${escapeHtml(data.uid)}')">Copy UID</button>` : '<span style="color:#94a3b8">Chưa lộ UID dạng số trong URL</span>'}</td>
      </tr>
      ${data.username ? `<tr><td class="k">Username / Slug</td><td class="v"><code>${escapeHtml(data.username)}</code> <button class="copy-mini" onclick="copyText('${escapeHtml(data.username)}')">Copy</button></td></tr>` : ''}
      ${data.postId ? `<tr><td class="k">Post / Video ID</td><td class="v"><code>${escapeHtml(data.postId)}</code> <button class="copy-mini" onclick="copyText('${escapeHtml(data.postId)}')">Copy</button></td></tr>` : ''}
      <tr>
        <td class="k">Link chuẩn hóa</td>
        <td class="v">${escapeHtml(data.cleanUrl)} <button class="copy-mini" onclick="copyText('${escapeHtml(data.cleanUrl)}')">Copy Link</button></td>
      </tr>
    </table>
    <div class="action-links">
      ${qLinks.profile ? `<a href="${escapeHtml(qLinks.profile)}" target="_blank" rel="noopener">Mở Trang chính</a>` : ''}
      ${qLinks.about ? `<a href="${escapeHtml(qLinks.about)}" target="_blank" rel="noopener">Giới thiệu (About)</a>` : ''}
      ${qLinks.photos ? `<a href="${escapeHtml(qLinks.photos)}" target="_blank" rel="noopener">Kho Ảnh</a>` : ''}
      ${qLinks.videos ? `<a href="${escapeHtml(qLinks.videos)}" target="_blank" rel="noopener">Kho Video</a>` : ''}
    </div>
  `;
}

// ================= HISTORY =================
function saveHistory(data, rawQuery) {
  const list = JSON.parse(localStorage.getItem('tracufb_history') || '[]');
  const label = data.title || data.uid || data.username || rawQuery;
  const filtered = list.filter((item) => item.query !== rawQuery);
  filtered.unshift({
    platform: data.platform,
    query: rawQuery,
    label,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  });
  localStorage.setItem('tracufb_history', JSON.stringify(filtered.slice(0, 15)));
  renderHistory();
}

function renderHistory() {
  const list = JSON.parse(localStorage.getItem('tracufb_history') || '[]');
  if (!list.length) {
    historyList.innerHTML = '<li class="empty-history">Chưa có lịch sử tra cứu nào.</li>';
    return;
  }
  historyList.innerHTML = list
    .map(
      (item) => `
      <li class="history-item" data-query="${escapeHtml(item.query)}" data-platform="${escapeHtml(item.platform)}">
        <div class="history-top">
          <span>${escapeHtml(item.platform.toUpperCase())}</span>
          <span>${escapeHtml(item.time)}</span>
        </div>
        <div class="history-title">${escapeHtml(item.label)}</div>
      </li>`
    )
    .join('');

  document.querySelectorAll('.history-item').forEach((el) => {
    el.addEventListener('click', () => {
      targetInput.value = el.dataset.query;
      executeLookup();
    });
  });
}

// ================= MAIN EXECUTION =================
async function executeLookup() {
  const rawUrl = targetInput.value.trim();
  if (!rawUrl) {
    showToast('Vui lòng nhập liên kết hoặc ID trước khi tra cứu!');
    targetInput.focus();
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.innerHTML = '<span>Đang phân tích...</span>';

  const base = apiBaseInput.value.trim().replace(/\/$/, '');

  try {
    let data = null;

    if (backendOnline) {
      try {
        const res = await fetch(`${base}/api/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: selectedPlatform, url: rawUrl })
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          data = json;
        }
      } catch {}
    }

    if (!data) {
      data = await clientFallbackLookup(selectedPlatform, rawUrl);
    }

    renderResult(data);
    saveHistory(data, rawUrl);
  } catch (err) {
    resultArea.classList.remove('hidden');
    resultArea.innerHTML = `<p style="color:#f87171;font-size:13px;">⚠️ ${escapeHtml(err.message || 'Có lỗi xảy ra khi tra cứu.')}</p>`;
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.innerHTML = '<span>Tra cứu ngay</span>';
  }
}

// Event Listeners
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPlatform = btn.dataset.platform;
  });
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    targetInput.value = chip.dataset.sample;
    executeLookup();
  });
});

lookupBtn.addEventListener('click', executeLookup);
targetInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') executeLookup();
});

pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      targetInput.value = text;
      showToast('Đã dán liên kết!');
    }
  } catch {
    showToast('Trình duyệt chặn quyền đọc Clipboard, hãy nhấn Ctrl+V.');
  }
});

saveApiBtn.addEventListener('click', () => {
  const val = apiBaseInput.value.trim();
  if (val) {
    localStorage.setItem('tracufb_api_base', val);
    showToast('Đã lưu địa chỉ Backend API!');
    checkBackendHealth();
  }
});

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem('tracufb_history');
  renderHistory();
  showToast('Đã xóa lịch sử tra cứu');
});

// Init
renderHistory();
checkBackendHealth();
