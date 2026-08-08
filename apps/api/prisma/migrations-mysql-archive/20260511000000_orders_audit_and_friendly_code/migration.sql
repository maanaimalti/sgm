-- 1. order_counter table seeded from existing orders
CREATE TABLE `order_counter` (
  `id`    INT NOT NULL,
  `value` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `order_counter` (`id`, `value`)
  SELECT 1, COALESCE((SELECT COUNT(*) FROM `orders`), 0);

-- 2. friendly_code column on orders
ALTER TABLE `orders`
  ADD COLUMN `friendly_code` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `orders_friendly_code_key` (`friendly_code`);

-- 3. Backfill friendly_code for existing rows ordered by created_at
SET @row := 0;
UPDATE `orders`
  SET `friendly_code` = CONCAT('#', LPAD((@row := @row + 1), 4, '0'))
  ORDER BY `createdAt`;

-- 4. Audit events table
CREATE TABLE `order_events` (
  `id`         VARCHAR(191) NOT NULL,
  `order_id`   VARCHAR(191) NOT NULL,
  `type`       VARCHAR(32)  NOT NULL,
  `user_id`    VARCHAR(191) NOT NULL,
  `payload`    JSON NULL,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `order_events_order_id_idx` (`order_id`),
  CONSTRAINT `order_events_orderId_fkey`
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `order_events_userId_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Backfill: a CREATED event for every existing order
INSERT INTO `order_events` (`id`, `order_id`, `type`, `user_id`, `created_at`)
  SELECT UUID(), o.`id`, 'CREATED', o.`userId`, o.`createdAt`
  FROM `orders` o;
