# Runbook — Etapa B: JWT próprio → Supabase Auth

> **Não executado.** Este é o plano da virada. O estado geral da migração está
> em [`00-onde-paramos.md`](./00-onde-paramos.md); o registro da Etapa A está em
> [`runbook-etapa-a.md`](./runbook-etapa-a.md).

Projeto Supabase: `uhvqtymjdihoagfyaruj` (us-east-1). Branch
`feat/supabase-stage-b`, 12 commits.

**Ponto de não retorno: o primeiro login bem-sucedido pela tela nova.** Antes
disso, reverter é a imagem anterior no EasyPanel mais o deployment anterior no
Vercel. Depois, cada senha trocada pelo Supabase deixa de existir no
`users.password` retido, e voltar significa perder essas trocas.

Diferente da Etapa A, **nenhum dado de negócio se move**. As duas migrations são
aditivas e não precisam ser desfeitas numa reversão. O risco não está no banco:
está em API e web precisarem sair juntos, em duas plataformas.

---

## Pré-requisitos (fora da janela)

- [ ] **Portão 1 — e-mails.** Todos os 7 usuários precisam ter e-mail:
      ```bash
      pnpm --filter @sgm/api users:set-emails emails.csv --dry-run
      pnpm --filter @sgm/api users:set-emails emails.csv
      ```
      O Lucas com o e-mail real; os outros seis com
      `<username>@sgm.icmalagoas.org.br`, trocado depois pela tela `/usuarios`.
      *Se falhar:* o provisionamento não tem o que criar e a Etapa B não começa.

- [ ] **Portão 2 — chaves assimétricas.** Dashboard → Authentication → JWT Keys
      → criar uma chave **ECC P-256** e promovê-la a atual. Conferir:
      ```bash
      curl -s https://uhvqtymjdihoagfyaruj.supabase.co/auth/v1/.well-known/jwks.json \
        | jq '.keys | length'
      ```
      Tem que devolver ≥ 1. *Se devolver 0:* a API não consegue verificar
      nenhum token e **toda requisição dá 401**, sem nada na resposta apontando
      a causa. Faça **antes de qualquer usuário ter sessão** — rotacionar
      invalida o que já foi assinado. O `getClaims()` do middleware também
      depende disso: com chave simétrica ele cai num round-trip a
      `/auth/v1/user` a cada navegação.

- [ ] **Portão 3 — cadastro público desligado.** Authentication → Providers →
      Email → **"Allow new users to sign up" OFF**. *Se ficar ligado:* qualquer
      pessoa com a `NEXT_PUBLIC_SUPABASE_ANON_KEY` — que está no bundle — cria
      conta em `auth.users`. Ela não entra em nada, porque `validate()` exige
      uma linha correspondente em `public.users`, mas polui o diretório e
      queima o rate limit do projeto.

- [ ] Ainda em Authentication:
      - **Confirm email OFF** — não há caixa postal nos e-mails provisórios.
      - **Minimum password length = 6**, igual ao `login-schema.ts`,
        `CreateUserDto` e `ChangePasswordDto`. *Se divergir:* o formulário
        aceita e o servidor rejeita, com mensagem em inglês.
      - **Site URL** = domínio do Vercel.
      - **Refresh token rotation ON**.

- [ ] **Portão 4 — provisionamento.** Com `SUPABASE_SERVICE_ROLE_KEY` na linha
      de comando (não no `.env`):
      ```bash
      pnpm --filter @sgm/api auth:provision --dry-run
      pnpm --filter @sgm/api auth:provision
      ```
      Cria as contas com o hash bcrypt atual, então **ninguém troca de senha**.
      É idempotente. Sai com código 1 enquanto houver usuário sem
      `supabase_user_id`. *Se falhar:* os usuários dessa lista não conseguem
      entrar de jeito nenhum depois do deploy.

- [ ] `git fetch origin main` e conferir a divergência. Na Etapa A foi
      exatamente isso que quase derrubou a produção: a `main` ganhou
      `password_changed_at` enquanto a branch estava em voo.

- [ ] CI verde na branch, **incluindo o job novo** que aplica as migrations
      contra um Postgres real e roda o `db:verify-rls`.

- [ ] Variáveis novas preparadas nas duas plataformas:
      ```
      EasyPanel   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
      Vercel      NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
      ```
      **`JWT_SECRET` continua setado no EasyPanel.** Não apague — é o que faz a
      imagem anterior subir numa reversão.

