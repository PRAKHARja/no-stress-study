
"use client";

import { useRef, useState } from "react";

type BuyNowButtonProps = {
  productId: string;
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
  type: "error" | "warning" | "info";
  message: string;
};

export default function BuyNowButton({
  productId,
}: BuyNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const paymentFailed = useRef(false);
  const paymentSubmitted = useRef(false);
  const checkoutActive = useRef(false);

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
      const scriptLoaded = await loadRazorpayScript();

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

            window.location.href = "/account/purchases";
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

      razorpay.on("payment.failed", (response) => {
        paymentFailed.current = true;

        const description =
          response.error?.description ||
          "Your payment could not be completed.";

        setNotice({
          type: "error",
          message: `${description} If money was deducted, check your purchase status before retrying.`,
        });
      });

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

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Processing..." : "Buy Now"}
      </button>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : notice.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
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
    </div>
  );
}