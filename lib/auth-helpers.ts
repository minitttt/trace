import { createClient } from "@/lib/supabase/client";

export async function signOutUser(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Supabase client signOut error:", err);
  }

  // Force-clear all Supabase cookies from document.cookie
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const name = cookie.split("=")[0].trim();
      if (name.startsWith("sb-") || name.includes("auth-token") || name.includes("supabase")) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        document.cookie = `${name}=; Path=/; Max-Age=0;`;
      }
    }
  }

  // Ping backend endpoint in background to invalidate on server
  try {
    fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
  } catch {
    // Ignore network error
  }

  // Hard redirect to sign-in page so middleware cleanly processes the unauthenticated state
  window.location.replace("/sign-in");
}
