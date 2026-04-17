import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AuthGate from "@/components/AuthGate";

// Mock the Supabase client module. Each test resets the mocks.
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
    },
  }),
}));

describe("AuthGate", () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset();
    mockVerifyOtp.mockReset();
    // Default: successful OTP send
    mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("signin variant (default)", () => {
    it("renders the email step with Welcome back heading", () => {
      render(<AuthGate onAuthenticated={vi.fn()} />);
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/your email address/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/send sign-in link/i)).toBeInTheDocument();
    });

    it("does not show the trial pill", () => {
      render(<AuthGate onAuthenticated={vi.fn()} />);
      expect(screen.queryByText(/7-day free trial/i)).not.toBeInTheDocument();
    });

    it("calls signInWithOtp when email form is submitted", async () => {
      render(<AuthGate onAuthenticated={vi.fn()} />);
      const emailInput = screen.getByPlaceholderText(/your email address/i);
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.click(screen.getByText(/send sign-in link/i));

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith(
          expect.objectContaining({ email: "user@example.com" })
        );
      });
    });
  });

  describe("post-purchase variant", () => {
    it("shows the trial started pill badge", () => {
      render(
        <AuthGate onAuthenticated={vi.fn()} variant="post-purchase" />
      );
      expect(
        screen.getByText(/your 7-day free trial has started/i)
      ).toBeInTheDocument();
    });

    it("shows post-purchase heading", () => {
      render(
        <AuthGate onAuthenticated={vi.fn()} variant="post-purchase" />
      );
      expect(screen.getByText(/one last step/i)).toBeInTheDocument();
    });
  });

  describe("prefilledEmail (auto-send flow)", () => {
    it("skips directly to the code step when prefilledEmail is set", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      // Should be on the code step, not the email step. The code step
      // heading is "Check your email" regardless of variant (standard
      // OTP UX pattern — imperative verb tells the user what to do).
      expect(
        screen.getByRole("heading", { name: /check your email/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText(/your email$/i)
      ).not.toBeInTheDocument();

      // Should display the email
      expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    });

    it("auto-sends OTP to prefilledEmail on mount", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
        expect(mockSignInWithOtp).toHaveBeenCalledWith(
          expect.objectContaining({ email: "buyer@example.com" })
        );
      });
    });

    it("displays error if auto-send fails with a non-rate-limit error", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid email address" },
      });

      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it("converts rate-limit error to a friendly countdown notice", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "For security purposes, you can only request this after 42 seconds.",
        },
      });

      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/already sent recently.*request a new one in 42s/i)
        ).toBeInTheDocument();
      });
      // The raw error should NOT be surfaced.
      expect(
        screen.queryByText(/for security purposes/i)
      ).not.toBeInTheDocument();
      // Resend button should reflect the same cooldown.
      expect(screen.getByText(/resend in 42s/i)).toBeInTheDocument();
    });

    it("shows Resend code button on the code step", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        // After initial send the cooldown starts, so button shows countdown
        expect(screen.getByText(/resend in \d+s/i)).toBeInTheDocument();
      });
    });

    it("shows Use a different email button on the code step", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      expect(
        screen.getByText(/use a different email/i)
      ).toBeInTheDocument();
    });

    it("returns to email step when Use a different email is clicked", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      // Wait for auto-send to complete
      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText(/use a different email/i));

      // Should now be on email step with empty field
      expect(screen.getByPlaceholderText(/your email/i)).toBeInTheDocument();
      expect(
        (screen.getByPlaceholderText(/your email/i) as HTMLInputElement).value
      ).toBe("");
    });
  });

  describe("code verification", () => {
    it("calls verifyOtp when 6-digit code is submitted", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });

      const codeInput = screen.getByLabelText(
        /6-digit verification code/i
      ) as HTMLInputElement;

      // fireEvent.change with the full value covers both paste and
      // fast typing. Both trigger auto-submit once the 6th digit lands.
      fireEvent.change(codeInput, { target: { value: "123456" } });

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "buyer@example.com",
            token: "123456",
            type: "email",
          })
        );
      });
    });

    it("auto-submits when the 6th digit is entered", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });

      const codeInput = screen.getByLabelText(/6-digit verification code/i);

      // 5 digits should NOT auto-submit
      fireEvent.change(codeInput, { target: { value: "12345" } });
      expect(mockVerifyOtp).not.toHaveBeenCalled();

      // 6 digits SHOULD auto-submit
      fireEvent.change(codeInput, { target: { value: "123456" } });
      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onAuthenticated after successful verification", async () => {
      const onAuthenticated = vi.fn();
      render(
        <AuthGate
          onAuthenticated={onAuthenticated}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });

      const codeInput = screen.getByLabelText(/6-digit verification code/i);
      fireEvent.change(codeInput, { target: { value: "123456" } });

      await waitFor(() => {
        expect(onAuthenticated).toHaveBeenCalled();
      });
    });

    it("shows error and clears the code when verifyOtp fails", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid code" },
      });

      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });

      const codeInput = screen.getByLabelText(
        /6-digit verification code/i
      ) as HTMLInputElement;
      fireEvent.change(codeInput, { target: { value: "999999" } });

      // Error is shown AND the code input is cleared so the user can retype
      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(codeInput.value).toBe("");
      });
    });

    it("strips non-digit characters from code input", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      const codeInput = screen.getByLabelText(
        /6-digit verification code/i
      ) as HTMLInputElement;
      fireEvent.change(codeInput, { target: { value: "12-34-56" } });

      expect(codeInput.value).toBe("123456");
    });
  });

  describe("email-step rate limit", () => {
    it("advances to code step and shows countdown when rate limited", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "For security purposes, you can only request this after 17 seconds.",
        },
      });

      render(<AuthGate onAuthenticated={vi.fn()} />);
      fireEvent.change(screen.getByPlaceholderText(/your email address/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.click(screen.getByText(/send sign-in link/i));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /check your email/i })
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/request a new one in 17s/i)).toBeInTheDocument();
    });
  });

  describe("resend cooldown", () => {
    it("disables resend button during cooldown", async () => {
      render(
        <AuthGate
          onAuthenticated={vi.fn()}
          variant="post-purchase"
          prefilledEmail="buyer@example.com"
        />
      );

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });

      // After initial auto-send, cooldown starts (30s)
      const resendButton = screen.getByText(/resend in \d+s/i);
      expect(resendButton).toBeDisabled();
    });
  });
});