- [ ] **Vercel → Settings → Git → auto-deploy de `main` desligado**, e o
      preview da branch já buildado. *Sem isso*, o merge dispara o deploy da
      API e o do web ao mesmo tempo e você perde o controle da ordem: durante a
      corrida, ou o web novo fala com a API velha (token ES256 contra
      verificação HS256 → 401 em massa), ou o inverso.

- [ ] Imagem anterior identificada no EasyPanel.

## A janela

```
T+0    Avisar no grupo. Não precisa escalar a API para 0 — nenhum dado se move.
T+2m   Merge do PR em main. deploy-api.yml roda o CI e dispara o EasyPanel.
T+8m   EasyPanel verde. O container já aplicou as duas migrations no boot.
       → portões abaixo. NÃO promova o web antes de todos passarem.
T+12m  Vercel: "Promote to Production" no preview já buildado.
T+14m  Smoke test.
T+20m  Reabrir.
```

### Portões (depois do deploy da API, antes de promover o web)

| Portão | O que significa se falhar |
|---|---|
| `prisma migrate status` = up to date | uma migration falhou; **a API não subiu** e não sobe até resolver — o CMD é `migrate deploy && node dist/main`, então o container fica em loop |
| `pnpm --filter @sgm/api db:verify-rls` | alguma tabela ficou sem RLS: com a anon key no bundle, ela é legível por qualquer um pelo PostgREST |
| o mesmo script, linha `FORCE` | com FORCE o Prisma passa a ver zero linhas — a aplicação inteira fica vazia **sem um único erro** |
| `curl .../jwks.json \| jq '.keys \| length'` ≥ 1 | 401 em toda requisição |
| `SELECT count(*) FROM users WHERE supabase_user_id IS NULL` = 0 | esses usuários não conseguem entrar de jeito nenhum |
| `curl -H "Authorization: Bearer <token>" .../auth/me` com `roles` e `departments` não vazios | o vínculo daquele usuário não foi gravado; ele entra e vê o menu em branco |

### Smoke test

1. Entrar com **e-mail** (não username).
2. Conferir que o menu aparece **preenchido na primeira renderização**. Se
   piscar, o `AuthGate` não subiu.
3. Listar pedidos. **Criar um pedido** — exercita `GetDepartmentId` **sem o
   header `departmentId`**, que o web parou de mandar. É o teste que prova que
   a remoção foi segura.
4. Gerar o PDF.
5. `/usuarios`: criar um usuário novo e entrar com ele numa aba anônima.
6. `/usuarios`: trocar um e-mail provisório por um real, **sair e entrar com o
   novo e-mail**. Prova que o `email_confirm: true` foi aplicado — sem ele a
   troca fica pendente esperando um link que nunca chega.
7. Trocar a própria senha; conferir que a sessão cai e que a nova senha entra.
8. Sair pelo menu; conferir no servidor que a inscrição de push sumiu (prova
   que o `unsubscribeFromPush()` rodou **antes** da sessão cair).
9. **O teste que justifica a etapa:** deixar uma aba aberta por mais de uma
   hora com um formulário preenchido, voltar e salvar. Não pode expulsar. Para
   forçar: devtools → apagar o cookie do access token mantendo o refresh →
   recarregar.
10. Abrir o app instalado (PWA) e conferir que `/sw.js` responde 200 e não um
    redirect para `/`.

## Reversão

EasyPanel: voltar para a imagem anterior — `JWT_SECRET` continua setado e
`users.password` continua preenchido, então o login legado volta a funcionar.
Vercel: "Rollback" no deployment anterior. **~5 minutos.**

As contas em `auth.users` podem ficar: são aditivas e o provisionamento é
idempotente. **As duas migrations não precisam ser desfeitas** — a coluna é
nullable e o RLS não afeta a imagem antiga, que também conecta como `postgres`.
Não precisar reverter migration é exatamente o motivo de a Etapa B ter sido
desenhada com coluna de ligação em vez de reescrever as PKs.

**Sinais de alerta nas primeiras 48h:**

| Sintoma | Causa |
|---|---|
| 401 em tudo | JWKS vazio (chaves assimétricas não ativadas) ou `SUPABASE_URL` com barra final |
| Menu de uma pessoa em branco | `supabase_user_id` não gravado para ela |
| Menu de todo mundo em branco | `/auth/me` respondendo 429 — o `@SkipThrottle()` não subiu |
| Logouts aleatórios | middleware não devolvendo o `NextResponse` com os cookies |
| Listas vazias em tudo, sem erro | `FORCE ROW LEVEL SECURITY` ligado em alguma tabela |

