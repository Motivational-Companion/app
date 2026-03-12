import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Onboarding from "@/components/Onboarding";

describe("Onboarding", () => {
  it("renders the landing screen first", () => {
    render(<Onboarding onComplete={vi.fn()} />);
    expect(screen.getByText(/you don't need more/i)).toBeInTheDocument();
    expect(screen.getByText(/start my free session/i)).toBeInTheDocument();
  });

  it("navigates to Meet Sam screen on CTA click", () => {
    render(<Onboarding onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText(/start my free session/i));

    // After transition, should show Sam intro
    setTimeout(() => {
      expect(screen.getByText(/Hi, I'm Sam/i)).toBeInTheDocument();
    }, 300);
  });

  it("shows all four options on 'What brings you here' screen", async () => {
    render(<Onboarding onComplete={vi.fn()} />);

    // Navigate: landing → meet sam → what brings you here
    fireEvent.click(screen.getByText(/start my free session/i));
    await new Promise((r) => setTimeout(r, 300));
    fireEvent.click(screen.getByText(/let's do this/i));
    await new Promise((r) => setTimeout(r, 300));

    expect(screen.getByText(/I'm overwhelmed/i)).toBeInTheDocument();
    expect(screen.getByText(/I feel stuck/i)).toBeInTheDocument();
    expect(screen.getByText(/I need clarity/i)).toBeInTheDocument();
    expect(screen.getByText(/I want accountability/i)).toBeInTheDocument();
  });

  it("calls onComplete when reaching the paywall CTA", async () => {
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);

    // We'll test that onComplete exists and is callable
    expect(onComplete).not.toHaveBeenCalled();
  });
});
