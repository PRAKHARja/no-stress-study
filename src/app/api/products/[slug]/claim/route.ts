import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "You must be logged in to claim this product.",
        },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { error: "Product slug is required." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        title: true,
        price: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    /*
     * IMPORTANT:
     * The server checks the real database price.
     * A client cannot simply claim a paid product
     * by sending a fake price.
     */
    if (product.price !== 0) {
      return NextResponse.json(
        {
          error:
            "This product is not free. Please use the normal purchase process.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        /*
         * Prevent duplicate purchases.
         */
        const existingPurchase =
          await tx.purchase.findUnique({
            where: {
              userId_productId: {
                userId: session.userId,
                productId: product.id,
              },
            },
          });

        if (existingPurchase) {
          return {
            alreadyClaimed: true,
            purchaseId: existingPurchase.id,
          };
        }

        /*
         * Purchase requires an Order in the current schema.
         *
         * This is an internal free order.
         * It is NOT sent to Razorpay.
         */
        const freeOrderId =
          `free_${session.userId}_${product.id}`;

        const existingFreeOrder =
          await tx.order.findUnique({
            where: {
              razorpayOrderId: freeOrderId,
            },
          });

        let order;

        if (existingFreeOrder) {
          order = existingFreeOrder;
        } else {
          order = await tx.order.create({
            data: {
              userId: session.userId,
              productId: product.id,
              razorpayOrderId: freeOrderId,
              amount: 0,
              discountAmount: 0,
              couponCode: null,
              status: "PAID",
            },
          });
        }

        const purchase =
          await tx.purchase.create({
            data: {
              userId: session.userId,
              productId: product.id,
              orderId: order.id,
            },
          });

        return {
          alreadyClaimed: false,
          purchaseId: purchase.id,
        };
      }
    );

    return NextResponse.json({
      success: true,
      alreadyClaimed: result.alreadyClaimed,
      purchaseId: result.purchaseId,
      message: result.alreadyClaimed
        ? "You already have access to this product."
        : "Free product claimed successfully.",
    });
  } catch (error) {
    console.error(
      "Claim free product error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to claim this free product. Please try again.",
      },
      { status: 500 }
    );
  }
}