## Depois da virada

- [ ] Trocar os 6 e-mails provisórios por reais, pela tela `/usuarios`.
      Achar quem falta: `WHERE email LIKE '%@sgm.icmalagoas.org.br'`.
      **Depois de trocar, usar "Reenviar convite"** em cada um, para que a
      pessoa defina a própria senha. Enquanto o endereço for provisório o
      botão fica desabilitado — não existe caixa postal do outro lado.
- [ ] Em 14 dias: remover `departmentId` de `allowedHeaders` no `main.ts`.
- [ ] Em 90 dias: `DROP COLUMN users.password` e `users.password_changed_at`;
      tirar `JWT_SECRET` do EasyPanel; avaliar remover `bcrypt` (ainda usado
      pelo `prisma/seed.ts`).
- [ ] Retirar a instância MySQL de produção depois de 07/09/2026.
- [ ] Abrir o PR de follow-up com o setup de teste do `apps/web`. O
      `decideRedirect` é a função mais arriscada desse lado: se ela errar,
      todo link de convite morre antes de ser resgatado.

## Convites por e-mail (só depois da virada)

Nada aqui é necessário para a virada dar certo — os 7 usuários migrados
continuam com senha própria e `must_set_password = false`. Isto é o portão da
funcionalidade de convite, que entra num deploy separado.

- [ ] **Portão 5 — SMTP próprio.** Authentication → Emails → SMTP Settings.
      Testar com um convite para um endereço externo de verdade.
      *Se faltar:* o Supabase se recusa a entregar para qualquer endereço fora
      da equipe da organização, responde "Email address not authorized", e o
      convite some sem erro visível para o admin.
