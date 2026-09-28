import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const coupon = await prisma.coupon.findUnique({
      where: {
        id,
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon not found." },
        { status: 404 }
      );
    }

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean." },
        { status: 400 }
      );
    }

    const updatedCoupon = await prisma.coupon.update({
      where: {
        id,
      },
      data: {
        isActive: body.isActive,
      },
    });

    return NextResponse.json({
      message: body.isActive
        ? "Coupon activated."
        : "Coupon deactivated.",
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Admin coupon PATCH error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const coupon = await prisma.coupon.findUnique({
      where: {
        id,
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon not found." },
        { status: 404 }
      );
    }

    if (coupon.usedCount > 0) {
      return NextResponse.json(
        {
          error:
            "A coupon that has already been used cannot be deleted. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await prisma.coupon.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Coupon deleted successfully.",
    });
  } catch (error) {
    console.error("Admin coupon DELETE error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}