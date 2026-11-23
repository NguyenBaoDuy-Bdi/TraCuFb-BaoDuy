import express from "express";
import cors from "cors";
import session from "express-session";
import { randomBytes, timingSafeEqual } from "node:crypto";

const app = express();
const PORT = process.env.PORT || 10000;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v27.0";
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "").replace(/\/$/, "");
const SITE_URL = process.env.SITE_URL || "https://nguyenhaoduy-bdi.github.io/TraCuuFb/";

if (!META_APP_ID || !META_APP_SECRET || !SESSION_SECRET || !SITE_ORIGIN) {
  console.error("Missing required environment variables: META_APP_ID, META_APP_SECRET, SESSION_SECRET, SITE_ORIGIN");
}

const CALLBACK_URL = `${process.env.RENDER_EXTERNAL_URL || ""}/auth/facebook/callback`;

app.set("trust proxy", 1);
app.use(cors({
  origin: SITE_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(session({
  name: "tracuufb.sid",
  secret: SESSION_SECRET || "local-development-only-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

function redirectToSite(status) {
  const url = new URL(SITE_URL);
  if (status) url.searchParams.set("fb_login", status);
  return url.toString();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tracuufb-baoduy-api" });
});

app.get("/auth/facebook", (req, res) => {
  if (!META_APP_ID || !META_APP_SECRET) {
    return res.status(503).send("Backend chưa được cấu hình Meta App ID/Secret.");
  }

  const state = randomBytes(24).toString("hex");
  req.session.oauthState = state;

  const redirectUri = `${process.env.RENDER_EXTERNAL_URL}/auth/facebook/callback`;
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: "public_profile"
  });

  req.session.save((err) => {
    if (err) return res.status(500).send("Không thể tạo phiên đăng nhập.");
    res.redirect(`https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`);
  });
});

app.get("/auth/facebook/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.redirect(redirectToSite("error"));
  if (typeof code !== "string" || typeof state !== "string" ||
      typeof req.session.oauthState !== "string") {
    return res.redirect(redirectToSite("error"));
  }

  const expected = Buffer.from(req.session.oauthState);
  const received = Buffer.from(state);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(400).send("OAuth state không hợp lệ. Vui lòng thử đăng nhập lại.");
  }
  delete req.session.oauthState;

  try {
    const redirectUri = `${process.env.RENDER_EXTERNAL_URL}/auth/facebook/callback`;
    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: redirectUri,
      code
    });

    const tokenResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${tokenParams}`
    );
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Meta token exchange failed:", tokenData.error?.type || tokenResponse.status);
      return res.redirect(redirectToSite("error"));
    }

    const profileParams = new URLSearchParams({
      fields: "id,name,picture",
      access_token: tokenData.access_token
    });
    const profileResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me?${profileParams}`
    );
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.id) {
      console.error("Meta profile request failed:", profile.error?.type || profileResponse.status);
      return res.redirect(redirectToSite("error"));
    }

    req.session.facebookUser = {
      id: profile.id,
      name: profile.name || "Facebook user",
      picture: profile.picture || null
    };

    req.session.save((err) => {
      if (err) return res.status(500).send("Không thể lưu phiên đăng nhập.");
      res.redirect(redirectToSite("success"));
    });
  } catch (err) {
    console.error("Facebook OAuth callback failed:", err.message);
    res.redirect(redirectToSite("error"));
  }
});

app.get("/api/me", (req, res) => {
  if (!req.session.facebookUser) {
    return res.status(401).json({ ok: false, message: "Chưa đăng nhập Facebook." });
  }
  res.json({ ok: true, data: req.session.facebookUser });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("tracuufb.sid", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`TraCuuFB API listening on port ${PORT}`);
});
