/*
  Warnings:

  - You are about to drop the column `productValuesId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_productValuesId_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_departmentId_fkey`;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `productValuesId`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `departmentId`;

-- CreateTable
CREATE TABLE `_productToproductValues` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_productToproductValues_AB_unique`(`A`, `B`),
    INDEX `_productToproductValues_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_departmentTouser` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_departmentTouser_AB_unique`(`A`, `B`),
    INDEX `_departmentTouser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_productToproductValues` ADD CONSTRAINT `_productToproductValues_A_fkey` FOREIGN KEY (`A`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_productToproductValues` ADD CONSTRAINT `_productToproductValues_B_fkey` FOREIGN KEY (`B`) REFERENCES `product_values`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_departmentTouser` ADD CONSTRAINT `_departmentTouser_A_fkey` FOREIGN KEY (`A`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_departmentTouser` ADD CONSTRAINT `_departmentTouser_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
