import { PrismaClient } from '@prisma/client'

if (process.env.VERCEL) {
  console.log('Skipping seed on Vercel build to prevent PrismaClientInitializationError');
  process.exit(0);
}

const prisma = new PrismaClient()

async function main() {
  const now = Date.now();
  
  await prisma.order.upsert({
    where: { id: 'ORD-101' },
    update: {},
    create: {
      id: 'ORD-101',
      customerName: 'Priya Sharma',
      productName: 'Vitamin C Serum 30ml',
      price: 699,
      currency: 'INR',
      status: 'Out for Delivery',
      trackingCarrier: 'BlueDart',
      trackingNumber: 'BD-982103',
      expectedDelivery: 'today by 6 PM',
      orderedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.order.upsert({
    where: { id: 'ORD-102' },
    update: {},
    create: {
      id: 'ORD-102',
      customerName: 'Rahul Verma',
      productName: 'Hydrating Sunscreen SPF 50',
      price: 499,
      currency: 'INR',
      status: 'Delivered',
      trackingCarrier: 'Delhivery',
      trackingNumber: 'DL-441029',
      deliveredAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
      orderedAt: new Date(now - 17 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.order.upsert({
    where: { id: 'ORD-103' },
    update: {},
    create: {
      id: 'ORD-103',
      customerName: 'Ananya Patel',
      productName: 'Green Tea Face Wash + Toner',
      price: 850,
      currency: 'INR',
      status: 'Processing',
      orderedAt: new Date(now - 3 * 60 * 60 * 1000),
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
