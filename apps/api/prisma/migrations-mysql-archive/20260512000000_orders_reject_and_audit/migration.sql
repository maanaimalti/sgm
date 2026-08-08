-- Add REJECTED to order_status enum
ALTER TABLE `orders`
  MODIFY COLUMN `status` ENUM('PENDING','APPROVED','REJECTED','PURCHASED','CANCELED') NOT NULL DEFAULT 'PENDING';

-- Add audit columns for approve / reject actors
ALTER TABLE `orders`
  ADD COLUMN `approved_by_id` VARCHAR(191) NULL,
  ADD COLUMN `approved_at`    DATETIME(3)  NULL,
  ADD COLUMN `rejected_by_id` VARCHAR(191) NULL,
  ADD COLUMN `rejected_at`    DATETIME(3)  NULL;

-- Foreign keys with ON DELETE SET NULL so deleting a user does not destroy order history
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_approved_by_fk`
    FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_rejected_by_fk`
    FOREIGN KEY (`rejected_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `orders_approved_by_id_idx` ON `orders`(`approved_by_id`);
CREATE INDEX `orders_rejected_by_id_idx` ON `orders`(`rejected_by_id`);
