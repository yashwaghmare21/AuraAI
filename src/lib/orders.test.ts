import { describe, it, expect } from 'vitest';
import { normalizeOrderId } from './orders';
import { checkReturnEligibility, checkCancellationEligibility } from './eligibility';

describe('normalizeOrderId', () => {
  it('normalizes various formats', () => {
    expect(normalizeOrderId('ord 101')).toBe('ORD-101');
    expect(normalizeOrderId('ORD101')).toBe('ORD-101');
    expect(normalizeOrderId('ord-101')).toBe('ORD-101');
    expect(normalizeOrderId(' OrD  102 ')).toBe('ORD-102');
  });

  it('handles non-string inputs safely', () => {
    expect(normalizeOrderId(null)).toBe('');
    expect(normalizeOrderId(undefined)).toBe('');
    expect(normalizeOrderId({})).toBe('');
  });
});

describe('Eligibility', () => {
  it('ORD-102 return -> not eligible (past 7 days)', async () => {
    const result = await checkReturnEligibility('ORD-102');
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('7-day return window');
  });

  it('ORD-103 cancel -> eligible (Processing)', async () => {
    const result = await checkCancellationEligibility('ORD-103');
    expect(result.eligible).toBe(true);
  });

  it('ORD-101 cancel -> not eligible (Out for Delivery)', async () => {
    const result = await checkCancellationEligibility('ORD-101');
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('cannot be cancelled');
  });

  it('handles non-existent orders', async () => {
    const resultReturn = await checkReturnEligibility('ORD-999');
    expect(resultReturn.eligible).toBe(false);
    expect(resultReturn.reason).toBe('Order not found.');

    const resultCancel = await checkCancellationEligibility('ORD-999');
    expect(resultCancel.eligible).toBe(false);
    expect(resultCancel.reason).toBe('Order not found.');
  });

  it('handles returns for non-delivered items', async () => {
    // ORD-103 is Processing
    const result = await checkReturnEligibility('ORD-103');
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Only delivered items can be returned');
  });
});
