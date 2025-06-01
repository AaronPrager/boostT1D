import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: ["/profile/:path*", "/settings/:path*", "/dashboard/:path*", "/treatments/:path*", "/analysis/:path*", "/food-analysis/:path*"],
}; 