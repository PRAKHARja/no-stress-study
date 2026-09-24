import { prisma } from "@/lib/prisma";

export default async function Home() {
  const categoryCount = await prisma.category.count();

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-4xl font-bold">
        No Stress Study
      </h1>

      <p className="mt-4">
        Database connection successful.
      </p>

      <p className="mt-2">
        Categories: {categoryCount}
      </p>
    </main>
  );
}