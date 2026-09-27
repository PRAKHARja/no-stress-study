import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { getFileUrl } from "@/lib/r2";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
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

    const { id } = await context.params;

    const purchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },
        include: {
          product: true,
          order: true,
        },
      });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    if (purchase.userId !== session.userId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    if (purchase.order.status !== "PAID") {
      return NextResponse.json(
        {
          error:
            "This purchase has not been paid for",
        },
        { status: 403 }
      );
    }

    const signedUrl = await getFileUrl(
      purchase.product.fileKey,
      300
    );

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error(
      "Purchase access error:",
      error
    );

    return NextResponse.json(
      { error: "Unable to access study material" },
      { status: 500 }
    );
  }
}