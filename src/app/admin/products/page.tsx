import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import ProductActions from "./ProductActions";

export default async function AdminProductsPage() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/login");
  }

  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Products
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your study materials.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          + Add Product
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        {products.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No products yet
            </h2>

            <p className="mt-2 text-slate-500">
              Start by adding your first study material.
            </p>

            <Link
              href="/admin/products/new"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
            >
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Product
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Category
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Price
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Created
                  </th>

                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {product.thumbnailKey ? (
                          <img
                            src={`/api/products/${product.slug}/thumbnail`}
                            alt={product.title}
                            className="h-14 w-20 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-slate-100 text-xl">
                            📚
                          </div>
                        )}

                        <div>
                          <div className="font-medium text-slate-900">
                            {product.title}
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            /products/{product.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {product.category.name}
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {product.price === 0 ? (
                        <span className="font-bold text-green-600">
                          FREE
                        </span>
                      ) : (
                        <span className="text-slate-900">
                          ₹{(product.price / 100).toFixed(2)}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {product.createdAt.toLocaleDateString(
                        "en-IN"
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <ProductActions
                        productId={product.id}
                        productTitle={product.title}
                      />
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