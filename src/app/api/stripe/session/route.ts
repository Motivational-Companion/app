import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 500 }
    );
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required." },
      { status: 400 }
    );
  }

  const stripe = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      customer_id: session.customer as string,
      customer_email:
        session.customer_details?.email || session.customer_email || null,
      subscription_id: session.subscription as string | null,
      payment_status: session.payment_status,
    });
  } catch (error) {
    console.error("Failed to retrieve Stripe session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session." },
      { status: 500 }
    );
  }
}
