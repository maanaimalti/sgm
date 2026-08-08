# Migração para o Supabase — onde paramos

Documento de continuidade. Última atualização: **08/08/2026**, com a Etapa B
implementada. A §2.4 mudou de decisão — leia antes de tocar em auth.

| Etapa | Status |
|---|---|
| **A — Banco: MySQL → Supabase Postgres** | ✅ **Em produção e verificada** |
| **C — Storage: R2 → Supabase Storage** | ⏸️ Escopo encolheu muito, ver §4 |
| **B — Auth: JWT próprio → Supabase Auth + gestão de usuários** | 🔧 **Implementada** na branch `feat/supabase-stage-b`, aguardando os portões |
| **D — Realtime** | ⛔ Não iniciada. Depende da B |

Projeto Supabase: `uhvqtymjdihoagfyaruj` · região `us-east-1` · Postgres 17.6
API em produção: `https://api-sgm.icmalagoas.org.br`

---

## 1. Etapa A — concluída

MySQL saiu, Supabase Postgres entrou. A API NestJS e o Prisma continuam.
Mergeada em `main` no commit `15a9cc7`, CI e deploy verdes, smoke test aprovado.

### O que entrou

- `provider = "postgresql"` + `directUrl`. As 24 migrations MySQL foram para
  `apps/api/prisma/migrations-mysql-archive/` (4 delas usavam `SET @var`,
  `UPDATE ... ORDER BY`, `UUID()`, `UPDATE/DELETE ... JOIN` — nada disso é
  portável). O Postgres começa de um baseline único, `0_init`.
- `apps/api/prisma/migrate-mysql-to-postgres.ts` — cópia com dois Prisma Clients
  (`--check` para pré-voo somente leitura, `--truncate` para recarregar).
- **9 pontos ganharam `mode: "insensitive"`.** O `utf8mb4_unicode_ci` do MySQL
  fazia `LIKE` insensível a caixa; o Postgres não. Sem isso, buscar "arroz"
  deixaria de achar "Arroz". `orders.service.ts:505` ficou de fora de propósito
  — casa um ULID, e ampliar o match seria errado.
- **Dinheiro virou `Decimal(12,2)`.** `double precision` não representa 25,90
  exatamente. O `Decimal` serializa como string em JSON, então as duas fronteiras
  de leitura fazem `.toNumber()` e o contrato da API continua `number`.
- **`GET /movement` foi consertado.** Estava quebrado em runtime: o `where` era
  `{ product: { product: { department } } }` (`product` não tem campo `product`)
  e filtrava `name`/`description` em `movement`, que não os tem. `where: any`
  escondia do compilador.
- `order_counter.update` → `upsert`. A linha singleton não existia em produção;
  sem isso a primeira criação de pedido falharia com `P2025`.
- CI (`.github/workflows/ci.yml`) travando o deploy do EasyPanel, validação de
  env no boot, remoção de deps de websocket não usadas.

### Números da migração

228 linhas em 29 segundos. 169 produtos, 19 categorias, 16 unidades, 7 usuários,
2 departamentos, 9 notificações. **Zero pedidos** — o fluxo de pedidos nunca foi
usado em produção, o que tornou a virada muito menos arriscada.

### Configuração de produção

```
DATABASE_URL  = pooler SESSÃO, porta 5432   ← não 6543
DIRECT_URL    = mesma string                ← variável nova
```

Modo transação (6543) prenderia uma conexão do pool durante as duas
`$transaction` interativas do código (`movement.service.ts:33,50` e
`orders.service.ts:43`).

### Reversão

O MySQL de produção **nunca foi escrito, só lido**. Reverter = voltar
`DATABASE_URL` e a imagem anterior no EasyPanel, ~5 min.
**Manter a instância MySQL viva até 07/09/2026.**

---

## 2. Etapa B — Supabase Auth + gestão de usuários

A maior das etapas restantes, e onde está o valor que sobrou.

### Por que ainda vale a pena

O time entregou troca de senha, reset por admin e invalidação de token via
`passwordChangedAt`. Isso resolveu a dor de "não existe reset de senha", mas
**não** resolveu:

