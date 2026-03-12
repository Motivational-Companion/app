import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the ElevenLabs SDK since it requires browser APIs
vi.mock("@elevenlabs/react", () => ({
  useConversation: () => ({
    startSession: vi.fn().mockResolvedValue("test-conversation-id"),
    endSession: vi.fn().mockResolvedValue(undefined),
    status: "disconnected" as const,
    isSpeaking: false,
    canSendFeedback: false,
    micMuted: false,
    setVolume: vi.fn(),
    getInputByteFrequencyData: vi.fn(),
    getOutputByteFrequencyData: vi.fn(),
    getInputVolume: vi.fn().mockReturnValue(0),
    getOutputVolume: vi.fn().mockReturnValue(0),
    sendFeedback: vi.fn(),
    getId: vi.fn(),
    sendContextualUpdate: vi.fn(),
    sendUserMessage: vi.fn(),
    sendUserActivity: vi.fn(),
    sendMCPToolApprovalResult: vi.fn(),
    changeInputDevice: vi.fn(),
    changeOutputDevice: vi.fn(),
  }),
}));

import Conversation from "@/components/Conversation";

describe("Conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pre-conversation landing screen", () => {
    render(<Conversation />);
    expect(screen.getByText(/meet sam/i)).toBeInTheDocument();
    expect(screen.getByText(/talk to sam/i)).toBeInTheDocument();
  });

  it("shows the back button when onBack is provided", () => {
    const onBack = vi.fn();
    render(<Conversation onBack={onBack} />);
    // Back arrow (←) should be visible
    const backBtn = screen.getByText("←");
    expect(backBtn).toBeInTheDocument();
  });

  it("does not show back button when onBack is not provided", () => {
    render(<Conversation />);
    expect(screen.queryByText("←")).not.toBeInTheDocument();
  });

  it("shows the 3-step process", () => {
    render(<Conversation />);
    expect(screen.getByText(/share what's on your mind/i)).toBeInTheDocument();
    expect(screen.getByText(/sam helps you find clarity/i)).toBeInTheDocument();
    expect(screen.getByText(/walk away with a clear action plan/i)).toBeInTheDocument();
  });
});
