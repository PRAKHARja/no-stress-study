import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        role: true,
      },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    response.cookies.set(
      "admin-preview",
      "true",
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Admin preview activation error:",
      error
    );

    return NextResponse.json(
      { error: "Unable to enable preview mode" },
      { status: 500 }
    );
  }
}