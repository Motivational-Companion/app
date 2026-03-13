import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

async function syncSubscriptionToProfile(
  customerId: string,
  subscriptionId: string,
  status: string,
  plan?: string,
  trialEnd?: number | null
) {
  const supabase = createServiceClient();
  if (!supabase) {
    console.log("Supabase not configured — skipping subscription sync");
    return;
  }
  const updates: Record<string, unknown> = {
    stripe_customer_id: customerId,
    subscription_id: subscriptionId,
    subscription_status: status,
  };
  if (plan) updates.subscription_plan = plan;
  if (trialEnd) updates.trial_ends_at = new Date(trialEnd * 1000).toISOString();

  // Try to update by stripe_customer_id first
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("stripe_customer_id", customerId)
    .select("id");

  if (error) {
    console.error("Failed to sync subscription to profile:", error);
  } else if (!data || data.length === 0) {
    console.log(`No profile found for Stripe customer ${customerId} — will be linked on next login`);
  }
}

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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `Checkout session completed: ${session.id}, customer: ${session.customer}, subscription: ${session.subscription}`
      );
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items?.data?.[0]?.price?.id;
      let plan: string | undefined;
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID) plan = "annual";
      else if (priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) plan = "monthly";

      console.log(
        `Subscription ${event.type === "customer.subscription.created" ? "created" : "updated"}: ${subscription.id}, customer: ${subscription.customer}, status: ${subscription.status}`
      );

      await syncSubscriptionToProfile(
        subscription.customer as string,
        subscription.id,
        subscription.status,
        plan,
        subscription.trial_end
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(
        `Subscription deleted: ${subscription.id}, customer: ${subscription.customer}`
      );
      await syncSubscriptionToProfile(
        subscription.customer as string,
        subscription.id,
        "canceled"
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
