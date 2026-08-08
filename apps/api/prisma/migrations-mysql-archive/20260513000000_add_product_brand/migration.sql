-- Add nullable brand column to products
ALTER TABLE `products`
  ADD COLUMN `brand` VARCHAR(191) NULL;
