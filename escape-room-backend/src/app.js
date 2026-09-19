const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const env = require("./config/env");
const apiV1Routes = require("./routes");
const notFound = require("./middlewares/notfound.middleware");
const errorHandler = require("./middlewares/error.middleware");
const requestLogger = require("./middlewares/requestLog.middleware");

const app = express();

app.disable("x-powered-by");
if (process.env.VERCEL) app.set("trust proxy", 1);

// ── Security headers (always enabled) ─────────────────
if (env.NODE_ENV === "production") {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  }));
} else {
  // In development, still use helmet but relax CSP
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));
}

// ── CORS — always use explicit whitelist, never wildcard ──
var corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(function (s) { return s.trim(); })
  : (env.NODE_ENV === "production" ? false : ["http://localhost:5173"]);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

// ── Compression (gzip) ───────────────────────────────
app.use(compression());

app.use(requestLogger);

// ── Body parsers with size limits ─────────────────────
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// Public theme images only. Private waivers are never served from this route.
app.get("/uploads/themes/:id", async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(req.params.id)) return res.sendStatus(404);
    const { pool } = require("./config/db");
    const result = await pool.query("SELECT content_type, data FROM app_assets WHERE id=$1", [req.params.id]);
    if (!result.rows[0]) return res.sendStatus(404);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.type(result.rows[0].content_type).send(result.rows[0].data);
  } catch (error) { next(error); }
});

// ── API routes ────────────────────────────────────────
app.use("/api/v1", (_req,res,next)=>{res.set("Cache-Control","no-store");next();}, apiV1Routes);

// ── Serve frontend in production ──────────────────────
if (env.NODE_ENV === "production" && !process.env.VERCEL) {
  var publicDir = path.join(__dirname, "..", "public");
  app.use(express.static(publicDir, { maxAge: "30d" }));
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, function (req, res) {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
