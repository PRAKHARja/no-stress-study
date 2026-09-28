import { prisma } from "@/lib/prisma";

export type CouponCalculation = {
  couponId: string;
  code: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export type CouponValidationResult =
  | {
      valid: true;
      calculation: CouponCalculation;
    }
  | {
      valid: false;
      error: string;
    };

export async function calculateCouponDiscount(
  productId: string,
  couponCode: string
): Promise<CouponValidationResult> {
  const normalizedCode = couponCode.trim().toUpperCase();

  if (!normalizedCode) {
    return {
      valid: false,
      error: "Coupon code is required.",
    };
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      price: true,
    },
  });

  if (!product) {
    return {
      valid: false,
      error: "Product not found.",
    };
  }

  const coupon = await prisma.coupon.findUnique({
    where: {
      code: normalizedCode,
    },
  });

  if (!coupon) {
    return {
      valid: false,
      error: "Invalid coupon code.",
    };
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      error: "This coupon is no longer active.",
    };
  }

  if (
    coupon.expiresAt &&
    coupon.expiresAt.getTime() <= Date.now()
  ) {
    return {
      valid: false,
      error: "This coupon has expired.",
    };
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return {
      valid: false,
      error: "This coupon has reached its usage limit.",
    };
  }

  // Product prices are stored in paise.
  // Coupon minimumAmount and discountValue are stored in rupees.
  const productAmountInRupees = Math.floor(product.price / 100);

  if (
    coupon.minimumAmount !== null &&
    productAmountInRupees < coupon.minimumAmount
  ) {
    return {
      valid: false,
      error: `This coupon requires a minimum purchase of ₹${coupon.minimumAmount}.`,
    };
  }

  let discountAmountInPaise = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discountAmountInPaise = Math.floor(
      (product.price * coupon.discountValue) / 100
    );

    if (coupon.maximumDiscount !== null) {
      const maximumDiscountInPaise =
        coupon.maximumDiscount * 100;

      discountAmountInPaise = Math.min(
        discountAmountInPaise,
        maximumDiscountInPaise
      );
    }
  } else {
    discountAmountInPaise = coupon.discountValue * 100;
  }

  // Never allow a coupon to reduce the price below zero.
  discountAmountInPaise = Math.min(
    discountAmountInPaise,
    product.price
  );

  const finalAmount = product.price - discountAmountInPaise;

  if (finalAmount <= 0) {
    return {
      valid: false,
      error:
        "This coupon cannot be applied because the final amount must be greater than ₹0.",
    };
  }

  return {
    valid: true,
    calculation: {
      couponId: coupon.id,
      code: coupon.code,
      originalAmount: product.price,
      discountAmount: discountAmountInPaise,
      finalAmount,
    },
  };
}