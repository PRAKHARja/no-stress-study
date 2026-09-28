"use client";

import { FormEvent, useEffect, useState } from "react";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minimumAmount: number | null;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

type CouponForm = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minimumAmount: string;
  maximumDiscount: string;
  usageLimit: string;
  expiresAt: string;
};

const emptyForm: CouponForm = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minimumAmount: "",
  maximumDiscount: "",
  usageLimit: "",
  expiresAt: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadCoupons() {
    try {
      setError("");

      const response = await fetch("/api/admin/coupons", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load coupons.");
      }

      setCoupons(data.coupons || []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load coupons."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  function updateForm(
    field: keyof CouponForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]:
        field === "code"
          ? value.toUpperCase()
          : value,
    }));
  }

  async function handleCreateCoupon(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setCreating(true);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          minimumAmount: form.minimumAmount,
          maximumDiscount:
            form.discountType === "PERCENTAGE"
              ? form.maximumDiscount
              : "",
          usageLimit: form.usageLimit,
          expiresAt: form.expiresAt
            ? new Date(form.expiresAt).toISOString()
            : "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to create coupon."
        );
      }

      setMessage("Coupon created successfully.");
      setForm(emptyForm);

      await loadCoupons();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create coupon."
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleCoupon(coupon: Coupon) {
    setError("");
    setMessage("");
    setActionId(coupon.id);

    try {
      const response = await fetch(
        `/api/admin/coupons/${coupon.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !coupon.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update coupon."
        );
      }

      setMessage(data.message);
      await loadCoupons();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update coupon."
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteCoupon(coupon: Coupon) {
    if (coupon.usedCount > 0) {
      setError(
        "Used coupons cannot be deleted. Deactivate them instead."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete coupon "${coupon.code}"?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setActionId(coupon.id);

    try {
      const response = await fetch(
        `/api/admin/coupons/${coupon.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to delete coupon."
        );
      }

      setMessage(data.message);
      await loadCoupons();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete coupon."
      );
    } finally {
      setActionId(null);
    }
  }

  function formatDiscount(coupon: Coupon) {
    if (coupon.discountType === "PERCENTAGE") {
      if (coupon.maximumDiscount !== null) {
        return `${coupon.discountValue}% (max ₹${coupon.maximumDiscount})`;
      }

      return `${coupon.discountValue}%`;
    }

    return `₹${coupon.discountValue}`;
  }

  function formatMinimumAmount(
    minimumAmount: number | null
  ) {
    if (minimumAmount === null) {
      return "None";
    }

    return `₹${minimumAmount}`;
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) {
      return "No expiry";
    }

    return new Date(expiresAt).toLocaleString();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Coupons
          </h1>

          <p className="mt-2 text-slate-500">
            Create and manage discount coupons for your
            customers.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Create Coupon
            </h2>

            <form
              onSubmit={handleCreateCoupon}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Coupon Code
                </label>

                <input
                  type="text"
                  value={form.code}
                  onChange={(event) =>
                    updateForm("code", event.target.value)
                  }
                  placeholder="WELCOME10"
                  maxLength={30}
                  required
                  disabled={creating}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold uppercase text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:font-normal focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                />

                <p className="mt-1 text-xs text-slate-500">
                  3-30 characters. Letters, numbers, - and _
                  only.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Discount Type
                </label>

                <select
                  value={form.discountType}
                  onChange={(event) =>
                    updateForm(
                      "discountType",
                      event.target.value
                    )
                  }
                  disabled={creating}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                >
                  <option value="PERCENTAGE">
                    Percentage
                  </option>
                  <option value="FIXED">
                    Fixed Amount
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Discount Value
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={
                      form.discountType === "PERCENTAGE"
                        ? "100"
                        : undefined
                    }
                    value={form.discountValue}
                    onChange={(event) =>
                      updateForm(
                        "discountValue",
                        event.target.value
                      )
                    }
                    placeholder={
                      form.discountType === "PERCENTAGE"
                        ? "10"
                        : "50"
                    }
                    required
                    disabled={creating}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    {form.discountType === "PERCENTAGE"
                      ? "%"
                      : "₹"}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Minimum Order Amount
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.minimumAmount}
                  onChange={(event) =>
                    updateForm(
                      "minimumAmount",
                      event.target.value
                    )
                  }
                  placeholder="100"
                  disabled={creating}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                />
              </div>

              {form.discountType === "PERCENTAGE" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Maximum Discount
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.maximumDiscount}
                    onChange={(event) =>
                      updateForm(
                        "maximumDiscount",
                        event.target.value
                      )
                    }
                    placeholder="100"
                    disabled={creating}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Caps the discount for percentage coupons.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Usage Limit
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.usageLimit}
                  onChange={(event) =>
                    updateForm(
                      "usageLimit",
                      event.target.value
                    )
                  }
                  placeholder="100"
                  disabled={creating}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Expiry Date
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) =>
                    updateForm(
                      "expiresAt",
                      event.target.value
                    )
                  }
                  disabled={creating}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Coupon"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Your Coupons
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {coupons.length}{" "}
                    {coupons.length === 1
                      ? "coupon"
                      : "coupons"}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">
                Loading coupons...
              </div>
            ) : coupons.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl">🎟️</div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  No coupons yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first coupon using the form.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 font-mono font-bold text-indigo-700">
                            {coupon.code}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              coupon.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {coupon.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          <div>
                            <span className="font-medium text-slate-900">
                              Discount:
                            </span>{" "}
                            {formatDiscount(coupon)}
                          </div>

                          <div>
                            <span className="font-medium text-slate-900">
                              Minimum:
                            </span>{" "}
                            {formatMinimumAmount(
                              coupon.minimumAmount
                            )}
                          </div>

                          <div>
                            <span className="font-medium text-slate-900">
                              Usage:
                            </span>{" "}
                            {coupon.usedCount}
                            {coupon.usageLimit !== null
                              ? ` / ${coupon.usageLimit}`
                              : " / Unlimited"}
                          </div>

                          <div>
                            <span className="font-medium text-slate-900">
                              Expires:
                            </span>{" "}
                            {formatExpiry(
                              coupon.expiresAt
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            toggleCoupon(coupon)
                          }
                          disabled={
                            actionId === coupon.id
                          }
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionId === coupon.id
                            ? "..."
                            : coupon.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteCoupon(coupon)
                          }
                          disabled={
                            actionId === coupon.id ||
                            coupon.usedCount > 0
                          }
                          title={
                            coupon.usedCount > 0
                              ? "Used coupons cannot be deleted"
                              : "Delete coupon"
                          }
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}