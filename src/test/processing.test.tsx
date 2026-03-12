import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Processing from "@/components/Processing";

describe("Processing", () => {
  it("renders the organizing message", () => {
    render(<Processing onComplete={vi.fn()} />);
    expect(
      screen.getByText("Organizing your thoughts...")
    ).toBeInTheDocument();
  });

  it("shows Sam's avatar", () => {
    render(<Processing onComplete={vi.fn()} />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("calls onComplete after timeout", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<Processing onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onComplete).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
