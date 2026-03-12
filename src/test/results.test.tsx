import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Results from "@/components/Results";
import type { ActionPlan } from "@/lib/types";

const mockPlan: ActionPlan = {
  vision_statement:
    "You want to feel calm and in control of your mornings, with clear priorities and energy for what matters.",
  priorities: [
    {
      rank: 1,
      theme: "Morning routine",
      urgency: "high",
      importance: "high",
      next_action: "Set alarm for 6 AM tomorrow and do a 20-minute walk before checking your phone.",
      timeframe: "Tomorrow morning",
    },
    {
      rank: 2,
      theme: "Work focus",
      urgency: "medium",
      importance: "high",
      next_action: "Block 9-11 AM on your calendar for deep work with notifications off.",
      timeframe: "This week",
    },
  ],
  recommended_first_step:
    "Set alarm for 6 AM tomorrow and do a 20-minute walk before checking your phone.",
};

describe("Results", () => {
  it("renders the vision statement", () => {
    render(<Results plan={mockPlan} onStartOver={vi.fn()} />);
    expect(
      screen.getByText(/calm and in control of your mornings/)
    ).toBeInTheDocument();
  });

  it("renders the recommended first step", () => {
    render(<Results plan={mockPlan} onStartOver={vi.fn()} />);
    // Appears in both "Start Here" card and priority list
    const matches = screen.getAllByText(/Set alarm for 6 AM tomorrow/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all priority themes", () => {
    render(<Results plan={mockPlan} onStartOver={vi.fn()} />);
    expect(screen.getByText("Morning routine")).toBeInTheDocument();
    expect(screen.getByText("Work focus")).toBeInTheDocument();
  });

  it("renders urgency and importance badges", () => {
    render(<Results plan={mockPlan} onStartOver={vi.fn()} />);
    expect(screen.getByText("high urgency")).toBeInTheDocument();
    expect(screen.getByText("medium urgency")).toBeInTheDocument();
  });

  it("shows copy and start over buttons", () => {
    render(<Results plan={mockPlan} onStartOver={vi.fn()} />);
    expect(screen.getByText("Copy to Clipboard")).toBeInTheDocument();
    expect(screen.getByText("Start Over")).toBeInTheDocument();
  });

  it("renders the page title", () => {
    render(<Results plan={mockPlan} onStartOver={vi.fn()} />);
    expect(screen.getByText("Your Action Plan")).toBeInTheDocument();
  });
});