1. **Não existe refresh token.** O token expira em 12h (`JWT_EXPIRES_IN`) e o
   interceptor do axios faz `window.location.href = "/"` — o usuário é expulso no
   meio da tarefa, perdendo formulário preenchido.
2. **Token em `localStorage` + cookie não-httpOnly** (`use-login.ts:36-42`).
   Exfiltrável por XSS. O cookie existe só para o middleware conseguir vê-lo.
3. **`middleware.ts` é teatro.** Confere apenas a *presença* de um cookie
   chamado `accessToken` — sem assinatura, sem expiração, sem papel. Qualquer
   valor passa.
4. **`interface UserData` redeclarada em 8 arquivos**, porque não há contexto de
   auth. E como o `useJwt` decodifica dentro de um `useEffect`, na primeira
   renderização todos os papéis são `undefined` e o menu "pipoca".

### 2.1 Decisão de identidade: manter as PKs ULID

Adicionar a `public.users`:

```prisma
supabaseUserId String? @unique @map("supabase_user_id") @db.Uuid
```

**Não** reescrever as PKs de usuário para os UUIDs do Supabase. O argumento
decisivo é reversibilidade: com a coluna de ligação, dá para reverter a Etapa B
inteira sem tocar em uma linha de dado de negócio. Reescrever PKs significaria,
numa reversão sob pressão, reescrevê-las de volta em **8 tabelas com FK**
(`orders.userId`, `orders.approved_by_id`, `orders.rejected_by_id`,
`order_reports.userId`, `order_events.user_id`, `notification.to`,
`reports.userId`, `push_subscriptions.userId`) mais 2 tabelas de junção.

Consequência boa: `@GetUserId()` continua devolvendo o ULID, então os 31
handlers com `@Roles`, todos os services, `GetDepartmentId`, `GetUserRoles` e
`RolesGuard` ficam **intocados**. O diff fica confinado a `jwt.strategy.ts`.

**Não criar FK real para `auth.users`** — exigiria o preview `multiSchema` e dar
permissão ao role do Prisma no schema `auth`.

### 2.2 E-mails: só temos o do Lucas

Estado atual: **7 de 7 usuários sem e-mail** em produção.

**Estratégia acordada:** o Lucas entra com o e-mail real; os outros 6 recebem um
placeholder, e os e-mails reais são preenchidos depois **pela tela de gestão de
usuários** que esta etapa vai construir.

Formato do placeholder:

```
<username>@sgm.icmalagoas.org.br
```

Domínio que a organização controla — evite `.invalid` ou `.local`, que são
sintaticamente legais mas quebram no dia em que alguém habilitar reset por
e-mail. Ficam: `aloisio@`, `jailton@`, `leandrofelix@`, `pauloomena@`,
`silas@`, `tarciso@`.

Consequência a aceitar conscientemente: **não existe caixa postal nesses
endereços**, então e-mail de recuperação bounce. Isso é aceitável porque o reset
continua sendo feito pelo admin (`supabase.auth.admin.updateUserById`), que é
justamente o que a tela nova faz. Achar quem ainda está no placeholder:
`WHERE email LIKE '%@sgm.icmalagoas.org.br'`.

Aplicar com o script que já existe:

```bash
pnpm --filter @sgm/api users:set-emails emails.csv --dry-run
pnpm --filter @sgm/api users:set-emails emails.csv
```

Ele normaliza com `trim().toLowerCase()` — **obrigatório**, porque o índice
único do MySQL era case-insensitive, o do Postgres não é, e o Supabase Auth
normaliza internamente.

**O `username` fica.** Continua `@unique`, continua aparecendo na UI. Só deixa
de ser a credencial de login.

### 2.3 Gestão de usuários — recriar

Hoje existe `GET /users` e `POST /users/:id/reset-password` (ambos `@Roles("admin")`),
mas **não existe criação de usuário** em lugar nenhum — nem endpoint, nem tela.
Usuários foram criados à mão no banco.

Depois do Supabase Auth isso fica **mais difícil**, não mais fácil: a conta
precisa nascer nos dois lados.

