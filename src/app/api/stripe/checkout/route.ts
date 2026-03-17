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
    const { priceId, plan } = body as { priceId: string; plan: "annual" | "monthly" };

    if (!priceId || !plan) {
      return NextResponse.json(
        { error: "Missing required fields: priceId and plan." },
        { status: 400 }
      );
    }

    if (plan !== "annual" && plan !== "monthly") {
      return NextResponse.json(
        { error: "Plan must be either 'annual' or 'monthly'." },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);

    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "An unexpected error occurred while creating the checkout session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
