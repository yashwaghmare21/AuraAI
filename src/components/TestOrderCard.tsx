'use client';
import { useState } from 'react';
import type { Order } from '@/lib/orders';
import { formatOrderDate } from '@/lib/formatDate';

export function TestOrderCard({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
    } catch (e) {
      console.warn('Clipboard write failed, but simulating copy for UI');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[var(--color-brand-border)] flex flex-col justify-between hover:shadow-md transition-shadow group h-full">
      
      <div>
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[17px] font-bold tracking-tight text-[var(--color-navy)] truncate">
              {order.id}
            </span>
            <span className="text-[10px] text-[var(--color-muted)] font-medium uppercase tracking-wider">Order ID</span>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
            order.status === 'Delivered' ? 'bg-[var(--color-brand-green-light)] text-[var(--color-brand-green)]' :
            order.status === 'Out for Delivery' ? 'bg-[var(--color-brand-orange-light)] text-[var(--color-brand-orange)] text-center max-w-[80px] leading-tight' :
            order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
            'bg-zinc-100 text-[var(--color-muted)]'
          }`}>
            {order.status}
          </span>
        </div>
        
        <div className="space-y-2.5 mb-5">
          <div className="flex justify-between items-baseline border-b border-[var(--color-brand-border)] pb-1.5">
            <span className="text-[11px] text-[var(--color-muted)] font-medium">Customer</span>
            <span className="text-xs font-semibold text-[var(--color-navy-dark)]">{order.customerName}</span>
          </div>
          <div className="flex justify-between items-start border-b border-[var(--color-brand-border)] pb-1.5 gap-3">
            <span className="text-[11px] text-[var(--color-muted)] font-medium shrink-0 pt-0.5">Product</span>
            <span className="text-xs font-semibold text-[var(--color-navy-dark)] text-right leading-tight">{order.productName}</span>
          </div>
          <div className="flex justify-between items-baseline border-b border-[var(--color-brand-border)] pb-1.5">
            <span className="text-[11px] text-[var(--color-muted)] font-medium">Price</span>
            <span className="text-xs font-semibold text-[var(--color-navy-dark)]">{order.price} {order.currency}</span>
          </div>
          
          <div className="pt-0.5 flex flex-col gap-1">
            {order.trackingCarrier && (
              <p className="text-[11px] text-[var(--color-muted)] flex justify-between">
                <span>Tracking</span>
                <span className="font-medium text-[var(--color-navy-dark)]">{order.trackingCarrier} ({order.trackingNumber})</span>
              </p>
            )}
            {order.expectedDelivery && (
              <p className="text-[11px] text-[var(--color-muted)] flex justify-between">
                <span>Expected</span>
                <span className="font-medium text-[var(--color-navy-dark)]">{order.expectedDelivery}</span>
              </p>
            )}
            {order.deliveredAt && (
              <p className="text-[11px] text-[var(--color-muted)] flex justify-between">
                <span>Delivered</span>
                <span className="font-medium text-[var(--color-brand-green)]" suppressHydrationWarning>{formatOrderDate(order.deliveredAt)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleCopy}
        className={`w-full py-2 rounded-lg font-bold text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-navy)] ${
          copied 
            ? 'bg-[var(--color-brand-green)] text-white' 
            : 'bg-[var(--color-soft-bg)] text-[var(--color-navy)] hover:bg-[var(--color-brand-border)] border border-[var(--color-brand-border)]'
        }`}
      >
        {copied ? '✓ Copied ID' : 'Copy Order ID'}
      </button>

    </div>
  );
}
