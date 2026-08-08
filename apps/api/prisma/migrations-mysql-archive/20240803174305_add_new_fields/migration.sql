/*
  Warnings:

  - You are about to drop the column `brandName` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `event` VARCHAR(191) NULL,
    ADD COLUMN `status_observation` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'PURCHASED', 'CANCELED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `products` DROP COLUMN `brandName`,
    DROP COLUMN `quantity`;
