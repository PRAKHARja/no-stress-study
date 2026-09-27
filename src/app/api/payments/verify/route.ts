import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { razorpay } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Verify logged-in session
    // --------------------------------------------------
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. Parse and validate request body
    // --------------------------------------------------
    let body: {
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const razorpayOrderId = body.razorpay_order_id;
    const razorpayPaymentId = body.razorpay_payment_id;
    const razorpaySignature = body.razorpay_signature;

    if (
      typeof razorpayOrderId !== "string" ||
      typeof razorpayPaymentId !== "string" ||
      typeof razorpaySignature !== "string" ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        { error: "Invalid payment details" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. Find local order
    // --------------------------------------------------
    const order = await prisma.order.findUnique({
      where: {
        razorpayOrderId,
      },
      include: {
        product: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 4. Make sure the order belongs to this user
    // --------------------------------------------------
    if (order.userId !== session.userId) {
      return NextResponse.json(
        { error: "Unauthorized order access" },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 5. Make sure the order has a product
    // --------------------------------------------------
    if (!order.productId || !order.product) {
      return NextResponse.json(
        { error: "This order has no associated product" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 6. If already paid, don't create another purchase
    // --------------------------------------------------
    if (order.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
      });
    }

    // --------------------------------------------------
    // 7. Verify Razorpay signature
    // --------------------------------------------------
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error(
        "RAZORPAY_KEY_SECRET is not configured"
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(
        `${razorpayOrderId}|${razorpayPaymentId}`
      )
      .digest("hex");

    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, "utf8"),
      Buffer.from(razorpaySignature, "utf8")
    );

    if (!signaturesMatch) {
      return NextResponse.json(
        {
          error: "Payment signature verification failed",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 8. Verify payment with Razorpay
    // --------------------------------------------------
    const payment = await razorpay.payments.fetch(
      razorpayPaymentId
    );

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 400 }
      );
    }

    // Payment must belong to the same Razorpay order
    if (payment.order_id !== razorpayOrderId) {
      return NextResponse.json(
        { error: "Payment does not belong to this order" },
        { status: 400 }
      );
    }

    // Amount must match the amount stored in our database
    if (payment.amount !== order.amount) {
      return NextResponse.json(
        { error: "Payment amount does not match the order" },
        { status: 400 }
      );
    }

    // Only successful/captured payments should create purchases
    if (payment.status !== "captured") {
      return NextResponse.json(
        {
          error: "Payment has not been captured",
          paymentStatus: payment.status,
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 9. Atomically mark order paid + create purchase
    // --------------------------------------------------
    const result = await prisma.$transaction(
      async (tx) => {
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

        // Protect against duplicate verification requests
        if (currentOrder.status === "PAID") {
          return {
            alreadyPaid: true,
          };
        }

        // Check whether the user already owns this product
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
            alreadyPaid: true,
          };
        }

        // Mark order as paid
        await tx.order.update({
          where: {
            id: currentOrder.id,
          },
          data: {
            status: "PAID",
          },
        });

        // Create purchase
        const purchase =
          await tx.purchase.create({
            data: {
              userId: currentOrder.userId,
              productId: currentOrder.productId,
              orderId: currentOrder.id,
            },
          });

        return {
          alreadyPaid: false,
          purchaseId: purchase.id,
        };
      }
    );

    // --------------------------------------------------
    // 10. Return success
    // --------------------------------------------------
    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      ...result,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to verify payment",
      },
      { status: 500 }
    );
  }
}