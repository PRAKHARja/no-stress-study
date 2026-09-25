import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();

  const token = cookieStore.get("session")?.value;

  if (!token) {
    return NextResponse.json(
      { user: null },
      { status: 401 }
    );
  }

  const session = await verifySession(token);

  if (!session) {
    return NextResponse.json(
      { user: null },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { user: null },
      { status: 401 }
    );
  }

  return NextResponse.json({ user });
}