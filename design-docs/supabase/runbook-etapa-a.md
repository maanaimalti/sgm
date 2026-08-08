# Runbook — Etapa A: virada MySQL → Supabase Postgres

> **Executado em 08/08/2026.** Mantido como registro do que foi feito e como
> reverter, não como trabalho pendente. O estado atual e as etapas restantes
> estão em [`00-onde-paramos.md`](./00-onde-paramos.md).

Projeto Supabase: `uhvqtymjdihoagfyaruj` (us-east-1). Baseline `0_init` já aplicado.

**Ponto de não retorno: o momento em que os usuários voltam a entrar.** Antes disso a
reversão é grátis, porque nenhuma escrita chegou no Postgres. Por isso toda a
verificação acontece *antes* de reabrir.

---

## Pré-requisitos (fora da janela)

- [ ] `apps/api/.env` com `LEGACY_DATABASE_URL` apontando para o **MySQL de produção**
      (não para o container local).
- [ ] Pré-voo verde:
      ```bash
      pnpm --filter @sgm/api exec ts-node --transpile-only \
        prisma/migrate-mysql-to-postgres.ts --check
      ```
      Ele lê a produção sem escrever nada e prova que o schema congelado
      (`prisma/legacy/schema.mysql.prisma`) ainda bate com o banco real.
      Uma coluna que o schema declara e a produção não tem falha aqui, e não no
      meio da cópia.
- [ ] Branch `feat/supabase-stage-a` mergeada em `main` e CI verde.
- [ ] Imagem anterior identificada no EasyPanel (é a reversão).

## A janela

```
T+0    EasyPanel: escalar a API para 0. Avisar no grupo.
T+5m   mysqldump completo da produção, guardado FORA da máquina.
       Esta é a fonte de verdade da reversão — não pule.
T+10m  Cópia dos dados:
         pnpm --filter @sgm/api exec ts-node --transpile-only \
           prisma/migrate-mysql-to-postgres.ts --truncate
T+?    O script roda os portões sozinho e sai com código 1 se algum falhar.
```

### Portões (o script verifica; confira o output)

| Portão | O que significa se falhar |
|---|---|
| Contagem das 20 tabelas | dado perdido — **não reabra** |
| `order_counter` = 1 linha, `id=1` | criação de pedido falha com `P2025` |
| `order_counter.value >= nº de pedidos` | `friendly_code` duplicado no próximo pedido |
| Soma de `cost_value` | dinheiro divergente |
| E-mails | **apenas aviso** — a produção não tem a coluna; a coleta acontece depois, e só bloqueia a Etapa B |

### Depois dos portões

```
T+?    EasyPanel → variáveis de ambiente:
         DATABASE_URL  = pooler SESSÃO, porta 5432 (não 6543)
         DIRECT_URL    = mesma string  ← NOVA, precisa ser adicionada
       Deploy da nova imagem.
       (O `prisma migrate deploy` do container é no-op: 0_init já está registrado.)
T+?    Smoke test — ver abaixo.
T+?    Reabrir.
```

### Smoke test

1. Login.
2. Listar pedidos.
3. **Criar um pedido** — exercita `order_counter` e a `$transaction` interativa
   através do pooler. É o teste mais importante.
4. Aprovar o pedido.
5. Gerar o PDF.
6. Buscar um produto **em letra minúscula** (ex.: `arroz`). Se voltar vazio e o
   produto existir, o `mode: "insensitive"` não subiu.
7. Conferir que `costValue` chega como número, não string.

## Reversão

Reverter a imagem no EasyPanel (a anterior tem `provider = "mysql"`) e voltar
`DATABASE_URL` para o MySQL. **~5 minutos.**

**Manter o MySQL de produção rodando por 30 dias.** Não delete a instância.

## Depois da virada

- [ ] Coletar os e-mails reais e aplicá-los no Postgres:
      ```bash
      pnpm --filter @sgm/api users:set-emails emails.csv --dry-run
      pnpm --filter @sgm/api users:set-emails emails.csv
      ```
      O script sai com código 1 enquanto houver usuário sem e-mail — é o portão
      da Etapa B.
- [ ] Backups: Supabase Pro com PITR de 7 dias.

## Nunca

- **Nunca** rodar `pnpm prisma:seed` contra a produção — ele faz upsert de
  `username: "admin"` com `update: { password }` e **reseta a senha do admin
  real para `admin123`**.
- **Nunca** rodar `prisma migrate reset` ou `prisma db push --force-reset`
  contra o Supabase — derrubam o schema e, a partir da Etapa B, levam junto o
  hook de auth e seus GRANTs.
- **Nunca** rodar `prisma migrate dev` contra o Supabase — ele quer um shadow
  database e pode resetar. Rode contra o Postgres local, commite a pasta gerada,
  e deixe o `migrate deploy` do container aplicar.
- **Nunca** `ALTER TABLE ... FORCE ROW LEVEL SECURITY` — é a única coisa que
  faria o RLS bloquear o Prisma.
