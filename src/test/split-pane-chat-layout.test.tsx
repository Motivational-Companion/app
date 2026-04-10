import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const noHandlers = {
  completedIds: new Set<string>(),
  onToggleDone: () => {},
  onDelete: () => {},
};

describe("SplitPaneChatLayout", () => {
  it("renders the chat children", () => {
    render(
      <SplitPaneChatLayout {...emptyLists} {...noHandlers}>
        <div data-testid="chat-child">chat content</div>
      </SplitPaneChatLayout>
    );
    expect(screen.getByTestId("chat-child")).toBeInTheDocument();
  });

  it("shows the empty-state copy in the focus panel when there are no items", () => {
    render(
      <SplitPaneChatLayout {...emptyLists} {...noHandlers}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    expect(
      screen.getByText(/this is where your issues, goals, and to-dos will show up/i)
    ).toBeInTheDocument();
  });

  it("renders items in the focus panel when the lists are populated", () => {
    render(
      <SplitPaneChatLayout {...populatedLists} {...noHandlers}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    expect(screen.getByText("Client is overdue")).toBeInTheDocument();
    expect(screen.getByText("Launch consulting")).toBeInTheDocument();
    expect(screen.getByText("Draft outline today")).toBeInTheDocument();
  });

  it("renders the Your focus heading", () => {
    render(
      <SplitPaneChatLayout {...emptyLists} {...noHandlers}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    expect(
      screen.getByRole("heading", { name: /your focus/i })
    ).toBeInTheDocument();
  });

  it("does NOT render a heart icon in the empty state", () => {
    const { container } = render(
      <SplitPaneChatLayout {...emptyLists} {...noHandlers}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    // \u2661 and \u2665 are heart glyphs (outline and filled) — must not appear
    expect(container.textContent).not.toContain("\u2661");
    expect(container.textContent).not.toContain("\u2665");
    expect(container.textContent).not.toContain("\u2664");
  });

  it("shows suggestion buttons in the empty state when onSuggestionClick is provided", () => {
    const onSuggestionClick = vi.fn();
    render(
      <SplitPaneChatLayout
        {...emptyLists}
        {...noHandlers}
        onSuggestionClick={onSuggestionClick}
      >
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    expect(screen.getByText(/not sure what to say/i)).toBeInTheDocument();

    // Click the first suggestion — should call the handler
    const suggestions = screen.getAllByRole("button");
    const firstSuggestion = suggestions.find((btn) =>
      btn.textContent?.includes("stretched thin")
    );
    expect(firstSuggestion).toBeDefined();
    fireEvent.click(firstSuggestion!);
    expect(onSuggestionClick).toHaveBeenCalledWith(
      expect.stringContaining("stretched thin")
    );
  });

  it("calls onToggleDone when a task checkbox is clicked", () => {
    const onToggleDone = vi.fn();
    render(
      <SplitPaneChatLayout
        {...populatedLists}
        completedIds={new Set<string>()}
        onToggleDone={onToggleDone}
        onDelete={() => {}}
      >
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    const toggleButton = screen.getAllByRole("button", {
      name: /mark as done/i,
    })[0];
    fireEvent.click(toggleButton);
    expect(onToggleDone).toHaveBeenCalled();
  });

  it("shows a strikethrough for completed items", () => {
    render(
      <SplitPaneChatLayout
        {...populatedLists}
        completedIds={new Set(["t1"])}
        onToggleDone={() => {}}
        onDelete={() => {}}
      >
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    const completed = screen.getByText("Draft outline today");
    expect(completed.className).toContain("line-through");
  });

  it("shows the items count in the header when there are items", () => {
    render(
      <SplitPaneChatLayout {...populatedLists} {...noHandlers}>
        <div>chat</div>
      </SplitPaneChatLayout>
    );
    // 3 items total (1 issue + 1 goal + 1 task)
    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
  });
});
