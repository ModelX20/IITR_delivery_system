-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'DELIVERY_PARTNER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_changedAt_idx" ON "OrderStatusHistory"("orderId", "changedAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_bhawan_idx" ON "Order"("bhawan");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StoreSettings is a single row: enforce it and create it with defaults.
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_single_row" CHECK ("id" = 1);
INSERT INTO "StoreSettings" ("id", "lowStockThreshold") VALUES (1, 5) ON CONFLICT DO NOTHING;

-- Backfill history for orders that existed before this migration, so every order has a timeline.
-- The original changer of later statuses is unknown, so those rows are attributed to the order's owner.
INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "changedById", "changedAt")
SELECT gen_random_uuid()::text, o."id", 'PLACED', o."userId", o."createdAt" FROM "Order" o;

INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "changedById", "changedAt")
SELECT gen_random_uuid()::text, o."id", o."status", o."userId", o."createdAt" FROM "Order" o
WHERE o."status" <> 'PLACED';
