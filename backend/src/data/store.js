// Temporary in-memory store. Replace with a real database (MongoDB, MySQL, etc.) later.
// Data resets every time the server restarts.

export const ORDER_STATUSES = ['pending', 'picked_up', 'delivered', 'cancelled'];

let nextId = 3;

export const orders = [
  {
    id: 1,
    studentName: 'Asha',
    item: 'Sandwich from Canteen',
    pickupLocation: 'Main Canteen',
    dropLocation: 'Hostel A, Room 101',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    studentName: 'Rahul',
    item: 'Printouts (10 pages)',
    pickupLocation: 'Stationery Shop',
    dropLocation: 'Library, 2nd Floor',
    status: 'picked_up',
    createdAt: new Date().toISOString(),
  },
];

export function getNextId() {
  return nextId++;
}
