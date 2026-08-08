/*
  Warnings:

  - You are about to drop the `_productToproductValues` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_productToproductValues` DROP FOREIGN KEY `_productToproductValues_A_fkey`;

-- DropForeignKey
ALTER TABLE `_productToproductValues` DROP FOREIGN KEY `_productToproductValues_B_fkey`;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `productValuesId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `_productToproductValues`;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_productValuesId_fkey` FOREIGN KEY (`productValuesId`) REFERENCES `product_values`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
