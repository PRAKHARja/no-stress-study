import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">
          No Stress Study
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Admin Panel
        </p>

        <nav className="mt-10 space-y-2">
          <Link
            href="/admin"
            className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/products"
            className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Products
          </Link>

          <Link
            href="/admin/categories"
            className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Categories
          </Link>

          <Link
            href="/admin/orders"
            className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Orders
          </Link>

          <Link
            href="/admin/coupons"
            className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Coupons
          </Link>
        </nav>
      </aside>

      <main className="ml-64 min-h-screen p-8 text-slate-900">
        {children}
      </main>
    </div>
  );
}