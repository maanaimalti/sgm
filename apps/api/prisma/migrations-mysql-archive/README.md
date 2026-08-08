# MySQL migration history (archived)

These 24 migrations built the MySQL database that ran until the Supabase cutover.
They are kept for forensics only — **nothing applies them any more**, and they
cannot be applied to Postgres.

Four are hand-written and use constructs Postgres does not accept at all:

| Migration | MySQL-only construct |
|---|---|
| `20260511000000_orders_audit_and_friendly_code` | `SET @row :=`, `UPDATE ... ORDER BY`, `UUID()`, `ADD UNIQUE INDEX` inside `ALTER TABLE` |
| `20260512000000_orders_reject_and_audit` | `MODIFY COLUMN ... ENUM(...)` to widen an enum |
| `20260808120000_stock_unique_product` | multi-table `UPDATE ... JOIN` and `DELETE s FROM ... JOIN` |
| `20241012174039_many2many` / `20241012192520_restore_data` | backticks, `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` |

The rest are Prisma's MySQL output (`VARCHAR(191)`, `DATETIME(3)`, `DOUBLE`,
inline `ENUM(...)`, `DROP FOREIGN KEY`), equally unportable.

Porting them was never the plan: the data was transplanted with
`prisma/migrate-mysql-to-postgres.ts` and the Postgres schema starts from a
single squashed baseline, `prisma/migrations/0_init`.

The schema these produced is frozen at `prisma/legacy/schema.mysql.prisma`,
which the migration script still reads.
