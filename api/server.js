const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// Simple in-memory cache (TTL: 5 minutes)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Helper: Fetch with timeout & browser-like User-Agent
async function safeFetch(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        ...(options.headers || {})
      }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Helper: Resolve short redirects (vt.tiktok.com, fb.watch, youtu.be...)
async function resolveRedirect(rawUrl) {
  try {
    const res = await safeFetch(rawUrl, { method: 'GET', redirect: 'follow' }, 8000);
    return res.url || rawUrl;
  } catch {
    return rawUrl;
  }
}

// ================= YOUTUBE ENGINE =================
function extractYouTubeId(rawUrl) {
  const trimmed = rawUrl.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').split('/')[0] || null;
    }
    if (u.searchParams.get('v')) {
      return u.searchParams.get('v');
    }
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => ['shorts', 'embed', 'v', 'live'].includes(p));
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return null;
  } catch {
    return null;
  }
}

async function handleYouTube(rawUrl) {
  const videoId = extractYouTubeId(rawUrl);
  if (!videoId) {
    throw new Error('Không nhận diện được YouTube Video ID hoặc link không hợp lệ.');
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const sourcesUsed = [];
  let title = '';
  let authorName = '';
  let authorUrl = '';
  let stats = null;
  let description = '';
  let publishedAt = '';
  let tags = [];

  // Source 1: Official YouTube oEmbed
  try {
    const oembedRes = await safeFetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      title = oembed.title || '';
      authorName = oembed.author_name || '';
      authorUrl = oembed.author_url || '';
      sourcesUsed.push('YouTube oEmbed');
    }
  } catch {}

  // Source 2: Noembed fallback
  if (!title) {
    try {
      const noembedRes = await safeFetch(
        `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`
      );
      if (noembedRes.ok) {
        const ne = await noembedRes.json();
        if (!ne.error) {
          title = ne.title || title;
          authorName = ne.author_name || authorName;
          authorUrl = ne.author_url || authorUrl;
          sourcesUsed.push('Noembed API');
        }
      }
    } catch {}
  }

  // Source 3: YouTube Data API v3 (nếu có YOUTUBE_API_KEY)
  if (YOUTUBE_API_KEY) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
      const ytRes = await safeFetch(apiUrl);
      if (ytRes.ok) {
        const ytData = await ytRes.json();
        const item = ytData.items?.[0];
        if (item) {
          title = item.snippet?.title || title;
          authorName = item.snippet?.channelTitle || authorName;
          authorUrl = `https://www.youtube.com/channel/${item.snippet?.channelId}`;
          description = item.snippet?.description || '';
          publishedAt = item.snippet?.publishedAt || '';
          tags = item.snippet?.tags || [];
          stats = {
            views: Number(item.statistics?.viewCount || 0),
            likes: Number(item.statistics?.likeCount || 0),
            comments: Number(item.statistics?.commentCount || 0),
            duration: item.contentDetails?.duration || ''
          };
          sourcesUsed.push('YouTube Data API v3');
        }
      }
    } catch {}
  }

  return {
    platform: 'youtube',
    videoId,
    watchUrl,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    title: title || `Video YouTube (${videoId})`,
    author: {
      name: authorName || 'Kênh YouTube công khai',
      url: authorUrl || ''
    },
    publishedAt,
    description,
    tags,
    stats,
    thumbnails: {
      maxres: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      sd: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
      hq: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      mq: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    },
    sourcesUsed: sourcesUsed.length ? sourcesUsed : ['URL Parser']
  };
}

