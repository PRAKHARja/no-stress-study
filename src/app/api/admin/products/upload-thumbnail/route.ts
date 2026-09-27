import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { uploadFile } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, and WebP images are allowed",
        },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "Image must be smaller than 5 MB",
        },
        { status: 400 }
      );
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";

    const fileKey = `thumbnails/${crypto.randomUUID()}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();

    await uploadFile(
      fileKey,
      Buffer.from(arrayBuffer),
      file.type
    );

    return NextResponse.json({
      message: "Thumbnail uploaded successfully",
      fileKey,
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}