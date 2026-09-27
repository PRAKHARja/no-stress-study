"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductActionsProps = {
  productId: string;
  productTitle: string;
};

export default function ProductActions({
  productId,
  productTitle,
}: ProductActionsProps) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${productTitle}"?\n\nThis will also remove its PDF and thumbnail from storage.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/admin/products/${productId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete product"
        );
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to delete product"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Link
        href={`/admin/products/${productId}/edit`}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Edit
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}