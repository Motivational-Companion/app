import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

vi.mock("@/lib/sam-prompt", () => ({
  SAM_FIRST_MESSAGE: "Hey, I'm Sam. What's on your mind?",
  SAM_TEXT_SYSTEM_PROMPT: "You are Sam.",
  EXTRACT_ACTION_PLAN_TOOL: { name: "extract_action_plan" },
}));

import TextConversation from "@/components/TextConversation";

describe("TextConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Sam's first message", () => {
    render(<TextConversation onPlanReady={vi.fn()} />);
    expect(
      screen.getByText("Hey, I'm Sam. What's on your mind?")
    ).toBeInTheDocument();
  });

  it("shows Sam's name in the header", () => {
    render(<TextConversation onPlanReady={vi.fn()} />);
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("shows the message input", () => {
    render(<TextConversation onPlanReady={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Type a message...")
    ).toBeInTheDocument();
  });

  it("shows back button when onBack is provided", () => {
    const onBack = vi.fn();
    render(<TextConversation onBack={onBack} onPlanReady={vi.fn()} />);
    expect(screen.getByText("←")).toBeInTheDocument();
  });

  it("does not show back button when onBack is not provided", () => {
    render(<TextConversation onPlanReady={vi.fn()} />);
    expect(screen.queryByText("←")).not.toBeInTheDocument();
  });
});
