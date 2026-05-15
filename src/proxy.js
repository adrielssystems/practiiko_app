import { withAuth } from "next-auth/middleware";

// In Next.js 16+, middleware is renamed to proxy
export const proxy = withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!api/auth|api/webhooks|api/test-bot|login|_next/static|_next/image|favicon.ico|uploads|logo.webp|landing).*)",
  ],
};

// Default export might still be needed for compatibility, 
// but the named export 'proxy' is the new convention.
export default proxy;
