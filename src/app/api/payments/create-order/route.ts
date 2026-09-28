import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { calculateCouponDiscount } from "@/lib/coupons";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: "You must be logged in to purchase",
        },
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

    const body = await request.json();

    const productId =
      typeof body.productId === "string"
        ? body.productId.trim()
        : "";

    const couponCode =
      typeof body.couponCode === "string"
        ? body.couponCode.trim()
        : "";

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const existingPurchase =
      await prisma.purchase.findUnique({
        where: {
          userId_productId: {
            userId: session.userId,
            productId: product.id,
          },
        },
      });

    if (existingPurchase) {
      return NextResponse.json(
        {
          error:
            "You have already purchased this product",
        },
        { status: 409 }
      );
    }

    let finalAmount = product.price;
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const couponResult =
        await calculateCouponDiscount(
          product.id,
          couponCode
        );

      if (!couponResult.valid) {
        return NextResponse.json(
          {
            error: couponResult.error,
          },
          { status: 400 }
        );
      }

      finalAmount =
        couponResult.calculation.finalAmount;

      discountAmount =
        couponResult.calculation.discountAmount;

      appliedCouponCode =
        couponResult.calculation.code;
    }

    const razorpayOrder =
      await razorpay.orders.create({
        amount: finalAmount,
        currency: "INR",
        receipt: `receipt_${product.id}_${Date.now()}`,
      });

    const order = await prisma.order.create({
      data: {
        userId: session.userId,
        productId: product.id,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        discountAmount,
        couponCode: appliedCouponCode,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      product: {
        id: product.id,
        title: product.title,
      },
      pricing: {
        originalAmount: product.price,
        discountAmount,
        finalAmount,
        couponCode: appliedCouponCode,
      },
    });
  } catch (error) {
    console.error(
      "Create Razorpay order error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to create payment order",
      },
      { status: 500 }
    );
  }
}