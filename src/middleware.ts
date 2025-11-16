import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if token exists (user is authenticated)
        // This is more lenient and allows the page to handle its own auth checks
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/profile/:path*",
    "/settings/:path*",
    "/dashboard/:path*",
    "/treatments/:path*",
    "/analysis/:path*",
    "/therapy-adjustment/:path*",
  ],
}; 