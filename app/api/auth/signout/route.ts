import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (
        cookie.name.startsWith("sb-") ||
        cookie.name.includes("auth-token") ||
        cookie.name.includes("supabase")
      ) {
        cookieStore.delete(cookie.name);
        cookieStore.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
          expires: new Date(0),
        });
      }
    }
  } catch {
    // Ignore
  }

  return NextResponse.json({ success: true });
}
