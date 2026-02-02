"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // При заходе на "/" сразу ведём пользователя на welcome
    router.replace("/welcome");
  }, [router]);

  return null; // ничего не рендерим, сразу редирект
}
