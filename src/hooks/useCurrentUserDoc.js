"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

// Гарантируем, что users/{uid} существует
async function ensureUserDoc(user) {
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function useCurrentUserDoc() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopAuth = () => {};
    let stopDoc = () => {};

    stopAuth = onAuthStateChanged(auth, async (user) => {
      try { stopDoc && stopDoc(); } catch (_) {}
      setData(null);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await ensureUserDoc(user);
      } catch (e) {
        console.warn("ensureUserDoc error:", e);
      }

      const ref = doc(db, "users", user.uid);
      stopDoc = onSnapshot(
        ref,
        (snap) => {
          setData(snap.exists() ? snap.data() : null);
          setLoading(false);
        },
        (err) => {
          console.warn("users/{uid} snapshot error:", err.code, err.message);
          setLoading(false);
        }
      );
    });

    return () => {
      try { stopDoc && stopDoc(); } catch (_) {}
      try { stopAuth && stopAuth(); } catch (_) {}
    };
  }, []);

  return { data, loading };
}
