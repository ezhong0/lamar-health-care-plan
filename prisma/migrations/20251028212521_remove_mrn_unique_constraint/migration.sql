-- DropIndex
DROP INDEX "public"."patients_mrn_key";

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_patient_id_status_idx" ON "orders"("patient_id", "status");
