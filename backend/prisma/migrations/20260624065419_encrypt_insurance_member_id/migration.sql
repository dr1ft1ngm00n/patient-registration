/*
  Warnings:

  - You are about to alter the column `insuranceMemberId` on the `Patient` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "insuranceMemberId" SET DATA TYPE VARCHAR(255);
