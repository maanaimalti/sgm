/*
  Warnings:

  - You are about to drop the `product_values` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `cost_value` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_productValuesId_fkey`;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `cost_value` DOUBLE NOT NULL,
    ADD COLUMN `sale_value` DOUBLE NULL;

-- DropTable
DROP TABLE `product_values`;
