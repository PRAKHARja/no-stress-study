"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-900 p-6 text-white shadow-lg lg:block">
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

          <div className="my-4 border-t border-slate-700" />

          <Link
            href="/api/admin/preview"
            className="block rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500"
          >
            👁 View User Site
          </Link>
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900 text-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold">
              No Stress Study
            </h1>

            <p className="text-xs text-slate-400">
              Admin Panel
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xl text-white transition hover:bg-slate-700"
            aria-label="Toggle admin menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-slate-700 px-4 pb-4 pt-3">
            <div className="space-y-2">
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/admin/products"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                Products
              </Link>

              <Link
                href="/admin/categories"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                Categories
              </Link>

              <Link
                href="/admin/orders"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                Orders
              </Link>

              <Link
                href="/admin/coupons"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                Coupons
              </Link>

              <div className="my-3 border-t border-slate-700" />

              <Link
                href="/api/admin/preview"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-indigo-500"
              >
                👁 View User Site
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-screen p-4 text-slate-900 sm:p-6 lg:ml-64 lg:p-8">
        {children}
      </main>
    </div>
  );
}