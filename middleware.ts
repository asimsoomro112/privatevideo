import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ENTRY_PATH = "/vault-admin";
const ADMIN_COOKIE_NAME = "privatevideos_admin_access";
const ADMIN_COOKIE_VALUE = "enabled";

function hasAdminAccess(request: NextRequest) {
  return request.cookies.get(ADMIN_COOKIE_NAME)?.value === ADMIN_COOKIE_VALUE;
}

function forbiddenJson() {
  return NextResponse.json(
    { success: false, error: "Admin access required" },
    { status: 403 }
  );
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === ADMIN_ENTRY_PATH) {
    const adminUrl = new URL("/admin", request.url);
    const response = NextResponse.redirect(adminUrl);
    response.cookies.set(ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
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
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
