import { describe, it, expect } from "vitest";
import { isProtectedRoute, PROTECTED_ROUTES } from "@/lib/routes";

describe("isProtectedRoute", () => {
  it("protects /chat exactly", () => {
    expect(isProtectedRoute("/chat")).toBe(true);
  });

  it("protects /chat sub-paths", () => {
    expect(isProtectedRoute("/chat/history")).toBe(true);
    expect(isProtectedRoute("/chat/session/123")).toBe(true);
  });

  it("does not protect public routes", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/privacy")).toBe(false);
    expect(isProtectedRoute("/terms")).toBe(false);
    expect(isProtectedRoute("/success")).toBe(false);
    expect(isProtectedRoute("/demo")).toBe(false);
  });

  it("does not protect API routes", () => {
    expect(isProtectedRoute("/api/stripe/checkout")).toBe(false);
    expect(isProtectedRoute("/api/auth/callback")).toBe(false);
    expect(isProtectedRoute("/api/chat")).toBe(false);
  });

  it("does not match paths that merely start with the protected prefix", () => {
    // /chatter is not a sub-path of /chat
    expect(isProtectedRoute("/chatter")).toBe(false);
    expect(isProtectedRoute("/chat-history")).toBe(false);
  });

  it("exports the PROTECTED_ROUTES constant for inspection", () => {
    expect(PROTECTED_ROUTES).toContain("/chat");
  });
});
