-- Deny-by-default on every table in `public`. Zero policies is the point.
--
-- The moment NEXT_PUBLIC_SUPABASE_ANON_KEY ships inside the browser bundle,
-- PostgREST becomes publicly reachable, and any table without RLS is world
-- readable — catalogue, orders and the user directory included. Enabling RLS
-- with no policy attached denies everything, and every real read keeps going
-- through the API.
--
-- This does not affect Prisma. It connects as `postgres`, which owns these
-- tables, and Postgres exempts a table's owner from its own policies. The one
-- setting that would break that is FORCE ROW LEVEL SECURITY — never set it. The
-- symptom would be the entire application returning empty lists with no error.

ALTER TABLE "categories"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unities"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "movements"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stocks"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_counter"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_events"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_reports"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports"            ENABLE ROW LEVEL SECURITY;

-- Prisma names implicit m-n join tables in camelCase. Without the double quotes
-- Postgres folds the identifier to lower case and the statement fails with
-- "relation does not exist".
ALTER TABLE "_roleTouser"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_permissionTorole"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_departmentTouser"  ENABLE ROW LEVEL SECURITY;

-- Prisma's own bookkeeping table lives in `public` too, so it is just as
-- readable through PostgREST. It leaks migration names and checksums rather
-- than data, but there is no reason to publish the schema history either.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
