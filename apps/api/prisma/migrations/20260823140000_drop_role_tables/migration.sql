-- Remove as tabelas de papéis. A autorização passou a viver em
-- `auth.users.app_metadata`, e estas aqui não são mais lidas por nada.
--
-- SÓ APLIQUE DEPOIS de o passo anterior estar em produção e verificado:
--   1. `auth:sync-roles` rodou e todo mundo tem app_metadata;
--   2. o deploy que lê a autorização do token está no ar há tempo suficiente
--      para nenhum token antigo continuar válido (o fallback do jwt.strategy
--      some junto);
--   3. ninguém depende mais do `sync-roles` — ele lê justamente estas tabelas.
--
-- Não há volta por migration: recriar as tabelas é fácil, repovoá-las não.
-- O `app_metadata` passa a ser a única cópia de quem é o quê.
--
-- `permissions` e `_permissionTorole` nunca foram lidos por nenhum código —
-- saem junto porque só existiam para sustentar `roles`.

DROP TABLE IF EXISTS "_permissionTorole";
DROP TABLE IF EXISTS "_roleTouser";
DROP TABLE IF EXISTS "_departmentTouser";
DROP TABLE IF EXISTS "permissions";
DROP TABLE IF EXISTS "roles";
