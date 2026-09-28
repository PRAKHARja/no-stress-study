import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

function normalizeCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
}

function parseOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    return null;
  }

  return number;
}

export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      coupons,
    });
  } catch (error) {
    console.error("Admin coupons GET error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const code = normalizeCode(body.code);
    const discountType = body.discountType;

    const discountValue = Number(body.discountValue);
    const minimumAmount = parseOptionalInteger(body.minimumAmount);
    const maximumDiscount = parseOptionalInteger(body.maximumDiscount);
    const usageLimit = parseOptionalInteger(body.usageLimit);

    const expiresAt =
      body.expiresAt && typeof body.expiresAt === "string"
        ? new Date(body.expiresAt)
        : null;

    if (!code) {
      return NextResponse.json(
        { error: "Coupon code is required." },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      return NextResponse.json(
        {
          error:
            "Coupon code must be 3-30 characters and contain only letters, numbers, hyphens, or underscores.",
        },
        { status: 400 }
      );
    }

    if (
      discountType !== "PERCENTAGE" &&
      discountType !== "FIXED"
    ) {
      return NextResponse.json(
        { error: "Invalid discount type." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(discountValue) ||
      discountValue <= 0
    ) {
      return NextResponse.json(
        { error: "Discount value must be greater than 0." },
        { status: 400 }
      );
    }

    if (
      discountType === "PERCENTAGE" &&
      discountValue > 100
    ) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%." },
        { status: 400 }
      );
    }

    if (
      minimumAmount !== null &&
      minimumAmount <= 0
    ) {
      return NextResponse.json(
        { error: "Minimum amount must be greater than 0." },
        { status: 400 }
      );
    }

    if (
      maximumDiscount !== null &&
      maximumDiscount <= 0
    ) {
      return NextResponse.json(
        { error: "Maximum discount must be greater than 0." },
        { status: 400 }
      );
    }

    if (
      discountType === "FIXED" &&
      maximumDiscount !== null
    ) {
      return NextResponse.json(
        {
          error:
            "Maximum discount should only be used with percentage coupons.",
        },
        { status: 400 }
      );
    }

    if (
      usageLimit !== null &&
      usageLimit <= 0
    ) {
      return NextResponse.json(
        { error: "Usage limit must be greater than 0." },
        { status: 400 }
      );
    }

    if (
      body.expiresAt &&
      (!expiresAt || Number.isNaN(expiresAt.getTime()))
    ) {
      return NextResponse.json(
        { error: "Invalid expiry date." },
        { status: 400 }
      );
    }

    if (
      expiresAt &&
      expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "Expiry date must be in the future." },
        { status: 400 }
      );
    }

    const existingCoupon = await prisma.coupon.findUnique({
      where: {
        code,
      },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: "A coupon with this code already exists." },
        { status: 409 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue,
        minimumAmount,
        maximumDiscount,
        usageLimit,
        expiresAt,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Coupon created successfully.",
        coupon,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin coupons POST error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}