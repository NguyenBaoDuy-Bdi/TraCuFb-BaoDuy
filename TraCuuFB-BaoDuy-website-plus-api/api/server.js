import express from "express";
import session from "express-session";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import "dotenv/config";

const app = express();
const port = Number(process.env.PORT || 3000);
const appId = process.env.META_APP_ID;
const appSecret = process.env.META_APP_SECRET;
const redirectUri = process.env.META_REDIRECT_URI || (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/auth/facebook/callback` : "");
const graphVersion = process.env.GRAPH_API_VERSION;

if (!appId || !appSecret || !redirectUri || !graphVersion ||
    graphVersion.includes("XX")) {
  console.warn("Set META_APP_ID, META_APP_SECRET, META_REDIRECT_URI and a current GRAPH_API_VERSION in .env");
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: process.env.SITE_ORIGIN || "http://localhost:5500",
  credentials: true
}));
app.use(express.json({ limit: "10kb" }));
app.use(session({
  name: "tracuufb.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 60 * 60 * 1000
  }
}));
app.use("/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 60 }));

const graph = (path) => `https://graph.facebook.com/${graphVersion}/${path}`;

app.get("/health", (_req, res) => res.json({ ok: true, service: "TraCuuFB-BaoDuy API" }));

// OAuth authorization: only request the minimal profile permission.
app.get("/auth/facebook", (req, res) => {
  if (!appId || !redirectUri || !graphVersion || graphVersion.includes("XX")) {
    return res.status(503).send("Meta app settings are not configured.");
  }
  const state = crypto.randomBytes(24).toString("hex");
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: "public_profile"
  });
  res.redirect(`https://www.facebook.com/${graphVersion}/dialog/oauth?${params}`);
});

app.get("/auth/facebook/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send("Facebook Login was cancelled or denied.");
  if (!code || !state || state !== req.session.oauthState) {
    return res.status(400).send("Invalid OAuth state.");
  }
  delete req.session.oauthState;
  try {
    const tokenUrl = new URL(graph("oauth/access_token"));
    tokenUrl.search = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code: String(code)
    });
    const tokenResponse = await fetch(tokenUrl);
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) {
      return res.status(502).send("Could not obtain Facebook access token.");
    }
    // Token remains server-side in the session; never return it to browser JS.
    req.session.fbAccessToken = token.access_token;
    res.redirect(`${(process.env.SITE_ORIGIN || "").replace(/\/$/, "")}/?fb_login=success`);
  } catch {
    res.status(502).send("Facebook Login service error.");
  }
});

app.get("/api/me", async (req, res) => {
  if (!req.session.fbAccessToken) {
    return res.status(401).json({ error: "facebook_login_required" });
  }
  try {
    const url = new URL(graph("me"));
    url.search = new URLSearchParams({
      fields: "id,name,picture.type(large)",
      access_token: req.session.fbAccessToken
    });
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: "graph_api_error" });
    res.json({ data });
  } catch {
    res.status(502).json({ error: "graph_api_unavailable" });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("tracuufb.sid");
    res.json({ ok: true });
  });
});

// Intentionally no endpoint for arbitrary-person/private profile lookup.
// Meta Graph API does not grant unrestricted Facebook user search.
app.use((_req, res) => res.status(404).json({ error: "not_found" }));

app.listen(port, () => console.log(`TraCuuFB API listening on ${port}`));
