import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error(
      "Stripe environment variables are not configured. Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set."
    );
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing stripe-signature header on webhook request.");
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown signature verification error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  // Handle supported event types
  // Database integration will be added in Milestone 3
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `Checkout session completed: ${session.id}, customer: ${session.customer}, subscription: ${session.subscription}`
      );
      break;
    }

    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(
        `Subscription created: ${subscription.id}, customer: ${subscription.customer}, status: ${subscription.status}`
      );
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(
        `Subscription updated: ${subscription.id}, customer: ${subscription.customer}, status: ${subscription.status}`
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(
        `Subscription deleted: ${subscription.id}, customer: ${subscription.customer}`
      );
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(
        `Invoice payment succeeded: ${invoice.id}, customer: ${invoice.customer}, amount: ${invoice.amount_paid}`
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(
        `Invoice payment failed: ${invoice.id}, customer: ${invoice.customer}, amount: ${invoice.amount_due}`
      );
      break;
    }

    default: {
      console.log(`Unhandled event type: ${event.type}`);
    }
  }

  return NextResponse.json({ received: true });
}
