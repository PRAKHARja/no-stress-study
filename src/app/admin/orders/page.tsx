import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export default async function AdminOrdersPage() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/login");
  }

  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const paidOrders = orders.filter(
    (order) => order.status === "PAID"
  );

  const totalRevenue = paidOrders.reduce(
    (total, order) => total + order.amount,
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Orders
          </h1>

          <p className="mt-2 text-slate-600">
            View customer orders and payment activity.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Revenue
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            ₹{(totalRevenue / 100).toFixed(0)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Paid Orders
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {paidOrders.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Orders
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {orders.length}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-5xl">🧾</div>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              No orders yet
            </h2>

            <p className="mt-2 text-slate-500">
              Customer orders will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Product
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Amount
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {order.user.name ||
                          "Unnamed User"}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {order.user.email}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {order.product ? (
                        <div className="font-medium text-slate-900">
                          {order.product.title}
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          Legacy order
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-900">
                      ₹{(order.amount / 100).toFixed(0)}
                    </td>

                    <td className="px-6 py-4">
                      {order.status === "PAID" ? (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          PAID
                        </span>
                      ) : order.status ===
                        "PENDING" ? (
                        <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                          PENDING
                        </span>
                      ) : order.status ===
                        "FAILED" ? (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          FAILED
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {order.status}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {order.createdAt.toLocaleDateString(
                        "en-IN"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}