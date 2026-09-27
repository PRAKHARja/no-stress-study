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
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File must be smaller than 20 MB" },
        { status: 400 }
      );
    }

    const fileKey = `products/${crypto.randomUUID()}.pdf`;

    const arrayBuffer = await file.arrayBuffer();

    await uploadFile(
      fileKey,
      Buffer.from(arrayBuffer),
      file.type
    );

    return NextResponse.json({
      message: "File uploaded successfully",
      fileKey,
    });
  } catch (error) {
    console.error("File upload error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}