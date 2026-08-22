-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reviewAsked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "qrToken" TEXT;

-- AlterTable
ALTER TABLE "ServiceCatalog" ADD COLUMN     "clinicId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_qrToken_key" ON "Clinic"("qrToken");

-- CreateIndex
CREATE INDEX "ServiceCatalog_clinicId_idx" ON "ServiceCatalog"("clinicId");

