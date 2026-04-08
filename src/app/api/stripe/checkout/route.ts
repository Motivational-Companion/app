import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is not set in environment variables.");
    return NextResponse.json(
      { error: "Stripe is not configured. Please contact support." },
      { status: 500 }
    );
  }

  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID?.trim();
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID?.trim();

  if (!annualPriceId || !monthlyPriceId) {
    console.error("Stripe price IDs are not set in environment variables.");
    return NextResponse.json(
      { error: "Stripe pricing is not configured. Please contact support." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const body = await request.json();
    const { plan, email } = body as { plan: "annual" | "monthly"; email?: string };

    if (!plan || (plan !== "annual" && plan !== "monthly")) {
      return NextResponse.json(
        { error: "Plan must be either 'annual' or 'monthly'." },
        { status: 400 }
      );
    }

    const priceId = plan === "annual" ? annualPriceId : monthlyPriceId;
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
    };

    // Pre-fill email if provided (from quiz or auth)
    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
