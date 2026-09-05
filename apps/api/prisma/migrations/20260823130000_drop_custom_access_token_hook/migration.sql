-- Retira o Custom Access Token Hook. A autorização passou a ser lida de
-- `auth.users.app_metadata`, que o GoTrue já coloca em todo access token sem
-- precisar de hook nenhum.
--
-- ORDEM IMPORTA: desligue o hook no dashboard ANTES de aplicar esta migration
-- (Authentication → Hooks → Customize Access Token (JWT) Claims → nenhum).
-- Se a função sumir enquanto o hook ainda aponta para ela, o GoTrue falha ao
-- emitir token e ninguém consegue entrar.
--
-- Isto também apaga o `set_user_roles()`, que era a válvula de escape pelo SQL
-- Editor. O substituto é `pnpm --filter @sgm/api users:set-roles`, que escreve
-- no app_metadata — que é o lugar de onde a autorização é lida agora.

DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);
DROP FUNCTION IF EXISTS public.set_user_roles(text, text[]);
DROP FUNCTION IF EXISTS public.user_roles_overview();
