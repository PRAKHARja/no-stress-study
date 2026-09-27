import { NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Get webhook secret
    // --------------------------------------------------
    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "RAZORPAY_WEBHOOK_SECRET is not configured"
      );

      return NextResponse.json(
        { error: "Webhook is not configured" },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 2. Read the raw request body
    // --------------------------------------------------
    const rawBody = await request.text();

    // --------------------------------------------------
    // 3. Get Razorpay webhook signature
    // --------------------------------------------------
    const signature = request.headers.get(
      "x-razorpay-signature"
    );

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 4. Verify webhook signature
    // --------------------------------------------------
    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (
      generatedSignature.length !== signature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(generatedSignature, "utf8"),
        Buffer.from(signature, "utf8")
      )
    ) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 5. Parse verified payload
    // --------------------------------------------------
    let payload: RazorpayWebhookPayload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const event = payload.event;

    if (!event) {
      return NextResponse.json(
        { error: "Missing webhook event" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 6. Only process payment.captured
    // --------------------------------------------------
    if (event !== "payment.captured") {
      return NextResponse.json({
        success: true,
        message: "Event ignored",
      });
    }

    const payment =
      payload.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json(
        { error: "Payment information missing" },
        { status: 400 }
      );
    }

    const razorpayPaymentId = payment.id;
    const razorpayOrderId = payment.order_id;

    if (
      typeof razorpayPaymentId !== "string" ||
      typeof razorpayOrderId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid payment information" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 7. Fetch payment directly from Razorpay
    // --------------------------------------------------
    const verifiedPayment =
      await razorpay.payments.fetch(
        razorpayPaymentId
      );

    if (
      verifiedPayment.order_id !== razorpayOrderId ||
      verifiedPayment.status !== "captured"
    ) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 8. Find our local order
    // --------------------------------------------------
    const order = await prisma.order.findUnique({
      where: {
        razorpayOrderId,
      },
    });

    if (!order) {
      console.error(
        "Webhook received for unknown order:",
        razorpayOrderId
      );

      // Return 200 so Razorpay doesn't repeatedly retry
      // an event for an order that does not exist locally.
      return NextResponse.json({
        success: true,
        message: "Order not found locally",
      });
    }

    if (!order.productId) {
      console.error(
        "Webhook order has no product:",
        order.id
      );

      return NextResponse.json(
        { error: "Order has no product" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 9. Verify payment amount against our database
    // --------------------------------------------------
    if (verifiedPayment.amount !== order.amount) {
      console.error(
        "Webhook payment amount mismatch:",
        {
          orderId: order.id,
          expected: order.amount,
          received: verifiedPayment.amount,
        }
      );

      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 10. Create a deterministic webhook event ID
    // --------------------------------------------------
    //
    // Razorpay webhook payloads do not always expose a
    // universal event ID in the same way across setups.
    //
    // For payment.captured we use the payment ID +
    // event name as our idempotency key.
    //
    const eventId =
      `${event}:${razorpayPaymentId}`;

    // --------------------------------------------------
    // 11. Atomically process webhook
    // --------------------------------------------------
    const result = await prisma.$transaction(
      async (tx) => {
        // Attempt to record the webhook event first.
        //
        // If the same event is delivered again, the
        // unique constraint prevents duplicate processing.
        try {
          await tx.paymentWebhook.create({
            data: {
              eventId,
              event,
            },
          });
        } catch {
          return {
            alreadyProcessed: true,
          };
        }

        // Re-read order inside transaction.
        const currentOrder =
          await tx.order.findUnique({
            where: {
              id: order.id,
            },
          });

        if (!currentOrder) {
          throw new Error("Order not found");
        }

        if (!currentOrder.productId) {
          throw new Error(
            "Order has no associated product"
          );
        }

        // Already paid means there is nothing else to do.
        if (currentOrder.status === "PAID") {
          return {
            alreadyProcessed: true,
          };
        }

        // Check whether this user already owns
        // this product.
        const existingPurchase =
          await tx.purchase.findUnique({
            where: {
              userId_productId: {
                userId: currentOrder.userId,
                productId: currentOrder.productId,
              },
            },
          });

        if (existingPurchase) {
          await tx.order.update({
            where: {
              id: currentOrder.id,
            },
            data: {
              status: "PAID",
            },
          });

          return {
            alreadyProcessed: true,
          };
        }

        // Mark order as paid.
        await tx.order.update({
          where: {
            id: currentOrder.id,
          },
          data: {
            status: "PAID",
          },
        });

        // Create the purchase.
        const purchase =
          await tx.purchase.create({
            data: {
              userId: currentOrder.userId,
              productId: currentOrder.productId,
              orderId: currentOrder.id,
            },
          });

        return {
          alreadyProcessed: false,
          purchaseId: purchase.id,
        };
      }
    );

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      ...result,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to process webhook",
      },
      { status: 500 }
    );
  }
}