import { prisma } from './prisma';

export interface Order {
  id: string;
  customerName: string;
  productName: string;
  price: number;
  currency: string;
  status: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  expectedDelivery?: string | null;
  deliveredAt?: Date | null;
  orderedAt: Date;
}

export function normalizeOrderId(id: string | number | null | undefined | unknown): string {
  if (typeof id !== 'string') {
    if (typeof id === 'number') id = String(id);
    else return '';
  }
  const cleaned = (id as string).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('ORD')) {
    const numPart = cleaned.substring(3);
    if (numPart) {
      return `ORD-${numPart}`;
    }
  } else if (/^\d+$/.test(cleaned)) {
    return `ORD-${cleaned}`;
  }
  return cleaned;
}

export async function getOrder(id: string): Promise<Order | null> {
  const normalized = normalizeOrderId(id);
  if (!normalized) return null;
  
  return await prisma.order.findUnique({
    where: { id: normalized }
  });
}

export async function getAllOrders(): Promise<Order[]> {
  return await prisma.order.findMany({
    orderBy: { orderedAt: 'desc' }
  });
}
