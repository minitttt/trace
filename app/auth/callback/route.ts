import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(new URL("/sign-in?error=oauth", request.url));
  }
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
    }
  } else {
    return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
  }
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
