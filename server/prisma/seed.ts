import { Prisma, PrismaClient, type OrderStatus, type PartnerStatus, type Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type SeedItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  stock: number;
};

const items: SeedItem[] = [
  // Snacks
  { id: 'item-parle-g', name: 'Parle-G Biscuits', description: 'Classic glucose biscuits, 80 g pack', category: 'Snacks', price: '10.00', stock: 200 },
  { id: 'item-lays-classic', name: "Lay's Classic Salted", description: 'Potato chips, 52 g pack', category: 'Snacks', price: '20.00', stock: 120 },
  { id: 'item-kurkure', name: 'Kurkure Masala Munch', description: 'Crunchy masala snack, 90 g pack', category: 'Snacks', price: '20.00', stock: 100 },
  { id: 'item-hide-seek', name: 'Hide & Seek', description: 'Chocolate chip cookies, 100 g pack', category: 'Snacks', price: '30.00', stock: 80 },
  { id: 'item-haldiram-bhujia', name: "Haldiram's Aloo Bhujia", description: 'Spicy namkeen, 150 g pack', category: 'Snacks', price: '45.00', stock: 60 },
  { id: 'item-dark-fantasy', name: 'Dark Fantasy Choco Fills', description: 'Choco-filled cookies, 75 g pack', category: 'Snacks', price: '40.00', stock: 0 },

  // Beverages
  { id: 'item-amul-kool', name: 'Amul Kool', description: 'Flavoured milk, 200 ml bottle', category: 'Beverages', price: '30.00', stock: 90 },
  { id: 'item-cold-coffee', name: 'Cold Coffee', description: 'Freshly made cold coffee from the canteen, 300 ml', category: 'Beverages', price: '50.00', stock: 40 },
  { id: 'item-masala-chai', name: 'Masala Chai', description: 'Hot masala tea, 150 ml cup', category: 'Beverages', price: '15.00', stock: 150 },
  { id: 'item-frooti', name: 'Frooti', description: 'Mango drink, 200 ml pack', category: 'Beverages', price: '20.00', stock: 100 },
  { id: 'item-bisleri', name: 'Bisleri Water', description: 'Packaged drinking water, 1 L bottle', category: 'Beverages', price: '20.00', stock: 250 },
  { id: 'item-red-bull', name: 'Red Bull', description: 'Energy drink, 250 ml can', category: 'Beverages', price: '125.00', stock: 30 },

  // Stationery
  { id: 'item-a4-register', name: 'A4 Register', description: '200-page ruled register', category: 'Stationery', price: '60.00', stock: 70 },
  { id: 'item-classmate-notebook', name: 'Classmate Notebook', description: '172-page single-line notebook', category: 'Stationery', price: '45.00', stock: 90 },
  { id: 'item-reynolds-pens', name: 'Reynolds Pens (Pack of 5)', description: 'Blue ballpoint pens', category: 'Stationery', price: '50.00', stock: 60 },
  { id: 'item-engg-drawing-kit', name: 'Engineering Drawing Kit', description: 'Mini drafter, compass, set squares and scale', category: 'Stationery', price: '350.00', stock: 3 },
  { id: 'item-casio-fx991', name: 'Casio fx-991ES Plus', description: 'Scientific calculator', category: 'Stationery', price: '1095.00', stock: 4 },

  // Essentials
  { id: 'item-colgate', name: 'Colgate Toothpaste', description: 'Strong teeth toothpaste, 100 g', category: 'Essentials', price: '55.00', stock: 50 },
  { id: 'item-dettol-soap', name: 'Dettol Soap', description: 'Antiseptic bathing soap, 75 g', category: 'Essentials', price: '40.00', stock: 60 },
  { id: 'item-surf-excel', name: 'Surf Excel Detergent', description: 'Washing powder, 500 g', category: 'Essentials', price: '75.00', stock: 40 },
  { id: 'item-good-knight', name: 'Good Knight Refill', description: 'Mosquito repellent liquid refill', category: 'Essentials', price: '85.00', stock: 35 },
  { id: 'item-paracetamol', name: 'Paracetamol 500 mg', description: 'Strip of 10 tablets', category: 'Essentials', price: '25.00', stock: 45 },

  // Food
  { id: 'item-maggi', name: 'Maggi Noodles', description: '2-minute masala noodles, 70 g', category: 'Food', price: '15.00', stock: 150 },
  { id: 'item-veg-sandwich', name: 'Veg Grilled Sandwich', description: 'Grilled sandwich from the canteen', category: 'Food', price: '40.00', stock: 30 },
  { id: 'item-aloo-paratha', name: 'Aloo Paratha (2 pcs)', description: 'With curd and pickle', category: 'Food', price: '60.00', stock: 25 },
  { id: 'item-paneer-roll', name: 'Paneer Tikka Roll', description: 'Spicy paneer wrap', category: 'Food', price: '80.00', stock: 20 },
  { id: 'item-veg-thali', name: 'Veg Thali', description: 'Dal, sabzi, rice, 4 rotis and salad', category: 'Food', price: '120.00', stock: 15 },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Copy server/.env.example to server/.env first.`);
  return value;
}

type SeedUser = {
  name: string;
  email: string;
  enrollmentNo: string;
  phone: string;
  bhawan: string;
  role: Role;
  partnerStatus?: PartnerStatus;
  passwordEnv: string;
};

const users: SeedUser[] = [
  { name: 'Aarav Gupta', email: 'test@iitr.ac.in', enrollmentNo: '21110001', phone: '9876543210', bhawan: 'Rajendra', role: 'STUDENT', passwordEnv: 'SEED_TEST_PASSWORD' },
  { name: 'Riya Sharma', email: 'riya@iitr.ac.in', enrollmentNo: '22115042', phone: '9123456780', bhawan: 'Sarojini', role: 'STUDENT', passwordEnv: 'SEED_TEST_PASSWORD' },
  { name: 'Neha Kapoor', email: 'admin@iitr.ac.in', enrollmentNo: '10000001', phone: '9000000001', bhawan: 'Cautley', role: 'ADMIN', passwordEnv: 'SEED_ADMIN_PASSWORD' },
  { name: 'Arjun Mehta', email: 'delivery@iitr.ac.in', enrollmentNo: '21112077', phone: '9000000002', bhawan: 'Govind', role: 'DELIVERY_PARTNER', partnerStatus: 'APPROVED', passwordEnv: 'SEED_DELIVERY_PASSWORD' },
  // A sign-up waiting for approval, so the admin's "Approve" flow can be tried.
  { name: 'Kabir Rao', email: 'kabir@iitr.ac.in', enrollmentNo: '23113019', phone: '9000000003', bhawan: 'Azad', role: 'DELIVERY_PARTNER', partnerStatus: 'PENDING', passwordEnv: 'SEED_DELIVERY_PASSWORD' },
];

/** Demo orders that Arjun (delivery@iitr.ac.in) accepted and delivered / is delivering. */
const DELIVERED_BY_PARTNER = ['cmdemoseed0001', 'cmdemoseed0003', 'cmdemoseed0006'];

type SeedOrder = {
  id: string;
  user: string;
  status: OrderStatus;
  /** Who made each change after PLACED; "admin" or "student". */
  cancelledBy?: 'admin' | 'student';
  hoursAgo: number;
  bhawan: string;
  roomNo: string;
  note?: string;
  lines: [itemId: string, quantity: number][];
};

// Sample orders so the admin panel and order history aren't empty. Created once, never modified.
const orders: SeedOrder[] = [
  { id: 'cmdemoseed0001', user: 'test@iitr.ac.in', status: 'DELIVERED', hoursAgo: 72, bhawan: 'Rajendra', roomNo: 'A-112', lines: [['item-maggi', 4], ['item-amul-kool', 2]] },
  { id: 'cmdemoseed0002', user: 'riya@iitr.ac.in', status: 'CANCELLED', cancelledBy: 'student', hoursAgo: 48, bhawan: 'Sarojini', roomNo: '204', lines: [['item-veg-thali', 1]] },
  { id: 'cmdemoseed0003', user: 'test@iitr.ac.in', status: 'OUT_FOR_DELIVERY', hoursAgo: 2, bhawan: 'Rajendra', roomNo: 'A-112', note: 'Call when outside', lines: [['item-a4-register', 2], ['item-reynolds-pens', 1]] },
  { id: 'cmdemoseed0004', user: 'riya@iitr.ac.in', status: 'CONFIRMED', hoursAgo: 1, bhawan: 'Sarojini', roomNo: '204', lines: [['item-cold-coffee', 2], ['item-veg-sandwich', 2]] },
  { id: 'cmdemoseed0005', user: 'riya@iitr.ac.in', status: 'PLACED', hoursAgo: 0.2, bhawan: 'Sarojini', roomNo: '204', lines: [['item-casio-fx991', 1]] },
  { id: 'cmdemoseed0006', user: 'test@iitr.ac.in', status: 'DELIVERED', hoursAgo: 144, bhawan: 'Rajendra', roomNo: 'A-112', lines: [['item-engg-drawing-kit', 1]] },
  { id: 'cmdemoseed0007', user: 'test@iitr.ac.in', status: 'CANCELLED', cancelledBy: 'admin', hoursAgo: 30, bhawan: 'Rajendra', roomNo: 'A-112', lines: [['item-red-bull', 2]] },
];

const FORWARD: OrderStatus[] = ['PLACED', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function statusPath(order: SeedOrder): OrderStatus[] {
  if (order.status === 'CANCELLED') return order.cancelledBy === 'admin' ? ['PLACED', 'CONFIRMED', 'CANCELLED'] : ['PLACED', 'CANCELLED'];
  return FORWARD.slice(0, FORWARD.indexOf(order.status) + 1);
}

async function seedOrders(userIds: Map<string, string>, adminId: string, partnerId: string) {
  let created = 0;
  for (const order of orders) {
    if (await prisma.order.findUnique({ where: { id: order.id } })) continue;

    const lines = order.lines.map(([itemId, quantity]) => {
      const item = items.find((i) => i.id === itemId)!;
      const unitPrice = new Prisma.Decimal(item.price);
      return { itemId, itemName: item.name, unitPrice, quantity, lineTotal: unitPrice.times(quantity) };
    });
    const subtotal = lines.reduce((sum, l) => sum.plus(l.lineTotal), new Prisma.Decimal(0));
    const deliveryFee = subtotal.greaterThan(300) ? new Prisma.Decimal(0) : new Prisma.Decimal(20);
    const placedAt = new Date(Date.now() - order.hoursAgo * 3600_000);
    const userId = userIds.get(order.user)!;
    const byPartner = DELIVERED_BY_PARTNER.includes(order.id);

    await prisma.order.create({
      data: {
        id: order.id,
        userId,
        status: order.status,
        subtotal,
        deliveryFee,
        total: subtotal.plus(deliveryFee),
        bhawan: order.bhawan,
        roomNo: order.roomNo,
        note: order.note,
        createdAt: placedAt,
        ...(byPartner && { deliveryPartnerId: partnerId, acceptedAt: new Date(placedAt.getTime() + 20 * 60_000) }),
        items: { create: lines },
        statusHistory: {
          create: statusPath(order).map((status, i) => ({
            status,
            changedById:
              status === 'PLACED' || (status === 'CANCELLED' && order.cancelledBy === 'student')
                ? userId
                : byPartner && (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED')
                  ? partnerId
                  : adminId,
            changedAt: new Date(placedAt.getTime() + i * 15 * 60_000),
          })),
        },
      },
    });
    created++;
  }
  // Demo orders created before delivery partners existed: assign them to Arjun once.
  await prisma.order.updateMany({
    where: { id: { in: DELIVERED_BY_PARTNER }, deliveryPartnerId: null },
    data: { deliveryPartnerId: partnerId, acceptedAt: new Date() },
  });
  console.log(`Seeded ${created} sample orders (${orders.length - created} already existed)`);
}

async function main() {
  for (const item of items) {
    // No imageUrl: the app shows an illustrated tile for each item. Admins can add a photo URL later.
    const data = { ...item, imageUrl: '', isActive: true };
    await prisma.item.upsert({ where: { id: item.id }, create: data, update: data });
  }
  console.log(`Seeded ${items.length} items`);

  const userIds = new Map<string, string>();
  for (const { passwordEnv, ...user } of users) {
    const passwordHash = await bcrypt.hash(requireEnv(passwordEnv), 10);
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash },
      update: { name: user.name, passwordHash, role: user.role, partnerStatus: user.partnerStatus ?? null, isBlocked: false },
    });
    userIds.set(user.email, saved.id);
    console.log(`Seeded ${user.role.toLowerCase()} ${user.email} (password = ${passwordEnv} from .env)`);
  }

  await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  await seedOrders(userIds, userIds.get('admin@iitr.ac.in')!, userIds.get('delivery@iitr.ac.in')!);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
