/*
  Warnings:

  - You are about to drop the column `product_id` on the `product_values` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `product_values` DROP FOREIGN KEY `product_values_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_departmentId_fkey`;

-- AlterTable
ALTER TABLE `product_values` DROP COLUMN `product_id`;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `productValuesId` VARCHAR(191) NULL,
    MODIFY `departmentId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_productValuesId_fkey` FOREIGN KEY (`productValuesId`) REFERENCES `product_values`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
