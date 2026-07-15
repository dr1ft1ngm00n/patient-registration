/*
  Warnings:

  - You are about to drop the column `addressLine2` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Patient` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[firstName,lastName,dateOfBirth]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Made the column `genderId` on table `Patient` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_genderId_fkey";

-- DropIndex
DROP INDEX "Patient_email_key";

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "addressLine2",
DROP COLUMN "gender",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "insuranceMemberId" SET DATA TYPE TEXT,
ALTER COLUMN "genderId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_firstName_lastName_dateOfBirth_key" ON "Patient"("firstName", "lastName", "dateOfBirth");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_genderId_fkey" FOREIGN KEY ("genderId") REFERENCES "GenderMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
