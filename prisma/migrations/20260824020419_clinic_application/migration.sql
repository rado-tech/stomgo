-- CreateTable
CREATE TABLE "ClinicApplication" (
    "id" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "telegram" TEXT NOT NULL DEFAULT '',
    "doctorCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "clinicId" TEXT,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ClinicApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicApplication_status_createdAt_idx" ON "ClinicApplication"("status", "createdAt");

