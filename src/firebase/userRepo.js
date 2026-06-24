
import { db, storage } from "./config";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export async function ensureUserDoc(user, extra = {}) {
  if (!user || !user.uid) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // Парсим имя из Google при наличии
  let gFirst = null, gLast = null;
  if (user.displayName) {
    const parts = user.displayName.trim().split(" ");
    gFirst = parts[0] || null;
    gLast = parts.slice(1).join(" ") || null;
  }

  const base = {
    uid: user.uid,
    email: user.email || null,
    emailVerified: !!user.emailVerified,
    photoURL: user.photoURL || null,
    authProvider: user.providerData?.[0]?.providerId || "password",
    plan: "free",
    tokens: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const profile = {
    firstName: extra.firstName ?? gFirst ?? null,
    lastName:  extra.lastName  ?? gLast  ?? null,
    country:   extra.country   ?? null,
  };

  if (!snap.exists()) {
    await setDoc(ref, { ...base, ...profile }, { merge: true });
  } else {
    await updateDoc(ref, { ...profile, updatedAt: serverTimestamp() });
  }
}

export async function updateUserProfile(uid, data) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// Upload a new avatar image and return its download URL. Stored under the
// user's own storage prefix (users/{uid}/...) so existing rules apply.
export async function uploadUserAvatar(uid, file) {
  if (!uid || !file) return null;
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const r = storageRef(storage, `users/${uid}/avatar/avatar.${ext || "jpg"}`);
  await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
  return await getDownloadURL(r);
}

export async function saveVesselProfile(uid, vesselData) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, { vesselProfile: vesselData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getVesselProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data()?.vesselProfile ?? null) : null;
}
