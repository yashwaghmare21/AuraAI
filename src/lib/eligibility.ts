import { getOrder } from './orders';

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
}

export interface ShippingPolicyResult {
  shippingFee: number;
  isFreeDelivery: boolean;
  deliveryTime: string;
  description: string;
}

export interface CODAvailabilityResult {
  available: boolean;
  limit: number;
  acceptedPayments: string[];
  reason: string;
}

/**
 * Shipping Policy:
 * Orders above ₹499: FREE delivery.
 * Orders below ₹499: ₹50 shipping fee.
 * Standard delivery: 3–5 business days.
 */
export function checkShippingPolicy(orderValue: number): ShippingPolicyResult {
  if (orderValue >= 499) {
    return {
      shippingFee: 0,
      isFreeDelivery: true,
      deliveryTime: '3–5 business days',
      description: 'Orders of ₹499 or more qualify for FREE delivery. Standard delivery takes 3–5 business days.'
    };
  }
  return {
    shippingFee: 50,
    isFreeDelivery: false,
    deliveryTime: '3–5 business days',
    description: 'Orders below ₹499 have a ₹50 shipping fee. Standard delivery takes 3–5 business days.'
  };
}

/**
 * Return Policy:
 * Returns: within 7 days of delivery AND unopened, unused, original packaging.
 * ALL required conditions must be satisfied.
 * Damaged/defective: must be reported within 48 hours of delivery with photos for replacement.
 */
export async function checkReturnEligibility(
  orderId: string, 
  options?: { isOpened?: boolean; isDamaged?: boolean; hoursSinceDelivery?: number }
): Promise<EligibilityResult> {
  const order = await getOrder(orderId);
  if (!order) {
    return { eligible: false, reason: 'Order not found.' };
  }

  if (order.status !== 'Delivered') {
    return { eligible: false, reason: `Order is currently in '${order.status}' status. Only delivered items can be returned.` };
  }

  if (!order.deliveredAt) {
    return { eligible: false, reason: 'Delivery date not found.' };
  }

  const deliveryDate = new Date(order.deliveredAt);
  const now = new Date();
  
  if (deliveryDate > now) {
    return { eligible: false, reason: 'Invalid delivery date (in the future).' };
  }

  // Calculate calendar days difference
  const deliveryDay = Date.UTC(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
  const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((currentDay - deliveryDay) / (1000 * 60 * 60 * 24));

  if (options?.isDamaged) {
    const hours = options.hoursSinceDelivery ?? (diffDays * 24);
    if (hours > 48) {
      return { 
        eligible: false, 
        reason: 'Damaged or defective items must be reported within 48 hours of delivery with photos for replacement.' 
      };
    }
    return { 
      eligible: true, 
      reason: 'Damaged/defective report is within 48 hours. Customer must provide photos for replacement.' 
    };
  }

  if (options?.isOpened) {
    return {
      eligible: false,
      reason: 'Items must be unopened, unused, and in their original packaging to be eligible for return.'
    };
  }

  if (diffDays > 7) {
    return { 
      eligible: false, 
      reason: `The 7-day return window has expired (delivered ${diffDays} days ago).` 
    };
  }

  return { 
    eligible: true, 
    reason: 'Order is within the 7-day return window. Item must be unopened, unused, and in original packaging.' 
  };
}

/**
 * Cancellation Policy:
 * Cancellation is allowed ONLY when status = Processing.
 * If Shipped or Out for Delivery, cancellation is NOT allowed.
 * Customer may refuse delivery at the doorstep.
 */
export async function checkCancellationEligibility(orderId: string): Promise<EligibilityResult> {
  const order = await getOrder(orderId);
  if (!order) {
    return { eligible: false, reason: 'Order not found.' };
  }

  if (order.status === 'Processing') {
    return { eligible: true, reason: 'Order is still processing and can be cancelled.' };
  }

  if (order.status === 'Out for Delivery' || order.status === 'Shipped') {
    return { 
      eligible: false, 
      reason: `Order cannot be cancelled because it is '${order.status}'. You may refuse delivery at the doorstep when the courier arrives.` 
    };
  }

  return { eligible: false, reason: `Order cannot be cancelled because it is in '${order.status}' status.` };
}

/**
 * Cash on Delivery (COD) Policy:
 * Available for orders up to ₹2,500.
 * Payment: cash or UPI at doorstep.
 */
export function checkCODAvailability(orderValue: number): CODAvailabilityResult {
  const limit = 2500;
  if (orderValue <= limit) {
    return {
      available: true,
      limit,
      acceptedPayments: ['Cash', 'UPI at doorstep'],
      reason: `Cash on Delivery is available for this order (up to ₹${limit}). Payment can be made via Cash or UPI at doorstep.`
    };
  }
  return {
    available: false,
    limit,
    acceptedPayments: ['Online Payment'],
    reason: `Cash on Delivery is only available for orders up to ₹${limit}. Orders exceeding ₹${limit} require online prepayment.`
  };
}
