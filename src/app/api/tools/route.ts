import { NextRequest, NextResponse } from 'next/server';
import { checkReturnEligibility, checkCancellationEligibility, checkShippingPolicy, checkCODAvailability } from '@/lib/eligibility';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const orderId = searchParams.get('orderId');
  const amountStr = searchParams.get('amount');
  
  try {
    if (action === 'return') {
      if (!orderId) return NextResponse.json({ success: false, error: 'MISSING_ORDER_ID' }, { status: 400 });
      const res = await checkReturnEligibility(orderId);
      return NextResponse.json(res);
    } else if (action === 'cancel') {
      if (!orderId) return NextResponse.json({ success: false, error: 'MISSING_ORDER_ID' }, { status: 400 });
      const res = await checkCancellationEligibility(orderId);
      return NextResponse.json(res);
    } else if (action === 'shipping') {
      const amount = amountStr ? parseFloat(amountStr) : 0;
      const res = checkShippingPolicy(amount);
      return NextResponse.json(res);
    } else if (action === 'cod') {
      const amount = amountStr ? parseFloat(amountStr) : 0;
      const res = checkCODAvailability(amount);
      return NextResponse.json(res);
    }
    return NextResponse.json({ success: false, error: 'UNKNOWN_ACTION' }, { status: 400 });
  } catch (err: any) {
    console.error("Tools API Error:", err);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
