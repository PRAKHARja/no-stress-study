import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await verifySession(token);

  if (!session) {
    redirect("/login");
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
      createdAt: true,
      _count: {
        select: {
          purchases: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        {/* Page Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Welcome{user.name ? `, ${user.name}` : ""}
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your account and access your study materials.
          </p>
        </div>

        {/* Account Overview */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Profile */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Profile
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your account information
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {user.name || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {user.email}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Member since
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {new Intl.DateTimeFormat("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(user.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Purchases Summary */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-sm">
            <p className="text-sm font-medium text-indigo-100">
              Your Library
            </p>

            <p className="mt-3 text-4xl font-bold">
              {user._count.purchases}
            </p>

            <p className="mt-1 text-sm text-indigo-100">
              {user._count.purchases === 1
                ? "study material purchased"
                : "study materials purchased"}
            </p>

            <Link
              href="/account/purchases"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            >
              View My Purchases
            </Link>
          </div>
        </div>

        {/* Account Actions */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">
            Account
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/account/purchases"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                  📚
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">
                    My Purchases
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    View and access your purchased materials.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-2xl">
                  🔎
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">
                    Browse Materials
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Explore more study materials.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Account Notice */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-900">
            Secure Digital Access
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your purchased study materials are securely stored and can only
            be accessed through your account after a successful payment.
          </p>
        </div>
      </div>
    </main>
  );
}