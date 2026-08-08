/*
  Warnings:

  - You are about to alter the column `type` on the `movements` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.

*/
-- DropIndex
DROP INDEX `products_productValuesId_fkey` ON `products`;

-- AlterTable
ALTER TABLE `movements` MODIFY `type` ENUM('in', 'out') NOT NULL;
