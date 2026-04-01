-- AlterTable
ALTER TABLE "line_targets" ADD COLUMN     "client_id" TEXT;

-- AlterTable
ALTER TABLE "monthly_batch_subscriptions" ADD COLUMN     "exclude_from_batch" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "line_targets" ADD CONSTRAINT "line_targets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
