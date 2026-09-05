-- Marks an account that exists but has never had a password chosen by the
-- person who owns it: invited users, and users whose password an admin has
-- just reset. AuthGate sends them to /definir-senha until they clear it.
--
-- Defaults to false, and the migrated users are deliberately left that way.
-- Six of them still carry a placeholder address with no mailbox behind it, so
-- flipping them on would strand them behind an invite e-mail that bounces.
ALTER TABLE "users" ADD COLUMN "must_set_password" BOOLEAN NOT NULL DEFAULT false;
