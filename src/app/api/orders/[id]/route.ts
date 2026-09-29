import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/orders';
import { checkCancellationEligibility, checkReturnEligibility, checkShippingPolicy } from '@/lib/eligibility';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json({ 
        found: false, 
        error: 'ORDER_NOT_FOUND',
        message: `Order ${id} could not be found. Please verify the order ID.`
      }, { status: 404 });
    }

    const [cancellation, returnEligibility] = await Promise.all([
      checkCancellationEligibility(order.id),
      checkReturnEligibility(order.id)
    ]);

    const shipping = checkShippingPolicy(order.price);

    return NextResponse.json({
      found: true,
      order: {
        id: order.id,
        customerName: order.customerName,
        productName: order.productName,
        price: order.price,
        currency: order.currency,
        status: order.status,
        trackingCarrier: order.trackingCarrier,
        trackingNumber: order.trackingNumber,
        expectedDelivery: order.expectedDelivery,
        deliveredAt: order.deliveredAt,
        orderedAt: order.orderedAt,
      },
      policyStatus: {
        cancellationEligible: cancellation.eligible,
        cancellationReason: cancellation.reason,
        returnEligible: returnEligibility.eligible,
        returnReason: returnEligibility.reason,
        shippingFee: shipping.shippingFee,
        isFreeDelivery: shipping.isFreeDelivery,
        deliveryEstimate: shipping.deliveryTime,
      }
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ 
      found: false, 
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve order details due to an internal error.'
    }, { status: 500 });
  }
}
