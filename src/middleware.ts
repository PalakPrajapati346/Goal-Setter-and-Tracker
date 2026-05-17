import { withAuth } from "next-auth/middleware";
import { Role } from "@prisma/client";

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      if (!token?.role) return false;
      const path = req.nextUrl.pathname;
      const role = token.role as Role;

      if (path.startsWith("/admin")) return role === Role.ADMIN;
      if (path.startsWith("/manager")) return role === Role.MANAGER || role === Role.ADMIN;
      if (path.startsWith("/employee")) return role === Role.EMPLOYEE || role === Role.ADMIN;
      if (path.startsWith("/dashboard")) return true;
      if (path.startsWith("/api/")) return true;
      return true;
    },
  },
});

export const config = {
  matcher: [
    "/employee/:path*",
    "/manager/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/api/goals/:path*",
    "/api/sheets/:path*",
    "/api/sheets/me",
    "/api/quarterly/:path*",
    "/api/checkins/:path*",
    "/api/sheets/team",
    "/api/cycles",
    "/api/reports/:path*",
    "/api/admin/:path*",
  ],
};
