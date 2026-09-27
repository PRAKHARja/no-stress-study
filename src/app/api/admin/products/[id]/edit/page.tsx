import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { deleteFile } from "@/lib/r2";

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
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Get product error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const {
      title,
      slug,
      description,
      price,
      categoryId,
      fileKey,
      thumbnailKey,
    } = body;

    if (
      !title ||
      !slug ||
      !description ||
      price === undefined ||
      !categoryId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);

    if (!Number.isInteger(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 }
      );
    }

    const duplicateSlug = await prisma.product.findFirst({
      where: {
        slug,
        NOT: {
          id,
        },
      },
    });

    if (duplicateSlug) {
      return NextResponse.json(
        { error: "Another product already uses this slug" },
        { status: 409 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: {
        title,
        slug,
        description,
        price: numericPrice,
        categoryId,
        ...(fileKey ? { fileKey } : {}),
        ...(thumbnailKey
          ? { thumbnailKey }
          : {}),
      },
      include: {
        category: true,
      },
    });

    if (
      thumbnailKey &&
      existingProduct.thumbnailKey &&
      thumbnailKey !== existingProduct.thumbnailKey
    ) {
      try {
        await deleteFile(existingProduct.thumbnailKey);
      } catch (error) {
        console.error(
          "Old thumbnail deletion failed:",
          error
        );
      }
    }

    if (
      fileKey &&
      fileKey !== existingProduct.fileKey
    ) {
      try {
        await deleteFile(existingProduct.fileKey);
      } catch (error) {
        console.error(
          "Old PDF deletion failed:",
          error
        );
      }
    }

    return NextResponse.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
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

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const purchaseCount = await prisma.purchase.count({
      where: {
        productId: id,
      },
    });

    if (purchaseCount > 0) {
      return NextResponse.json(
        {
          error:
            "This product cannot be deleted because it has already been purchased.",
        },
        { status: 409 }
      );
    }

    await prisma.product.delete({
      where: {
        id,
      },
    });

    try {
      await deleteFile(product.fileKey);
    } catch (error) {
      console.error(
        "PDF deletion from R2 failed:",
        error
      );
    }

    if (product.thumbnailKey) {
      try {
        await deleteFile(product.thumbnailKey);
      } catch (error) {
        console.error(
          "Thumbnail deletion from R2 failed:",
          error
        );
      }
    }

    return NextResponse.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}