1. `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
2. `prisma.user.create` com o ULID de `HelpersService.generateId()`, o
   `supabase_user_id` devolvido no passo 1 e o `connect` de papéis e setores —
   **tudo campo da mesma instrução**, uma transação implícita.

São dois passos, não quatro, e por isso existe **exatamente uma aresta de
compensação**: se o passo 2 falhar, apagar a conta criada no passo 1. Sem isso
sobra uma conta de auth invisível em `GET /users` que é dona do e-mail, e toda
nova tentativa falha com `user_already_exists` sem nada explicando de onde ela
veio.

**Backend a construir** (`apps/api/src/modules/users/`):

| Endpoint | Papel | O quê |
|---|---|---|
| `POST /users` | admin | Cria usuário: e-mail, nome, username, senha inicial, papéis, departamentos |
| `PATCH /users/:id` | admin | Edita nome, papéis, departamentos |
| `PATCH /users/:id/email` | admin | **Troca o e-mail** — é como os placeholders viram reais. Precisa atualizar `auth.users` e `public.users` juntos |
| `GET /users` | admin | Já existe |
| `POST /users/:id/reset-password` | admin | Já existe, migrar para `admin.updateUserById` |

**Frontend a construir** (`apps/web/src/app/(app)/usuarios/`):

A página `/usuarios` já existe (listagem, criada no PR de gestão de senhas).
Falta:

- Botão e formulário **"Novo usuário"** — e-mail, nome, username, senha inicial,
  papéis (checkbox: admin/kitchen/buyer/manager), departamentos
- **Edição inline do e-mail** na listagem — o caminho para trocar os placeholders
- Destaque visual para quem ainda está com placeholder, para não esquecerem
- Reaproveitar os padrões de `src/data/mutations/*` e `src/hooks/pages/use-*`

### 2.4 Identidade no frontend: `GET /auth/me`, não Custom Access Token Hook

**Decisão revista.** A versão anterior desta seção especificava uma função
PL/pgSQL injetando `app_user_id`, `roles` e `departments` nas claims do token.
Foi descartada.

O argumento nº 1 a favor do hook caiu ao ler o código: `get-department-id.ts:33`
já cai em `departmentIds[0]` quando o header `departmentId` está ausente, e o
web só mandava `department[0].id` — o mesmo elemento. O header era redundante, e
com ele some a única coisa que exigia claim customizada em toda requisição.

No lugar: **`GET /auth/me`**, projeção pura de `request.user`. Não custa query
nenhuma, porque `JwtStrategy.validate()` já carregava exatamente essa linha para
autorizar a requisição.

O que se ganha:

- **Sem PL/pgSQL, sem GRANTs, sem toggle de dashboard.** Some junto o modo de
  falha que esta seção mais temia: grant perdido → `roles` vazio → menu em
  branco e 403 em tudo, sem erro apontando a causa. O
  `verify-supabase-grants.ts` não tem mais o que verificar; foi substituído pelo
  `verify-rls.ts`, que guarda algo que existe.
- **Mudança de papel vale na hora.** Com o hook valeria só no próximo refresh,
  até 1h depois.
- A API continua autoritativa a partir do banco, que já era a regra.

O que se perde: uma requisição no boot. O `AuthGate` em `(app)/layout.tsx`
segura a shell até a identidade resolver, então o custo é um loader, não um
menu que pisca — e o `use-login.ts` faz `prefetchQuery` antes de navegar, então
o caminho pós-login já chega quente.

> Consequência para a Etapa D: a política de RLS de `notification` não pode usar
> `auth.jwt() ->> 'app_user_id'`, porque essa claim não existe. Use um subselect
> por `supabase_user_id` — ver §3.

### 2.5 Verificação do JWT na API

Trocar `secretOrKey` por `passportJwtSecret` do `jwks-rsa` (via
`secretOrKeyProvider`), com `audience: "authenticated"`, `issuer` **derivado**
de `SUPABASE_URL` e o JWKS em `/.well-known/jwks.json`. Em `validate()`, mudar
o `where` de `{ id: payload.sub }` para `{ supabaseUserId: payload.sub }`.

Dois detalhes que a versão anterior não mencionava e que custam caro:

- **Fixar `algorithms: ["ES256"]`.** Sem isso a strategy aceita qualquer
  algoritmo que o JWKS anunciar. Em compensação, criar uma chave RSA no
  dashboard sem acrescentar `"RS256"` aqui dá 401 em todo token novo.
- **Derivar o issuer em vez de configurá-lo à parte**, para os dois não
  divergirem. Uma barra final em `SUPABASE_URL` produz um issuer que não bate
  com o `iss` do token, e o único sintoma é 401 em tudo. `normalizeSupabaseUrl`
  no `env.validation.ts` normaliza no boot e `supabaseIssuer()` normaliza de
  novo — este último é o que tem teste.

**Pré-requisito rígido:** ativar **chaves assimétricas** no projeto (Dashboard →
Authentication → JWT Keys → chave ECC P-256). Até fazer isso o JWKS devolve
`{"keys":[]}` e **toda requisição dá 401**. Conferir antes de deployar:

```bash
curl -s https://uhvqtymjdihoagfyaruj.supabase.co/auth/v1/.well-known/jwks.json | jq '.keys | length'
```

Fazer a troca **antes** de qualquer usuário ter sessão — rotacionar invalida
tokens assinados com a chave antiga.

`issuedBeforePasswordChange` e seus cinco testes foram **apagados**, não
mantidos: com o login legado removido nada mais escreve `passwordChangedAt`, e o
Supabase já revoga sessões na troca de senha. Uma função exportada morta com
spec passando sugere uma proteção que não existe mais. A **coluna** fica, e cai
junto com `password` em 90 dias.

### 2.6 RLS é obrigatório nesta etapa

No momento em que a `NEXT_PUBLIC_SUPABASE_ANON_KEY` for para o bundle do
browser, **o PostgREST fica publicamente acessível para toda tabela sem RLS** —
catálogo, pedidos e lista de usuários legíveis por quem abrir o devtools.

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` nas 20 tabelas mais
`_prisma_migrations` (aspas nas três de junção, que são camelCase — sem elas o
Postgres normaliza para minúsculas e o ALTER falha), **zero políticas** =
negação por padrão. Todo acesso real passa pela API.

**Não quebra o Prisma:** ele conecta como `postgres`, dono de todas as tabelas, e
dono ignora RLS. Verificado num banco descartável: o dono lê suas linhas, e um
role com `SELECT` explicitamente concedido lê zero. O jeito de quebrar é
`FORCE ROW LEVEL SECURITY` — nunca — ou apontar `DATABASE_URL` para um role que
não seja dono. `pnpm --filter @sgm/api db:verify-rls` checa os dois, e roda no CI.

Sem o hook da §2.4, `supabase_auth_admin` **não precisa de acesso nenhum** ao
schema `public`. Dar a ele políticas de `select` furaria o deny-by-default à toa.

No dashboard: **"Allow new users to sign up" OFF** (crítico), Confirm email OFF,
tamanho mínimo de senha igual ao de `login-schema.ts`, Site URL do domínio Vercel,
rotação de refresh token ON.

### 2.7 Frontend

`createBrowserClient` do `@supabase/ssr` (não o supabase-js puro): guarda a
sessão em **cookies**, o que mata a gambiarra de espelhar o token e permite um
`middleware.ts` de verdade com `getClaims()` (verificação local contra o JWKS).

**Bug clássico a evitar:** o middleware precisa retornar **exatamente** o
`NextResponse` em que o client escreveu os cookies. Retornar outro descarta os
tokens renovados em silêncio — logouts aleatórios.

**Consertar o matcher de passagem.** O atual não exclui `/sw.js` nem os PNGs do
PWA, então a requisição do service worker é redirecionada para `/` — bug ativo.

| Arquivo | Ação |
|---|---|
| `src/lib/supabase/client.ts` | novo — singleton `createBrowserClient` |
| `src/lib/supabase/middleware.ts` | novo — helper `updateSession` |
| `src/providers/auth-provider.tsx` | novo — `{ user, isLoading, isAuthenticated }` + `onAuthStateChange` |
| `src/hooks/use-auth.ts` | novo — `useAuth()` e `useRoles()` |
| `src/components/shell/auth-gate.tsx` | novo — segura a shell até a identidade resolver |
| `src/data/fetchers/auth/me.ts` | novo |
| `src/lib/roles.ts` | novo — `roleLabel()`, hoje duplicado em `sidebar/index.tsx:48` e `mobile-bottom-nav.tsx:34` |
| `src/lib/auth/sign-out.ts` | novo — logout único (**4 cópias**, não 2: `sidebar/index.tsx:100`, `mobile-bottom-nav.tsx:122`, `use-change-password.ts:43` e, parcial, `services/api.ts:33`) |
| `src/hooks/use-jwt.ts` | **apagar** |
| `src/data/mutations/login.ts` | **apagar** — vira `signInWithPassword` |
| `src/middleware.ts` | reescrever |
| `src/app/providers.tsx` | aninhar o `AuthProvider` **dentro** do `QueryClientProvider` |
| `src/app/(app)/layout.tsx` | envolver com `AuthGate` |
| `src/services/api.ts` | interceptor async com `getSession()` — **é o que acaba com o logout de 12h** |
| `packages/shared/src/auth.ts` | novo — `ROLES`, `Role`, `AuthUser`, `isPlaceholderEmail` (sem `AccessTokenClaims`: não há claim customizada) |

**A ordem do logout é obrigatória.** `unsubscribeFromPush()` chama
`DELETE /push/subscription`, que precisa de token válido — roda **antes** de a
sessão cair, nunca depois. E `signOut({ scope: "local" })`: o default é
`"global"` e derrubaria a sessão em todos os aparelhos.

**O 401 do interceptor precisa de guarda de repetição.** Ele agora pede um
refresh e repete, e a `validate()` passou a dar 401 quando o `sub` não casa
nenhuma linha de `public.users` — um usuário vivo no auth mas não provisionado
entraria em loop infinito renovando um token perfeitamente válido.

Apagar as 8 `interface UserData` e trocar `useJwt<UserData>` por `useAuth()`:
`use-sidebar.ts:33`, `use-orders.ts:168`, `use-edit-order.ts:15`,
`sidebar/index.tsx:45`, `mobile-bottom-nav.tsx:31`, `mobile-top-bar.tsx:14`,
`inicio/page.tsx:20`, `pedidos/[id]/editar/page.tsx:15`.

**Login vira por e-mail:** `page.tsx` (label, `type="email"`, ícone `Mail`,
placeholder), `login-schema.ts` (`z.string().email()` — **zod 3**, não o
`z.email()` do zod 4), `use-login.ts` (mensagem "E-mail ou senha inválidos",
casando `error.code === "invalid_credentials"` *e* a mensagem, porque o texto é
localizável e mudou entre versões do GoTrue).

**O `departmentId` sai do interceptor.** `get-department-id.ts:33` já cai em
`departmentIds[0]`, que é o mesmo valor. O decorator e seu spec ficam
intocados — o caminho do header vira morto-porém-inofensivo e é o mecanismo de
um futuro seletor de departamento. O `allowedHeaders` do `main.ts` fica neste
deploy: um bundle cacheado pelo service worker ainda pode mandá-lo, e rejeição
de CORS é falha opaca.

### 2.8 Virada e reversão

**Sem janela de aceite duplo.** O script de criação dos usuários no Supabase Auth
roda dias antes e é invisível. A virada é: deployar API + web juntos, as sessões
atuais morrem, todo mundo loga de novo com e-mail. Para 7 usuários internos isso
é aceitável e muito mais simples que manter dois formatos de token.

Migrar as senhas sem ninguém trocar nada:

```ts
await admin.auth.admin.createUser({
  email: u.email,
  password_hash: u.password,   // bcrypt $2a$/$2b$ — aceito como está
  email_confirm: true,
});
```

**`LEGACY_LOGIN_ENABLED` foi riscado.** Um login legado que emite HS256 é
inútil a menos que a API também continue verificando HS256 — o que exige uma
segunda strategy e trocar todo `AuthGuard("jwt")` em ~10 controllers, dobrando a
superfície de auth para servir uma rota que nenhuma UI chama. **A unidade de
reversão é o par de deploys**, e ela já é grátis:

| Item | Manter por |
|---|---|
| Coluna `users.password` (nullable) | 90 dias — única forma de reconstruir os hashes numa reversão |
| `JWT_SECRET` **setado no EasyPanel** (fora do código) | até aposentar a imagem anterior — é o que a faz subir |
| Dependência `bcrypt` | fica: o `prisma/seed.ts` usa |

**Consequência para o dev local:** sem `POST /auth/login`, o `admin`/`admin123`
do seed não entra. O seed passou a gravar um e-mail, o fluxo vira
`make db-up && pnpm prisma:seed && pnpm auth:provision`, e o `.env` local deve
apontar para um **projeto Supabase separado** — nunca o de produção, porque a
service-role key cria e apaga contas de verdade.

**A corrida de deploy é o risco real.** O merge dispara `deploy-api.yml` e o
deploy do Vercel ao mesmo tempo, sem ordem garantida: durante a corrida ou o web
novo fala com a API velha (ES256 contra verificação HS256 → 401 em massa) ou o
inverso. **Desligar o auto-deploy do Vercel para `main` antes do merge** e
promover o preview depois dos portões.

**Sinais de alerta nas primeiras 48h:** JWKS vazio ou `SUPABASE_URL` com barra
final → 401 em tudo. Menu de **uma** pessoa em branco → `supabase_user_id` não
gravado. Menu de **todo mundo** em branco → `/auth/me` dando 429, o
`@SkipThrottle()` não subiu. Logouts aleatórios → middleware não devolvendo o
`NextResponse` com os cookies. Listas vazias em tudo sem erro → `FORCE ROW LEVEL
SECURITY` ligado.

---

## 3. Etapa D — Realtime

**Depende da Etapa B.** Sem `supabase_user_id` o RLS não consegue identificar o
usuário, e publicar `orders` com `using (true)` para a chave anônima exporia
todos os pedidos a quem abrisse o devtools.

Usar como **gatilho de invalidação**, não como camada de dados:
`postgres_changes` → `queryClient.invalidateQueries()`. Os payloads são linhas
cruas — uma linha de `orders` não tem itens, nem nome de produto, nem `user.name`.
Reproduzir o escopo por departamento e o gating por papel no cliente seria uma
reescrita com nova superfície de autorização.

Publicar só `orders` e `notification`. **A política mudou junto com a §2.4:**
não existe claim `app_user_id`, então o descasamento ULID/UUID se resolve por
subselect na coluna de ligação:

```sql
create policy "own_notifications" on public.notification
  for select to authenticated
  using (
    "to" = (select u.id from public.users u where u.supabase_user_id = auth.uid())
  );
```

`"to"` precisa de aspas — `TO` é palavra reservada. A tabela é
`public.notification`, singular.

Manter o polling como fallback atrás de `NEXT_PUBLIC_REALTIME_ENABLED`, só mais
lento (10 min em vez de 2). Reversão vira uma env var.

Limitações que vão morder: **um filtro por subscription**, coluna única, sem
`OR` nem join. Em `orders` não dá para filtrar por departamento (a tabela não
tem `departmentId`). E o efeito precisa retornar `supabase.removeChannel(channel)`,
senão o StrictMode cria duas subscriptions.

---

## 4. Etapa C — Storage: o escopo encolheu

**Reavaliar antes de fazer.** O PR "sign report URLs" já entregou o que dava
valor à etapa:

- Bucket R2 privado
- `getDownloadUrl()` async com URL assinada de 15 min
- Só a **chave** é persistida, nunca a URL

A exposição que motivava a etapa — PDFs de pedido em bucket público com chave
previsível (`cozinha/pedidos/relatorio-pedido-<orderId>.pdf`, e o `orderId`
aparece na URL de toda página de detalhe) — **está fechada**.

O que sobra é mover os bytes do R2 para o Supabase Storage: consolidação de
fornecedor, sem ganho de segurança. Se for feito:

- Adicionar um driver `"supabase"` a `upload-file.service.ts`, sem mexer no `"r2"`
  (reversão vira flip de env var)
- **`upsert: true` no `upload()` não é opcional** — `order-report.service.ts:68`
  regenera o mesmo nome de arquivo para o mesmo pedido, e o Supabase Storage
  devolve **409 Duplicate** sem ele. Sem isso, toda regeneração depois da
  primeira falha
- `rclone copy r2:sgm sb:sgm --checksum` + `rclone check`. **Copiar, não mover**
- Consertar `deleteFile(bucketName, filename)` — o parâmetro de bucket tem um só
  chamador, que passa literal (`orders.service.ts:464`)

**Recomendação: deixar por último, ou não fazer.**

---

## 5. Armadilhas descobertas (não repetir)

- **O pré-voo tem um ponto cego.** `--check` ignora colunas que a produção tem e
  o schema congelado não declara. Isso é correto quando a branch está em dia com
  a `main` — e foi exatamente o que quase derrubou a produção: a `main` ganhou
  `password_changed_at` enquanto a branch estava em voo, e o baseline não a
  tinha. **Sempre `git fetch origin main` e conferir a divergência antes de
  qualquer virada.**
- **`pnpm prisma:seed` contra a produção reseta a senha do admin real para
  `admin123`** — ele faz upsert de `username: "admin"` com `update: { password }`.
- **Nunca** `prisma migrate reset` nem `db push --force-reset` contra o Supabase.
  A partir da Etapa B levam junto o RLS de todas as tabelas.
- **Nunca** `prisma migrate dev` contra o Supabase (quer shadow database).
  Rodar contra o Postgres local, commitar, deixar o `migrate deploy` aplicar.
- **Nunca** `ALTER TABLE ... FORCE ROW LEVEL SECURITY`.
- **Uma migration que falha impede o boot.** O CMD do container é
  `migrate deploy && node dist/main`, e o Prisma registra a falha com
  `finished_at = NULL` — todo deploy seguinte se recusa a rodar qualquer coisa
  até um `migrate resolve`. Por isso o SQL escrito à mão vai em arquivo
  separado, e por isso o CI passou a aplicar as migrations contra um Postgres
  real (era o único ponto do pipeline que nunca tocava um banco).
- **Nunca** criar usuário direto no banco a partir da Etapa B: ele nasce sem
  conta no Supabase Auth e não consegue entrar. Use `POST /users` ou
  `auth:provision`.
- O `.env` local tem as strings de produção **comentadas** como `# PROD_*`.
  Nada as lê. Para usar, passe na linha de comando em vez de descomentar.
- O gitignore agora é `.env.*` com exceção de `.env.example` — um `.env.bak`
  com credencial real era rastreado antes.

---

## 6. Pendências imediatas

O código da Etapa B está pronto na branch `feat/supabase-stage-b`. O que falta
é tudo fora do repositório — ver [`runbook-etapa-b.md`](./runbook-etapa-b.md).

- [ ] Definir os 6 e-mails placeholder e aplicar com `users:set-emails`
      (Lucas com o real). **Portão 1 da Etapa B.**
- [ ] Ativar chaves assimétricas de JWT no projeto Supabase (antes de qualquer
      sessão existir). **Portão 2.**
- [ ] Desligar "Allow new users to sign up" no dashboard. **Portão 3.**
- [ ] Rodar `auth:provision` até sair com código 0. **Portão 4.**
- [ ] Criar um projeto Supabase separado para desenvolvimento local.
- [ ] Desligar o auto-deploy do Vercel para `main` antes do merge.
- [ ] Confirmar backups: plano Pro com PITR de 7 dias.
- [ ] Retirar a instância MySQL de produção depois de 07/09/2026.
- [ ] Remover o serviço `db` (MySQL) de `apps/api/docker-compose.yaml` — hoje só
      serve como origem do ensaio da migração.

## 7. Comandos úteis

```bash
# subir o Postgres local (porta 5433 — 5432 costuma estar ocupada)
make db-up

# pré-voo somente leitura contra qualquer origem
pnpm --filter @sgm/api exec ts-node --transpile-only \
  prisma/migrate-mysql-to-postgres.ts --check

# preencher e-mails (idempotente, tem --dry-run)
pnpm --filter @sgm/api users:set-emails emails.csv --dry-run

# criar as contas no Supabase Auth (idempotente, tem --dry-run)
pnpm --filter @sgm/api auth:provision --dry-run

# conferir o deny-by-default do RLS (roda no CI também)
pnpm --filter @sgm/api db:verify-rls

# o que o CI roda
pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint:ci \
  && pnpm test && pnpm build:api && pnpm build:web
```

Runbooks, com portões e reversão:
[`runbook-etapa-a.md`](./runbook-etapa-a.md) (executado) ·
[`runbook-etapa-b.md`](./runbook-etapa-b.md) (pendente).
