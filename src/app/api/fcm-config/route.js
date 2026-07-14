// Public Firebase web-config for the messaging service worker.
//
// The service worker can't read env vars, so it fetches these values here at
// startup. Every field is a PUBLIC Firebase web-app identifier (the same values
// shipped to the browser via NEXT_PUBLIC_*), never a secret — no service-account
// key or private material is exposed.

export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
