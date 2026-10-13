-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryPartnerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "partnerStatus" "PartnerStatus";

-- CreateIndex
CREATE INDEX "Order_deliveryPartnerId_status_idx" ON "Order"("deliveryPartnerId", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Partners that existed before approvals were introduced are already trusted.
UPDATE "User" SET "partnerStatus" = 'APPROVED' WHERE "role" = 'DELIVERY_PARTNER';
