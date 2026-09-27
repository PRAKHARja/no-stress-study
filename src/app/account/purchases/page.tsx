import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

export default async function PurchasesPage() {
  const cookieStore = await cookies();

  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await verifySession(token);

  if (!session) {
    redirect("/login");
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      userId: session.userId,
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      order: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div>
          <Link
            href="/account"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to Account
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            My Purchases
          </h1>

          <p className="mt-2 text-slate-500">
            Access the study materials you have purchased.
          </p>
        </div>

        {purchases.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📚</div>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              No purchases yet
            </h2>

            <p className="mt-2 text-slate-500">
              Your purchased study materials will appear
              here.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Browse Study Materials
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50">
                  {purchase.product.thumbnailKey ? (
                    <img
                      src={`/api/products/${purchase.product.slug}/thumbnail`}
                      alt={purchase.product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-5xl">
                      📚
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                    {purchase.product.category.name}
                  </span>

                  <h2 className="mt-4 text-xl font-bold text-slate-900">
                    {purchase.product.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Purchased on{" "}
                    {purchase.createdAt.toLocaleDateString(
                      "en-IN"
                    )}
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    Amount paid: ₹
                    {(
                      purchase.order.amount / 100
                    ).toFixed(0)}
                  </p>

                  <Link
                    href={`/api/purchases/${purchase.id}/access`}
                    className="mt-6 block w-full rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View Study Material
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}