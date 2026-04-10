import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SplitPaneChatLayout from "@/components/SplitPaneChatLayout";
import type { NoteItem } from "@/components/LiveLists";

const emptyLists = { issues: [], goals: [], tasks: [] };

const populatedLists = {
  issues: [
    { id: "i1", text: "Client is overdue", addedAt: Date.now() },
  ] as NoteItem[],
  goals: [
    { id: "g1", text: "Launch consulting", addedAt: Date.now() },
  ] as NoteItem[],
  tasks: [
    {
      id: "t1",
      text: "Draft outline today",
      addedAt: Date.now(),
      timeframe: "today",
    },
  ] as NoteItem[],
};

describe("SplitPaneChatLayout", () => {
  it("renders the chat children", () => {
    render(
      <SplitPaneChatLayout {...emptyLists}>
        <div data-testid="chat-child">chat content</div>
      </SplitPaneChatLayout>
    );
    expect(screen.getByTestId("chat-child")).toBeInTheDocument();
  });

  it("shows the empty-state copy in the focus panel when there are no items", () => {
    render(
      <SplitPaneChatLayout {...emptyLists}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    expect(
      screen.getByText(/focus areas will appear here/i)
    ).toBeInTheDocument();
  });

  it("renders items in the focus panel when the lists are populated", () => {
    render(
      <SplitPaneChatLayout {...populatedLists}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    expect(screen.getByText("Client is overdue")).toBeInTheDocument();
    expect(screen.getByText("Launch consulting")).toBeInTheDocument();
    expect(screen.getByText("Draft outline today")).toBeInTheDocument();
  });

  it("renders the Your focus heading", () => {
    render(
      <SplitPaneChatLayout {...emptyLists}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    expect(
      screen.getByRole("heading", { name: /your focus/i })
    ).toBeInTheDocument();
  });

  it("does NOT render a heart icon in the empty state", () => {
    const { container } = render(
      <SplitPaneChatLayout {...emptyLists}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    // \u2661 and \u2665 are heart glyphs (outline and filled) — must not appear
    expect(container.textContent).not.toContain("\u2661");
    expect(container.textContent).not.toContain("\u2665");
    expect(container.textContent).not.toContain("\u2664");
  });

  it("passes onRemove and onReorder handlers through (no throw)", () => {
    const onRemove = vi.fn();
    const onReorder = vi.fn();
    render(
      <SplitPaneChatLayout
        {...populatedLists}
        onRemove={onRemove}
        onReorder={onReorder}
      >
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    // Basic smoke — just verifying the render doesn't blow up with handlers
    expect(screen.getByText("Client is overdue")).toBeInTheDocument();
  });
});
