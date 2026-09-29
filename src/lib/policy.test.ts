import { describe, it, expect } from 'vitest';
import { 
  checkShippingPolicy, 
  checkCancellationEligibility, 
  checkReturnEligibility, 
  checkCODAvailability 
} from './eligibility';
import { normalizeOrderId, getOrder } from './orders';

describe('Policy & Service Logic Tests', () => {
  
  describe('Shipping Policy (Phase 11)', () => {
    it('orders above ₹499 qualify for FREE delivery', () => {
      const res = checkShippingPolicy(699);
      expect(res.isFreeDelivery).toBe(true);
      expect(res.shippingFee).toBe(0);
      expect(res.deliveryTime).toBe('3–5 business days');
    });

    it('orders below ₹499 have a ₹50 shipping fee', () => {
      const res = checkShippingPolicy(350);
      expect(res.isFreeDelivery).toBe(false);
      expect(res.shippingFee).toBe(50);
      expect(res.deliveryTime).toBe('3–5 business days');
    });

    it('orders exactly ₹499 qualify for FREE delivery', () => {
      const res = checkShippingPolicy(499);
      expect(res.isFreeDelivery).toBe(true);
      expect(res.shippingFee).toBe(0);
    });
  });

  describe('Cancellation Policy (Phase 13, 21, 22)', () => {
    it('allows cancellation ONLY when status is Processing (ORD-103)', async () => {
      const res = await checkCancellationEligibility('ORD-103');
      expect(res.eligible).toBe(true);
      expect(res.reason).toContain('can be cancelled');
    });

    it('denies cancellation when status is Out for Delivery (ORD-101) and advises refusing at door', async () => {
      const res = await checkCancellationEligibility('ORD-101');
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('refuse delivery at the doorstep');
    });

    it('denies cancellation when status is Delivered (ORD-102)', async () => {
      const res = await checkCancellationEligibility('ORD-102');
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('Delivered');
    });

    it('handles non-existent order cancellation gracefully', async () => {
      const res = await checkCancellationEligibility('ORD-999');
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('Order not found.');
    });
  });

  describe('Return Policy (Phase 12, 21)', () => {
    it('denies returns outside 7-day window (ORD-102 delivered 14 days ago)', async () => {
      const res = await checkReturnEligibility('ORD-102');
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('7-day return window');
    });

    it('denies returns when item is opened', async () => {
      // Even if within window, opened item is denied
      const res = await checkReturnEligibility('ORD-102', { isOpened: true });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('unopened, unused');
    });

    it('denies returns for non-delivered orders (ORD-101, ORD-103)', async () => {
      const res101 = await checkReturnEligibility('ORD-101');
      expect(res101.eligible).toBe(false);
      expect(res101.reason).toContain('Only delivered items can be returned');

      const res103 = await checkReturnEligibility('ORD-103');
      expect(res103.eligible).toBe(false);
      expect(res103.reason).toContain('Only delivered items can be returned');
    });

    it('handles damaged/defective reporting within 48 hours requiring photos', async () => {
      const resWithin48 = await checkReturnEligibility('ORD-102', { isDamaged: true, hoursSinceDelivery: 24 });
      expect(resWithin48.eligible).toBe(true);
      expect(resWithin48.reason).toContain('photos for replacement');

      const resPast48 = await checkReturnEligibility('ORD-102', { isDamaged: true, hoursSinceDelivery: 72 });
      expect(resPast48.eligible).toBe(false);
      expect(resPast48.reason).toContain('within 48 hours of delivery');
    });
  });

  describe('Cash on Delivery (COD) Policy (Phase 14)', () => {
    it('is available for orders up to ₹2,500 via cash or UPI', () => {
      const res = checkCODAvailability(1500);
      expect(res.available).toBe(true);
      expect(res.limit).toBe(2500);
      expect(res.acceptedPayments).toContain('Cash');
      expect(res.acceptedPayments).toContain('UPI at doorstep');
    });

    it('is NOT available for orders exceeding ₹2,500', () => {
      const res = checkCODAvailability(3000);
      expect(res.available).toBe(false);
      expect(res.reason).toContain('up to ₹2500');
    });
  });

  describe('Order Lookup & ID Normalization (Phase 17, 18, 19, 20)', () => {
    it('normalizes various spoken order ID formats', () => {
      expect(normalizeOrderId('ORD-101')).toBe('ORD-101');
      expect(normalizeOrderId('ord 101')).toBe('ORD-101');
      expect(normalizeOrderId('ORD101')).toBe('ORD-101');
      expect(normalizeOrderId('101')).toBe('ORD-101');
      expect(normalizeOrderId('102')).toBe('ORD-102');
      expect(normalizeOrderId('103')).toBe('ORD-103');
    });

    it('handles empty or invalid order IDs safely', () => {
      expect(normalizeOrderId('')).toBe('');
      expect(normalizeOrderId(null)).toBe('');
      expect(normalizeOrderId(undefined)).toBe('');
    });

    it('retrieves fixture ORD-101 with exact values', async () => {
      const order = await getOrder('ORD-101');
      expect(order).not.toBeNull();
      expect(order?.customerName).toBe('Priya Sharma');
      expect(order?.productName).toBe('Vitamin C Serum 30ml');
      expect(order?.price).toBe(699);
      expect(order?.status).toBe('Out for Delivery');
      expect(order?.trackingCarrier).toBe('BlueDart');
      expect(order?.trackingNumber).toBe('BD-982103');
    });

    it('retrieves fixture ORD-102 with exact values', async () => {
      const order = await getOrder('ORD-102');
      expect(order).not.toBeNull();
      expect(order?.customerName).toBe('Rahul Verma');
      expect(order?.productName).toBe('Hydrating Sunscreen SPF 50');
      expect(order?.price).toBe(499);
      expect(order?.status).toBe('Delivered');
      expect(order?.trackingCarrier).toBe('Delhivery');
    });

    it('retrieves fixture ORD-103 with exact values', async () => {
      const order = await getOrder('ORD-103');
      expect(order).not.toBeNull();
      expect(order?.customerName).toBe('Ananya Patel');
      expect(order?.productName).toBe('Green Tea Face Wash + Toner');
      expect(order?.price).toBe(850);
      expect(order?.status).toBe('Processing');
    });

    it('returns null for unknown order IDs (ORD-999)', async () => {
      const order = await getOrder('ORD-999');
      expect(order).toBeNull();
    });
  });

});
