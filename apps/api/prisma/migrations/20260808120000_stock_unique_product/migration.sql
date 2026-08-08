-- Collapse duplicate stock rows per product before the unique index goes on.
-- Nothing ever enforced one row per product, so `findFirst` could pick either
-- of two rows and the balances could diverge. Keep the earliest row (ULIDs sort
-- by creation time) and give it the summed quantity.
UPDATE `stocks` s
JOIN (
    SELECT `productId`, MIN(`id`) AS keep_id, SUM(`quantity`) AS total
    FROM `stocks`
    GROUP BY `productId`
    HAVING COUNT(*) > 1
) d ON s.`id` = d.keep_id
SET s.`quantity` = d.total;

DELETE s FROM `stocks` s
JOIN (
    SELECT `productId`, MIN(`id`) AS keep_id
    FROM `stocks`
    GROUP BY `productId`
    HAVING COUNT(*) > 1
) d ON s.`productId` = d.`productId` AND s.`id` <> d.keep_id;

-- CreateIndex
CREATE UNIQUE INDEX `stocks_productId_key` ON `stocks`(`productId`);
