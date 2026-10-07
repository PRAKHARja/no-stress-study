"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClaimFreeButtonProps = {
  productSlug: string;
};

type Notice = {
  type: "error" | "success";
  message: string;
};

export default function ClaimFreeButton({
  productSlug,
}: ClaimFreeButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] =
    useState<Notice | null>(null);

  async function handleClaim() {
    if (loading) {
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/products/${productSlug}/claim`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setNotice({
          type: "error",
          message:
            data.error ||
            "Unable to claim this product.",
        });

        return;
      }

      setNotice({
        type: "success",
        message:
          data.message ||
          "Product claimed successfully.",
      });

      /*
       * Re-run the server component.
       * The product page will now detect the new Purchase
       * and show "View Study Material".
       */
      router.refresh();
    } catch (error) {
      console.error(
        "Free product claim error:",
        error
      );

      setNotice({
        type: "error",
        message:
          "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClaim}
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Claiming..."
          : "Get for Free"}
      </button>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {notice.message}

          {notice.type === "error" &&
            notice.message
              .toLowerCase()
              .includes("logged in") && (
              <a
                href="/login"
                className="mt-3 block font-semibold underline underline-offset-2"
              >
                Login
              </a>
            )}
        </div>
      )}
    </div>
  );
}