import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is not set in environment variables.");
    return NextResponse.json(
      { error: "Stripe is not configured. Please contact support." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });

  try {
    const body = await request.json();
    const { customerId } = body as { customerId: string };

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing required field: customerId." },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe customer portal session creation failed:", error);

    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "An unexpected error occurred while creating the portal session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
