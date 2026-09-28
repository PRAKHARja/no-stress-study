import { NextResponse } from "next/server";

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
          error: "You must be logged in to use a coupon.",
        },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        {
          error: "Invalid session.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const productId =
      typeof body.productId === "string"
        ? body.productId.trim()
        : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    if (!productId) {
      return NextResponse.json(
        {
          error: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          error: "Coupon code is required.",
        },
        { status: 400 }
      );
    }

    const result = await calculateCouponDiscount(
      productId,
      code
    );

    if (!result.valid) {
      return NextResponse.json(
        {
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: result.calculation.couponId,
        code: result.calculation.code,
      },
      originalAmount: result.calculation.originalAmount,
      discountAmount: result.calculation.discountAmount,
      finalAmount: result.calculation.finalAmount,
    });
  } catch (error) {
    console.error(
      "Coupon validation error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to validate coupon.",
      },
      { status: 500 }
    );
  }
}