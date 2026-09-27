import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFileUrl } from "@/lib/r2";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        thumbnailKey: true,
      },
    });

    if (!product || !product.thumbnailKey) {
      return NextResponse.json(
        { error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    const signedUrl = await getFileUrl(
      product.thumbnailKey,
      300
    );

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Thumbnail URL error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}