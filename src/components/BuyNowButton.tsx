"use client";

import { useRef, useState } from "react";

type BuyNowButtonProps = {
  productId: string;
  productPrice: number;
};

type PaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type PaymentFailure = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
};

type RazorpayCheckout = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (response: PaymentFailure) => void
  ) => void;
};

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      handler: (response: PaymentResponse) => void;
      theme?: {
        color?: string;
      };
      modal?: {
        ondismiss?: () => void;
      };
    }) => RazorpayCheckout;
  }
}

type Notice = {
  type: "error" | "warning" | "info" | "success";
  message: string;
};

type CouponState = {
  code: string;
  discountAmount: number;
  finalAmount: number;
};

export default function BuyNowButton({
  productId,
  productPrice,
}: BuyNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState | null>(
    null
  );

  const [notice, setNotice] = useState<Notice | null>(null);

  const paymentFailed = useRef(false);
  const paymentSubmitted = useRef(false);
  const checkoutActive = useRef(false);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setNotice({
        type: "error",
        message: "Please enter a coupon code.",
      });
      return;
    }

    setCouponLoading(true);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/coupons/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setCoupon(null);

        setNotice({
          type: "error",
          message: data.error || "Invalid coupon code.",
        });

        return;
      }

      setCoupon({
        code: data.coupon.code,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
      });

      setNotice({
        type: "success",
        message: `Coupon ${data.coupon.code} applied successfully.`,
      });
    } catch (error) {
      console.error("Coupon validation error:", error);

      setCoupon(null);

      setNotice({
        type: "error",
        message:
          "Unable to validate the coupon. Please try again.",
      });
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setNotice(null);
  }

  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(true),
          { once: true }
        );

        existingScript.addEventListener(
          "error",
          () => resolve(false),
          { once: true }
        );

        if (window.Razorpay) {
          resolve(true);
        }

        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  }

  async function handleBuyNow() {
    if (checkoutActive.current) {
      return;
    }

    checkoutActive.current = true;
    paymentFailed.current = false;
    paymentSubmitted.current = false;

    setLoading(true);
    setNotice(null);

    try {
      const scriptLoaded =
        await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error(
          "Unable to load the payment window. Please check your connection."
        );
      }

      const response = await fetch(
        "/api/payments/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            couponCode: coupon?.code || "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start payment."
        );
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "No Stress Study",
        description: data.product.title,
        order_id: data.razorpayOrderId,

        handler: async (paymentResponse) => {
          paymentSubmitted.current = true;

          setLoading(true);

          setNotice({
            type: "info",
            message:
              "Payment received by checkout. Verifying your purchase...",
          });

          try {
            const verifyResponse = await fetch(
              "/api/payments/verify",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpay_order_id:
                    paymentResponse.razorpay_order_id,
                  razorpay_payment_id:
                    paymentResponse.razorpay_payment_id,
                  razorpay_signature:
                    paymentResponse.razorpay_signature,
                }),
              }
            );

            const verifyData =
              await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.error ||
                  "Payment verification is pending."
              );
            }

            window.location.href =
              "/account/purchases";
          } catch (error) {
            console.error(
              "Payment verification error:",
              error
            );

            setNotice({
              type: "warning",
              message:
                "We couldn't confirm your purchase yet. If money was deducted, do not pay again. Check My Purchases or contact support with your payment details.",
            });

            checkoutActive.current = false;
            setLoading(false);
          }
        },

        theme: {
          color: "#4f46e5",
        },

        modal: {
          ondismiss: () => {
            if (paymentSubmitted.current) {
              return;
            }

            checkoutActive.current = false;
            setLoading(false);

            if (!paymentFailed.current) {
              setNotice({
                type: "info",
                message:
                  "Checkout was closed. If you completed a payment, check My Purchases before trying again.",
              });
            }
          },
        },
      });

      razorpay.on(
        "payment.failed",
        (response) => {
          paymentFailed.current = true;

          const description =
            response.error?.description ||
            "Your payment could not be completed.";

          setNotice({
            type: "error",
            message: `${description} If money was deducted, check your purchase status before retrying.`,
          });
        }
      );

      razorpay.open();
    } catch (error) {
      console.error("Checkout error:", error);

      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while starting checkout.",
      });

      checkoutActive.current = false;
      setLoading(false);
    }
  }

  const displayedAmount =
    coupon?.finalAmount ?? productPrice;

  return (
    <div className="w-full">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label
          htmlFor="coupon-code"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Have a coupon code?
        </label>

        <div className="flex gap-2">
          <input
            id="coupon-code"
            type="text"
            value={couponInput}
            onChange={(event) =>
              setCouponInput(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyCoupon();
              }
            }}
            placeholder="Enter coupon code"
            disabled={
              loading ||
              couponLoading ||
              Boolean(coupon)
            }
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
          />

          {coupon ? (
            <button
              type="button"
              onClick={removeCoupon}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={applyCoupon}
              disabled={
                loading ||
                couponLoading ||
                !couponInput.trim()
              }
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {couponLoading ? "Checking..." : "Apply"}
            </button>
          )}
        </div>

        {coupon && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Original price</span>
              <span>
                ₹{(productPrice / 100).toFixed(0)}
              </span>
            </div>

            <div className="flex justify-between font-medium text-green-600">
              <span>Discount</span>
              <span>
                -₹
                {(coupon.discountAmount / 100).toFixed(0)}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2">
              <div className="flex justify-between text-lg font-bold text-slate-900">
                <span>Total</span>
                <span>
                  ₹{(displayedAmount / 100).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : notice.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : notice.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-indigo-200 bg-indigo-50 text-indigo-800"
          }`}
        >
          {notice.message}

          {notice.type === "warning" && (
            <a
              href="/account/purchases"
              className="mt-3 block font-semibold underline underline-offset-2"
            >
              Check My Purchases
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleBuyNow}
        disabled={loading || couponLoading}
        className="mt-4 w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Processing..."
          : coupon
            ? `Buy Now — ₹${(
                displayedAmount / 100
              ).toFixed(0)}`
            : `Buy Now — ₹${(
                productPrice / 100
              ).toFixed(0)}`}
      </button>

      <p className="mt-3 text-center text-sm text-slate-500">
        Secure digital access after purchase
      </p>
    </div>
  );
}