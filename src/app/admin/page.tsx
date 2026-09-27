import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/login");
  }

  const [productCount, categoryCount, userCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.user.count(),
  ]);

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-600">
          Welcome, {admin.name || admin.email}
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* Products */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Products
          </p>

          <p className="mt-2 text-4xl font-bold text-slate-900">
            {productCount}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Total study materials
          </p>
        </div>

        {/* Categories */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Categories
          </p>

          <p className="mt-2 text-4xl font-bold text-slate-900">
            {categoryCount}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Available categories
          </p>
        </div>

        {/* Users */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Users
          </p>

          <p className="mt-2 text-4xl font-bold text-slate-900">
            {userCount}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Registered users
          </p>
        </div>
      </div>
    </div>
  );
}