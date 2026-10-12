import { PrismaClient } from '@prisma/client';
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

const CATEGORY_COLORS: Record<string, string> = {
  Snacks: 'f59e0b',
  Beverages: '0ea5e9',
  Stationery: '8b5cf6',
  Essentials: '10b981',
  Food: 'ef4444',
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
  { id: 'item-engg-drawing-kit', name: 'Engineering Drawing Kit', description: 'Mini drafter, compass, set squares and scale', category: 'Stationery', price: '350.00', stock: 15 },
  { id: 'item-casio-fx991', name: 'Casio fx-991ES Plus', description: 'Scientific calculator', category: 'Stationery', price: '1095.00', stock: 8 },

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

function placeholderImage(name: string, category: string) {
  const color = CATEGORY_COLORS[category] ?? '64748b';
  return `https://placehold.co/400x300/${color}/ffffff/png?text=${encodeURIComponent(name)}`;
}

async function main() {
  const password = process.env.SEED_TEST_PASSWORD;
  if (!password) {
    throw new Error('SEED_TEST_PASSWORD is not set. Copy server/.env.example to server/.env first.');
  }

  for (const item of items) {
    const data = { ...item, imageUrl: placeholderImage(item.name, item.category), isActive: true };
    await prisma.item.upsert({ where: { id: item.id }, create: data, update: data });
  }
  console.log(`Seeded ${items.length} items`);

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: 'test@iitr.ac.in' },
    create: {
      name: 'Test Student',
      email: 'test@iitr.ac.in',
      enrollmentNo: '21110001',
      phone: '9876543210',
      bhawan: 'Rajendra',
      passwordHash,
    },
    update: { passwordHash },
  });
  console.log('Seeded test user test@iitr.ac.in (password = SEED_TEST_PASSWORD from .env)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
