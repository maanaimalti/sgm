-- Supabase Custom Access Token Hook: roles as JWT claims.
--
-- Supabase Auth calls this function every time it mints an access token, and
-- copies whatever claims it returns into the JWT. It exists so that Postgres
-- itself can see a user's roles: RLS policies run inside the database and have
-- no way to reach the API's request.user. It is also what makes roles editable
-- from the dashboard's SQL Editor, through the helper functions below.
--
-- The claims are NOT authoritative. JwtStrategy.validate() still reads roles
-- and departments from these tables on every request, so a role change takes
-- effect immediately rather than at the next token refresh, and a broken hook
-- degrades RLS without touching the API. That is why the function is allowed
-- to fail open — see the exception handler.
--
-- SECURITY DEFINER is deliberate. The Supabase documentation's example is
-- SECURITY INVOKER plus GRANT SELECT on each table plus an RLS policy for
-- supabase_auth_admin. Running as the owner instead means supabase_auth_admin
-- needs USAGE on the schema and EXECUTE on this one function, and nothing
-- else: no table grants, no new policies, and the deny-by-default posture from
-- 20260810120100_enable_row_level_security stays exactly as it was.
--
-- A SECURITY DEFINER function without a pinned search_path is the classic
-- privilege-escalation vector, so search_path is emptied and every identifier
-- below is schema-qualified.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id text;
  v_roles   jsonb;
  v_claims  jsonb;
BEGIN
  v_claims := event -> 'claims';

  -- supabase_user_id is UNIQUE and nullable. A user who has not been through
  -- auth:provision yet holds NULL, and NULL never equals anything, so they
  -- fall through to the empty-roles branch instead of matching a stranger.
  SELECT u.id
    INTO v_user_id
    FROM public.users u
   WHERE u.supabase_user_id = (event ->> 'user_id')::uuid;

  IF v_user_id IS NULL THEN
    v_claims := jsonb_set(v_claims, '{app_roles}', '[]'::jsonb);
    RETURN jsonb_set(event, '{claims}', v_claims);
  END IF;

  -- Prisma's implicit m-n table: "A" references roles(id), "B" references
  -- users(id), and the camelCase name has to stay double-quoted or Postgres
  -- folds it to _roletouser and the statement fails.
  --
  -- The join is on roles.name, never on a role id: prisma/seed.ts creates
  -- roles with ulid(), so the ids differ between every environment.
  SELECT COALESCE(jsonb_agg(r.name ORDER BY r.name), '[]'::jsonb)
    INTO v_roles
    FROM public."_roleTouser" ru
    JOIN public.roles r ON r.id = ru."A"
   WHERE ru."B" = v_user_id;

  v_claims := jsonb_set(v_claims, '{app_roles}', v_roles);
  -- The ULID the rest of the system speaks. Lets a policy compare directly
  -- instead of sub-selecting public.users on every row.
  v_claims := jsonb_set(v_claims, '{app_user_id}', to_jsonb(v_user_id));

  RETURN jsonb_set(event, '{claims}', v_claims);

EXCEPTION
  WHEN OTHERS THEN
    -- Fail open, on purpose. A Postgres hook has a two-second budget and no
    -- retries: if this raises, Supabase Auth issues no token at all and nobody
    -- can sign in. Returning the event untouched yields a token without the
    -- custom claims, which costs only the RLS-dependent features, because the
    -- API reads roles from the database regardless.
    --
    -- This is only safe while the claims are not authoritative. If validate()
    -- ever starts trusting them, this handler becomes a privilege-escalation
    -- hole and must go.
    RETURN event;
END;
$$;

-- How a role change is made from the dashboard's SQL Editor:
--
--   select public.set_user_roles('maria.cozinha', array['kitchen']);
--   select * from public.user_roles_overview();
--
-- Editing "_roleTouser" by hand is the alternative, and it means matching
-- ULIDs by eye in two columns called "A" and "B", where a wrong row silently
-- grants or revokes the wrong access.
--
-- Not SECURITY DEFINER: the SQL Editor connects as the owner already, and
-- these must never become callable by anyone else.

CREATE OR REPLACE FUNCTION public.set_user_roles(p_username text, p_roles text[])
RETURNS TABLE (username text, roles text[])
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id  text;
  v_unknown  text;
  v_was_admin boolean;
  v_admins   integer;
BEGIN
  IF p_roles IS NULL OR cardinality(p_roles) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um papel';
  END IF;

  SELECT u.id INTO v_user_id
    FROM public.users u WHERE u.username = p_username;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário "%" não existe', p_username;
  END IF;

  SELECT string_agg(candidate, ', ') INTO v_unknown
    FROM unnest(p_roles) AS candidate
   WHERE candidate NOT IN (SELECT r.name FROM public.roles r);

  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'Papel inexistente: %', v_unknown;
  END IF;

  -- Same invariant as assertAdminRemains in users.service.ts. Losing the last
  -- admin locks everybody out of /usuarios with no way back except raw SQL.
  IF NOT ('admin' = ANY (p_roles)) THEN
    SELECT EXISTS (
      SELECT 1 FROM public."_roleTouser" ru
        JOIN public.roles r ON r.id = ru."A"
       WHERE ru."B" = v_user_id AND r.name = 'admin'
    ) INTO v_was_admin;

    IF v_was_admin THEN
      SELECT count(DISTINCT ru."B") INTO v_admins
        FROM public."_roleTouser" ru
        JOIN public.roles r ON r.id = ru."A"
       WHERE r.name = 'admin';

      IF v_admins <= 1 THEN
        RAISE EXCEPTION
          'Este é o único administrador do sistema — promova outro antes';
      END IF;
    END IF;
  END IF;

  DELETE FROM public."_roleTouser" ru WHERE ru."B" = v_user_id;

  INSERT INTO public."_roleTouser" ("A", "B")
  SELECT r.id, v_user_id FROM public.roles r WHERE r.name = ANY (p_roles);

  RETURN QUERY
  SELECT p_username, array_agg(r.name ORDER BY r.name)
    FROM public."_roleTouser" ru
    JOIN public.roles r ON r.id = ru."A"
   WHERE ru."B" = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_roles_overview()
RETURNS TABLE (username text, name text, email text, roles text[])
LANGUAGE sql
STABLE
AS $$
  SELECT u.username,
         u.name,
         u.email,
         COALESCE(array_agg(r.name ORDER BY r.name)
                    FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
    FROM public.users u
    LEFT JOIN public."_roleTouser" ru ON ru."B" = u.id
    LEFT JOIN public.roles r          ON r.id  = ru."A"
   GROUP BY u.username, u.name, u.email
   ORDER BY u.username;
$$;

-- Everything below names roles that exist only on Supabase. CI runs a stock
-- postgres:16-alpine where supabase_auth_admin, anon and authenticated are
-- absent, and an unguarded GRANT aborts with SQLSTATE 42704 — which fails the
-- build and, in production, leaves a migration recorded with finished_at NULL
-- that blocks every deploy afterwards until someone runs migrate resolve.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO supabase_auth_admin';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin';
  END IF;

  -- CREATE FUNCTION grants EXECUTE to PUBLIC by default, so this revoke is
  -- what keeps a SECURITY DEFINER function from being callable by the anon
  -- key. PUBLIC is a pseudo-role and always exists.
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.set_user_roles(text, text[]) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.user_roles_overview() FROM PUBLIC';
END
$$;

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target) THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM %I', target);
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.set_user_roles(text, text[]) FROM %I', target);
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.user_roles_overview() FROM %I', target);
    END IF;
  END LOOP;
END
$$;
