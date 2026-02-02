
import { sendEmailVerification } from "firebase/auth";
import { auth, db, googleProvider } from "@/firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";


// гарантируем профиль в Firestore: users/{uid}
async function ensureUserDoc(user, extra = {}) {
  if (!user || !user.uid) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // Парсим имя, если пришло из Google или updateProfile
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

// Логин по email/паролю
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  // 🚨 Проверка на верификацию
  if (!user.emailVerified) {
    throw new Error("Please verify your email before logging in.");
  }

  await ensureUserDoc(user);
  return user;
}

// Регистрация по email/паролю
export async function registerWithEmail({ email, password, firstName, lastName, country }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Если есть имя, сразу обновляем Firebase Auth профиль
  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  
  await sendEmailVerification(cred.user); 
  
  await ensureUserDoc(cred.user, { firstName, lastName, country });
  return cred.user;
}

// Вход через Google
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

// Forgot Password //
export const resetPasswordByEmail = async (email) => {
  const trimmed = (email || "").trim();
  if (!trimmed) throw new Error("Enter your email.");
  await sendPasswordResetEmail(auth, trimmed);
};

