import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/SiteHeader";
import BuyNowButton from "@/components/BuyNowButton";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: {
      slug,
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
        >
          ← Back to Study Materials
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex min-h-[400px] items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50">
              {product.thumbnailKey ? (
                <img
                  src={`/api/products/${product.slug}/thumbnail`}
                  alt={product.title}
                  className="h-full max-h-[600px] w-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <div className="text-7xl">
                    📚
                  </div>

                  <p className="mt-4 text-sm font-medium text-indigo-500">
                    Study Material
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div>
              <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600">
                {product.category.name}
              </span>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
                {product.title}
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                {product.description}
              </p>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-8">
              <p className="text-sm font-medium text-slate-500">
                Price
              </p>

              <p className="mt-1 text-4xl font-bold text-indigo-600">
                ₹{(product.price / 100).toFixed(0)}
              </p>
            </div>

            <div className="mt-8">
              <BuyNowButton
                productId={product.id}
              />

              <p className="mt-3 text-center text-sm text-slate-500">
                Secure digital access after purchase
              </p>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">
                What you'll get
              </h2>

              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  ✓ Instant digital access after payment
                </li>

                <li>
                  ✓ Secure study material
                </li>

                <li>
                  ✓ Access from your account
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}