- [ ] **Portão 6 — templates.** Authentication → Emails → Templates, em
      **Invite user** e **Reset password**, trocar o link por:

      {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha

      (`type=recovery` no template de redefinição.)
      *Se ficar no `{{ .ConfirmationURL }}` padrão:* um convite gerado pelo
      servidor não pode usar PKCE, então o link volta com os tokens no
      fragmento da URL. O middleware nunca enxerga um fragmento, e o
      `createBrowserClient` é fixado no fluxo PKCE e recusa a sessão com
      "Not a valid PKCE flow url" — a pessoa vê uma tela em branco.
- [ ] **Portão 7 — Site URL.** Authentication → URL Configuration → Site URL =
      o domínio de produção do Vercel, **sem barra no final**. O template acima
      depende dele: com barra sobrando o link vira `//auth/confirm`.
- [ ] Smoke test: criar usuário em `/usuarios/novo` (não existe mais campo de
      senha) → o e-mail chega → clicar → `/definir-senha` → definir → **a
      sessão cai** (o Supabase revoga todas as sessões quando a senha é
      trocada pela API admin) → entrar com a senha nova.
- [ ] Smoke test: "Reenviar convite" em alguém que ainda não aceitou (chega um
      convite) e em alguém que já aceitou (chega um link de redefinição).
- [ ] Sem SMTP, o caminho de emergência continua sendo "Redefinir senha" na
      tela `/usuarios`: o admin digita uma senha, entrega em mãos, e a pessoa
      é obrigada a trocar por uma própria no primeiro acesso.

## Autorização no token (depois dos convites)

Move papéis e setores de `public.roles` / `_roleTouser` / `_departmentTouser`
para `auth.users.app_metadata`. É o que destranca RLS de verdade e o Realtime
da Etapa D.

**Dois deploys, nesta ordem.** Não junte: o primeiro é inócuo e o segundo é o
que muda o comportamento, e é bom poder olhar o `app_metadata` gravado antes de
passar a depender dele.

**Deploy 1 — escrever nos dois lugares.** Só API. `create` e `update` passam a
gravar `app_metadata` além das tabelas. Nada lê ainda, então nada muda.

- [ ] Deploy da API.
- [ ] `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @sgm/api auth:sync-roles --dry-run`
- [ ] O mesmo sem `--dry-run`. Precisa sair com 0: se sobrar alguém sem
      `supabase_user_id`, rode `auth:provision` antes.
- [ ] Conferir no SQL Editor:
      `select email, raw_app_meta_data from auth.users order by email;`
      Todo mundo com `app_user_id`, `roles` e `department_ids`.
- *Reversão:* voltar o deploy. O `app_metadata` fica escrito e ninguém lê.

**Deploy 2 — ler do token e apagar as tabelas.**

- [ ] Dashboard → Authentication → Sessions → **Access token (JWT) expiry para
      900s**. Revogar sessão mata o refresh, mas não invalida um access token
      já emitido: esse é o tamanho da janela em que um papel removido ainda
      vale. O Supabase não recomenda abaixo de 300s.
- [ ] **Avisar que todo mundo vai precisar entrar de novo, uma vez.** Os tokens
      emitidos antes do `auth:sync-roles` não têm as claims, e a partir deste
      deploy eles passam a dar 401 — não existe mais consulta ao banco para
      cair de volta. Com sete pessoas isso é um recado no grupo; se um dia
      forem setenta, vale reintroduzir o fallback temporário no
      `jwt.strategy` e separar em mais um deploy.
- [ ] Deploy da API. A migration `20260823140000_drop_role_tables` derruba
      `roles`, `permissions` e as três tabelas de junção junto.
- [ ] Dashboard → Authentication → Hooks → **desligar** o *Customize Access
      Token (JWT) Claims*. Faça **antes** de aplicar a migration se puder: se a
      função sumir enquanto o hook ainda aponta para ela, o GoTrue falha ao
      emitir token e ninguém entra. (A migration `20260823130000` derruba a
      função.)
- [ ] Smoke test: entrar; conferir que o menu aparece com os papéis certos;
      trocar o papel de alguém em `/usuarios` e confirmar que a sessão dessa
      pessoa cai; criar um pedido e ver a notificação chegar em quem aprova
      (é o fan-out que deixou de ser um JOIN).
- *Reversão:* voltar o deploy e religar o hook. Recriar as tabelas é fácil;
  repovoá-las não. Depois deste passo o `app_metadata` é a **única** cópia de
  quem é o quê — o backup do dia é o plano B, não a migration.

Depois disso:

- [ ] Tirar `prisma/migrate-mysql-to-postgres.ts` junto com o MySQL.
- [ ] Políticas de RLS de verdade, agora que dá: `auth.jwt() -> 'app_metadata'`
      carrega `roles` e `department_ids`. Ficou fora deste trabalho de
      propósito — nada lê pelo PostgREST ainda, e o Prisma conecta como dono.

## Nunca

- **Nunca** `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. É a única coisa que faz
  o RLS bloquear o Prisma, e o sintoma é a aplicação inteira devolver listas
  vazias sem um único erro.
- **Nunca** apontar `DATABASE_URL` para um role que não seja dono das tabelas.
  Mesmo sintoma, mesma ausência de erro.
- **Nunca** deixar a `SUPABASE_SERVICE_ROLE_KEY` chegar numa variável
  `NEXT_PUBLIC_*`. Ela ignora RLS e ignora todo `@Roles` — vaza o banco inteiro
  para quem abrir o devtools.
- **Nunca** criar uma chave RSA no dashboard sem acrescentar `"RS256"` ao
  `algorithms` do `jwt.strategy.ts`: todo token novo passa a dar 401.
- **Nunca** criar usuário direto no banco. Ele nasce sem conta no Supabase Auth
  e não consegue entrar. Use `POST /users` (a tela `/usuarios`) ou o
  `auth:provision`.
- **Nunca** apagar as tabelas de papéis antes de o `auth:sync-roles` ter
  rodado e de os tokens antigos terem expirado. Depois do DROP, o
  `app_metadata` é a única cópia — não há de onde recuperar sem backup.
- **Nunca** editar `app_metadata` pelo dashboard achando que é cosmético: é de
  lá que a autorização é lida. Use `/usuarios` ou `pnpm users:set-roles`.
- **Nunca** convidar um endereço `@sgm.icmalagoas.org.br`. Não existe caixa
  postal atrás dele: o e-mail volta e o rate limit de envio do projeto é
  queimado à toa. A API recusa, e o botão na tela fica desabilitado.
- **Nunca** rodar `pnpm prisma:seed` contra a produção — ele faz upsert de
  `username: "admin"` e **reseta a senha do admin real para `admin123`**.
- **Nunca** rodar `prisma migrate reset` ou `prisma db push --force-reset`
  contra o Supabase.
- **Nunca** rodar `prisma migrate dev` contra o Supabase — ele quer um shadow
  database e pode resetar. Rode contra o Postgres local, commite a pasta
  gerada, e deixe o `migrate deploy` do container aplicar.
