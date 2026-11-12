import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const username = process.env.SANSA_DASHBOARD_USER;
  const password = process.env.SANSA_DASHBOARD_PASSWORD;
  // Local setup can run without auth, but production never fails open.
  if (!username || !password || password === "replace-with-a-strong-password") {
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return new NextResponse("Configure SANSA_DASHBOARD_USER e SANSA_DASHBOARD_PASSWORD", {status:503});
  }
  const auth = request.headers.get("authorization") ?? "";
  let suppliedUsername = "";
  let suppliedPassword = "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const separator = decoded.indexOf(":");
      if (separator >= 0) {
        suppliedUsername = decoded.slice(0,separator);
        suppliedPassword = decoded.slice(separator+1);
      }
    } catch { /* invalid authorization header */ }
  }
  if (suppliedUsername === username && suppliedPassword === password) return NextResponse.next();
  return new NextResponse("Acesso restrito — SANSA OS", {
    status:401, headers: {"WWW-Authenticate": 'Basic realm="SANSA OS", charset="UTF-8"'}
  });
}

export const config = {matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