// ================= TIKTOK ENGINE =================
async function handleTikTok(rawUrl) {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http')) {
    targetUrl = `https://${targetUrl}`;
  }

  const sourcesUsed = [];
  let resolvedUrl = targetUrl;

  if (/vt\.tiktok\.com|vm\.tiktok\.com/i.test(targetUrl)) {
    resolvedUrl = await resolveRedirect(targetUrl);
    if (resolvedUrl !== targetUrl) sourcesUsed.push('Redirect Resolver');
  }

  // Parse username & videoId from URL
  let username = null;
  let videoId = null;
  try {
    const u = new URL(resolvedUrl);
    const userMatch = u.pathname.match(/\/@([^/]+)/);
    if (userMatch) username = userMatch[1];
    const vidMatch = u.pathname.match(/\/(video|photo)\/(\d+)/);
    if (vidMatch) videoId = vidMatch[2];
  } catch {}

  let oembedData = null;

  // Source 1: Official TikTok oEmbed
  try {
    const res = await safeFetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`
    );
    if (res.ok) {
      const json = await res.json();
      if (json && !json.status_msg) {
        oembedData = json;
        sourcesUsed.push('TikTok Official oEmbed');
      }
    }
  } catch {}

  // Source 2: TikWM Public Metadata API (fallback nguồn công khai cho video TikTok)
  let tikwmData = null;
  if (!oembedData) {
    try {
      const res = await safeFetch(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(resolvedUrl)}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.code === 0 && json?.data) {
          tikwmData = json.data;
          sourcesUsed.push('TikWM Metadata API');
        }
      }
    } catch {}
  }

  if (!oembedData && !tikwmData && !username && !videoId) {
    throw new Error('Không thể trích xuất dữ liệu TikTok. Hãy kiểm tra link video/kênh có đang ở chế độ công khai.');
  }

  return {
    platform: 'tiktok',
    inputUrl: rawUrl,
    resolvedUrl,
    videoId: videoId || tikwmData?.id || oembedData?.embed_product_id || null,
    username: username || tikwmData?.author?.unique_id || null,
    title: oembedData?.title || tikwmData?.title || 'Nội dung TikTok công khai',
    author: {
      name: oembedData?.author_name || tikwmData?.author?.nickname || username || 'Tài khoản TikTok',
      username: username || tikwmData?.author?.unique_id || '',
      url: oembedData?.author_url || (username ? `https://www.tiktok.com/@${username}` : ''),
      avatar: tikwmData?.author?.avatar || ''
    },
    thumbnail: oembedData?.thumbnail_url || tikwmData?.cover || '',
    embedHtml: oembedData?.html || '',
    stats: tikwmData
      ? {
          plays: tikwmData.play_count || 0,
          likes: tikwmData.digg_count || 0,
          comments: tikwmData.comment_count || 0,
          shares: tikwmData.share_count || 0
        }
      : null,
    sourcesUsed: sourcesUsed.length ? sourcesUsed : ['URL Parser']
  };
}

