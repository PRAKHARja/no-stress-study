import Link from "next/link";

import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/SiteHeader";

type HomePageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
};

export default async function HomePage({
  searchParams,
}: HomePageProps) {
  const params = await searchParams;

  const search =
    typeof params.search === "string"
      ? params.search.trim()
      : "";

  const categorySlug =
    typeof params.category === "string"
      ? params.category
      : "";

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const products = await prisma.product.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {},
        categorySlug
          ? {
              category: {
                slug: categorySlug,
              },
            }
          : {},
      ],
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const selectedCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />

      {/* Hero Section */}
      <section className="border-b border-indigo-700 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-100">
              Study smarter
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Study Materials Without the Stress
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-indigo-100">
              Find curated notes, question banks, study guides, and other
              academic resources in one place.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <form
            method="GET"
            action="/"
            className="grid gap-4 md:grid-cols-[1fr_260px_auto]"
          >
            {/* Search */}
            <div>
              <label
                htmlFor="search"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Search study materials
              </label>

              <input
                id="search"
                name="search"
                type="text"
                defaultValue={search}
                placeholder="Search notes, subjects, topics..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Category
              </label>

              <select
                id="category"
                name="category"
                defaultValue={categorySlug}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="" className="text-slate-900">
                  All categories
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.slug}
                    className="text-slate-900"
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 md:w-auto"
              >
                Search
              </button>
            </div>
          </form>

          {/* Active Filters */}
          {(search || categorySlug) && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                Showing results for:
              </span>

              {search && (
                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                  “{search}”
                </span>
              )}

              {selectedCategory && (
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700">
                  {selectedCategory.name}
                </span>
              )}

              <Link
                href="/"
                className="ml-1 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {search || selectedCategory
                ? "Search Results"
                : "Latest Study Materials"}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {products.length === 0
                ? "No study materials found."
                : `${products.length} ${
                    products.length === 1 ? "material" : "materials"
                  } available`}
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="text-5xl">📚</div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No materials found
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Try a different search term or category.
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              View all materials
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50">
                  {product.thumbnailKey ? (
                    <img
                      src={`/api/products/${product.slug}/thumbnail`}
                      alt={product.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className="text-5xl">📚</div>
                      <p className="mt-2 text-sm font-semibold text-indigo-500">
                        Study Material
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {product.category.name}
                  </span>

                  <h3 className="mt-3 line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-indigo-600">
                    {product.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {product.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xl font-bold text-indigo-600">
                      ₹{(product.price / 100).toFixed(0)}
                    </span>

                    <span className="text-sm font-semibold text-slate-500 transition group-hover:text-indigo-600">
                      View →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-12 text-center shadow-lg sm:px-12">
            <h2 className="text-3xl font-bold text-white">
              Study smarter. Stress less.
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-indigo-100">
              Get the study materials you need and focus on what actually
              matters.
            </p>

            <Link
              href="/"
              className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            >
              Browse Materials
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} No Stress Study. All rights reserved.
        </div>
      </footer>
    </main>
  );
}