/*
  Warnings:

  - Added the required column `response` to the `RSVP` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RSVP" ADD COLUMN     "response" "RSVPStatus" NOT NULL;
