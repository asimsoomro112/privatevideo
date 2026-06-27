import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ADMIN_ENTRY_PATH = "/vault-admin";
const ADMIN_COOKIE_NAME = "herprivatecinema_admin_access";
const ADMIN_COOKIE_VALUE = "enabled";

function hasAdminAccess(request: Parameters<Parameters<typeof auth>[0]>[0]) {
  return request.cookies.get(ADMIN_COOKIE_NAME)?.value === ADMIN_COOKIE_VALUE;
}

function redirectToLogin(request: Parameters<Parameters<typeof auth>[0]>[0]) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(loginUrl);
}

function forbiddenJson() {
  return NextResponse.json(
    { success: false, error: "Admin access required" },
    { status: 403 }
  );
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isLoginRoute = pathname === "/login";
  const isSignedIn = Boolean(request.auth);

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (!isSignedIn) {
    if (isLoginRoute) return NextResponse.next();
    return redirectToLogin(request);
  }

  if (isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === ADMIN_ENTRY_PATH) {
    const adminUrl = new URL("/admin", request.url);
    const response = NextResponse.redirect(adminUrl);
    response.cookies.set(ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  if (pathname.startsWith("/admin") && !hasAdminAccess(request)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/api/upload" && !hasAdminAccess(request)) {
    return forbiddenJson();
  }

  if (
    pathname.startsWith("/api/videos/") &&
    ["DELETE", "PATCH"].includes(request.method) &&
    !hasAdminAccess(request)
  ) {
    return forbiddenJson();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
