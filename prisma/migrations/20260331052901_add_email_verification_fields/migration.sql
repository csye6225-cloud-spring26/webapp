-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_expiry" TIMESTAMP(3),
ADD COLUMN     "verification_token" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;
