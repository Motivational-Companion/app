import { describe, it, expect } from "vitest";
import {
  safeNextPath,
  DEFAULT_NEXT,
} from "@/app/api/auth/callback/route";

describe("auth callback safeNextPath", () => {
  it("returns default when next is null", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_NEXT);
  });

  it("returns default when next is empty string", () => {
    expect(safeNextPath("")).toBe(DEFAULT_NEXT);
  });

  it("accepts same-origin relative paths", () => {
    expect(safeNextPath("/chat")).toBe("/chat");
    expect(safeNextPath("/chat/session/123")).toBe("/chat/session/123");
    expect(safeNextPath("/profile")).toBe("/profile");
  });

  it("rejects protocol-relative URLs (open redirect protection)", () => {
    expect(safeNextPath("//evil.com/phish")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("//evil.com")).toBe(DEFAULT_NEXT);
  });

  it("rejects absolute URLs with protocol", () => {
    expect(safeNextPath("https://evil.com/phish")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("http://evil.com")).toBe(DEFAULT_NEXT);
  });

  it("rejects relative paths without leading slash", () => {
    expect(safeNextPath("chat")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("../admin")).toBe(DEFAULT_NEXT);
  });

  it("DEFAULT_NEXT is /chat (post-auth lands users in the product)", () => {
    expect(DEFAULT_NEXT).toBe("/chat");
  });
});
