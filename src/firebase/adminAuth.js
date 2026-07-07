// Firebase Admin token verification — deliberately isolated from admin.js.
//
// firebase-admin/auth pulls in `jose`, which is ESM-only; when a serverless
// function bundles it and require()s it as CommonJS, the whole function crashes
// at load (ERR_REQUIRE_ESM). Only routes that actually verify ID tokens (the
// Paddle customer portal) import this file, so the hot /api/rag answer path never
// loads jose. (firebase-admin is also marked external in next.config so Node
// resolves jose correctly at runtime.)

import { getAuth } from "firebase-admin/auth";
import { adminApp } from "./admin";

export function adminAuth() {
  return getAuth(adminApp());
}
