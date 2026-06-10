
import { db } from "./config";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

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
