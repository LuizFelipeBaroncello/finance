import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  request.headers.set("x-pathname", request.nextUrl.pathname);

  const response = await updateSession(request);

  // C2 fix: set the "review seen" cookie when the user actually visits the review page.
  // Setting cookies in Server Components is read-only in Next 16, so we set it here.
  if (request.nextUrl.pathname.startsWith("/transactions/review")) {
    response.cookies.set("provisional_review_seen", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  // Keep the response header too (harmless, useful for debugging in browser).
  response.headers.set("x-pathname", request.nextUrl.pathname);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
