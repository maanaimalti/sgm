/*
  Warnings:

  - You are about to drop the column `observation` on the `order_reports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `order_reports` DROP COLUMN `observation`;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `observation` VARCHAR(191) NULL;