// ================= FACEBOOK ENGINE =================
async function handleFacebook(rawUrl) {
  let input = rawUrl.trim();
  const sourcesUsed = ['URL & Graph Pattern Parser'];

  // Nếu người dùng nhập trực tiếp dãy số UID
  if (/^\d{5,20}$/.test(input)) {
    return {
      platform: 'facebook',
      type: 'numeric_uid',
      uid: input,
      username: null,
      cleanUrl: `https://www.facebook.com/${input}`,
      profileUrl: `https://www.facebook.com/profile.php?id=${input}`,
      graphAvatarUrl: `https://graph.facebook.com/${input}/picture?type=large&width=500&height=500`,
      quickLinks: {
        profile: `https://www.facebook.com/${input}`,
        photos: `https://www.facebook.com/${input}/photos`,
        videos: `https://www.facebook.com/${input}/videos`,
        about: `https://www.facebook.com/${input}/about`
      },
      sourcesUsed,
      note: 'UID dạng số hợp lệ. Bạn có thể mở nhanh các tab công khai hoặc kiểm tra trên trình duyệt đã đăng nhập.'
    };
  }

  if (!input.startsWith('http')) {
    if (!input.includes('.')) {
      input = `https://www.facebook.com/${input.replace(/^@/, '')}`;
    } else {
      input = `https://${input}`;
    }
  }

  let resolvedUrl = input;
  if (/fb\.watch|l\.facebook\.com|facebook\.com\/share\//i.test(input)) {
    resolvedUrl = await resolveRedirect(input);
    if (resolvedUrl !== input) sourcesUsed.push('Redirect Resolver');
  }

  const u = new URL(resolvedUrl);
  const host = u.hostname.replace(/^www\.|^m\.|^mbasic\.|^web\./, '');
  if (!['facebook.com', 'fb.com', 'fb.watch'].some((d) => host === d || host.endsWith('.' + d))) {
    throw new Error('Đường dẫn không thuộc hệ thống Facebook.');
  }

  const pathParts = u.pathname.split('/').filter(Boolean);
  let type = 'profile_or_page';
  let uid = u.searchParams.get('id') || null;
  let username = null;
  let postId = u.searchParams.get('story_fbid') || u.searchParams.get('v') || null;

  if (u.pathname.includes('/profile.php') && uid) {
    type = 'profile_uid';
  } else if (u.pathname.includes('/reel/')) {
    type = 'reel';
    postId = pathParts[pathParts.indexOf('reel') + 1] || postId;
  } else if (u.pathname.includes('/videos/')) {
    type = 'video';
    username = pathParts[0] !== 'videos' ? pathParts[0] : null;
    postId = pathParts[pathParts.indexOf('videos') + 1] || postId;
  } else if (u.pathname.includes('/posts/')) {
    type = 'post';
    username = pathParts[0];
    postId = pathParts[pathParts.indexOf('posts') + 1] || postId;
  } else if (u.pathname.includes('/groups/')) {
    type = 'group';
    const gIdx = pathParts.indexOf('groups');
    const gVal = pathParts[gIdx + 1];
    if (gVal && /^\d+$/.test(gVal)) uid = gVal;
    else username = gVal || null;
  } else if (pathParts.length >= 1) {
    const first = pathParts[0];
    if (/^\d{5,20}$/.test(first)) {
      uid = first;
      type = 'numeric_uid';
    } else {
      username = first;
      type = 'username_or_page';
    }
  }

  const targetIdOrUser = uid || username || '';
  const cleanUrl = uid
    ? `https://www.facebook.com/profile.php?id=${uid}`
    : username
    ? `https://www.facebook.com/${username}`
    : `https://www.facebook.com${u.pathname}${u.search}`;

  return {
    platform: 'facebook',
    type,
    uid,
    username,
    postId,
    cleanUrl,
    graphAvatarUrl: uid
      ? `https://graph.facebook.com/${uid}/picture?type=large&width=500&height=500`
      : null,
    quickLinks: targetIdOrUser
      ? {
          profile: cleanUrl,
          photos: `https://www.facebook.com/${targetIdOrUser}/photos`,
          videos: `https://www.facebook.com/${targetIdOrUser}/videos`,
          about: `https://www.facebook.com/${targetIdOrUser}/about`
        }
      : { profile: cleanUrl },
    sourcesUsed,
    note: 'Hỗ trợ bóc tách UID, Username, Post/Reel ID, chuẩn hóa link và mở nhanh danh mục công khai.'
  };
}

// ================= ROUTES =================
app.get('/', (req, res) => {
  res.json({
    service: 'TraCuFb-BaoDuy API v2.0',
    status: 'online',
    endpoints: ['/api/health', '/api/lookup']
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    youtubeApiKeyConfigured: Boolean(YOUTUBE_API_KEY),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/lookup', async (req, res) => {
  const { platform, url } = req.body || {};
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ ok: false, error: 'Vui lòng nhập đường dẫn hoặc ID cần tra cứu.' });
  }

  const normalizedPlatform = (platform || 'auto').toLowerCase().trim();
  let detectedPlatform = normalizedPlatform;

  if (detectedPlatform === 'auto') {
    const low = url.toLowerCase();
    if (low.includes('tiktok.com')) detectedPlatform = 'tiktok';
    else if (low.includes('youtube.com') || low.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(url.trim()))
      detectedPlatform = 'youtube';
    else detectedPlatform = 'facebook';
  }

  const cacheKey = `${detectedPlatform}:${url.trim()}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return res.json({ ok: true, cached: true, ...cached });
  }

  try {
    let result;
    if (detectedPlatform === 'youtube') {
      result = await handleYouTube(url);
    } else if (detectedPlatform === 'tiktok') {
      result = await handleTikTok(url);
    } else if (detectedPlatform === 'facebook') {
      result = await handleFacebook(url);
    } else {
      return res.status(400).json({ ok: false, error: 'Nền tảng không hợp lệ (facebook, tiktok, youtube).' });
    }

    setCache(cacheKey, result);
    return res.json({ ok: true, cached: false, ...result });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: err.message || 'Không thể xử lý yêu cầu tra cứu này.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`TraCuFb-BaoDuy API v2.0 running on port ${PORT}`);
});
