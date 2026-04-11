import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  isDuplicateNote,
} from "@/app/api/chat/providers/shared";

describe("buildSystemPrompt", () => {
  it("returns the check-in prompt when mode is checkin", () => {
    const result = buildSystemPrompt("checkin");
    expect(result).toContain("check-in");
  });

  it("returns the text prompt when mode is chat", () => {
    const result = buildSystemPrompt("chat");
    // Text prompt contains the 4-phase framework language
    expect(result).toContain("Phase");
  });

  it("includes the onboarding context when provided", () => {
    const result = buildSystemPrompt("chat", {
      bringYouHere: "overwhelmed",
      vision: "Launch a consulting business",
    });
    expect(result).toContain("User Context");
    expect(result).toContain("overwhelmed");
    expect(result).toContain("Launch a consulting business");
  });

  it("includes the task context when provided", () => {
    const result = buildSystemPrompt("checkin", undefined, "- Draft outline (today)");
    expect(result).toContain("Current Tasks");
    expect(result).toContain("Draft outline");
  });

  it("includes the existing-board context with dedupe guidance", () => {
    const result = buildSystemPrompt(
      "chat",
      undefined,
      undefined,
      "- Task: Email Sarah"
    );
    expect(result).toContain("Existing Board Items");
    expect(result).toContain("Do NOT re-note");
  });

  it("omits context sections when they are not provided", () => {
    const result = buildSystemPrompt("chat");
    expect(result).not.toContain("User Context");
    expect(result).not.toContain("Current Tasks");
    expect(result).not.toContain("Existing Board Items");
  });

  it("maps onboarding labels to human-readable text", () => {
    const result = buildSystemPrompt("chat", {
      bringYouHere: "stuck",
      priorityArea: "career",
      coachingStyle: "direct",
    });
    expect(result).toContain("feeling stuck");
    expect(result).toContain("career and work");
    expect(result).toContain("direct and no-nonsense");
  });
});

describe("isDuplicateNote", () => {
  it("returns false when the list is empty", () => {
    expect(isDuplicateNote([], "Draft outline")).toBe(false);
  });

  it("returns true on exact (case-insensitive) match", () => {
    const noted = [{ tool: "note_task", title: "Draft Outline" }];
    expect(isDuplicateNote(noted, "draft outline")).toBe(true);
  });

  it("returns true when incoming is a substring of existing", () => {
    const noted = [{ tool: "note_task", title: "Draft presentation outline" }];
    expect(isDuplicateNote(noted, "presentation outline")).toBe(true);
  });

  it("returns true when existing is a substring of incoming", () => {
    const noted = [{ tool: "note_goal", title: "gym" }];
    expect(isDuplicateNote(noted, "gym 3x per week")).toBe(true);
  });

  it("returns false for unrelated titles", () => {
    const noted = [{ tool: "note_task", title: "Draft outline" }];
    expect(isDuplicateNote(noted, "Email Sarah")).toBe(false);
  });

  it("handles empty incoming titles gracefully", () => {
    const noted = [{ tool: "note_task", title: "Draft outline" }];
    expect(isDuplicateNote(noted, "")).toBe(false);
    expect(isDuplicateNote(noted, "   ")).toBe(false);
  });
});
