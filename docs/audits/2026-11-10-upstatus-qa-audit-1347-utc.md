# UpStatus — auditoria independente de qualidade

**Execução:** 2026-11-10T13:49:14.456Z (UTC)  
**Repositório:** `Reekyi/UpStatus`  
**Produção:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`

## Resumo executivo

**Recomendação: NOT READY.** As candidatas de proveniência dos sinais (#133 Normal e #134 Team Lite) passaram nas suítes completas acionadas por `pull_request`. A candidata Normal de AUTH-03/cutover (#89) passou no workflow de push no HEAD exato, incluindo Validate offline e integração no laboratório; o próprio guard bloqueou o cutover, corretamente, porque `release.json` ainda é 3.4.7 e as três migrations AUTH-03 não estão aplicadas em produção.

A produção continua com exposição Realtime pública, grants/default ACLs amplos, setup legado sem convite, Storage público e migrations ausentes. O laboratório está limpo e sem grants diretos nas tabelas atuais, mas mantém Default ACLs que podem conceder privilégios a objetos futuros. Nenhum teste físico de reconexão foi confirmado.

Esta auditoria fez somente consultas SELECT/catálogos e inspeções read-only no GitHub/Supabase. Os workflows de engenharia já executados gravaram fixtures temporárias exclusivamente no laboratório e seus logs/postflight confirmam limpeza; a auditoria não iniciou esses workflows nem escreveu no Supabase.

## 1. Heads reais e estado das PRs

| Referência | HEAD / base | Estado |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | branch sem proteção |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | branch sem proteção |
| QA #82 | `ce07ddcb412f5e74100d2e6fc5193a383ebcdc1a` | Draft; 190 commits à frente e 1 atrás de master |
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | aberta/Draft |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | aberta/Draft; PASS histórico |
| #76 Team Lite | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | aberta/Draft |
| #133 Normal, proveniência | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` | aberta/Draft |
| #134 Team Lite, proveniência | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` | aberta/Draft |
| #89 Normal AUTH-03/cutover | `842e45102bb08b03d3d814b85f3142982906e8d6` | aberta/Draft |
| #137 cleanup AUTH-03 | `73cf0461b8f173277a18e1d2525e8d5ea7aa5526` | aberta/Draft, baseada em um HEAD anterior de #89 |
| #127 proveniência de migrations | `4ddd703287d8b17f29e3b28880cf0b1ef533f5fb` | aberta/Draft |
| #128 aprovação humana Team Lite | `69d9c166ca92bbc3dce195ea4d714345ea9c326a` | aberta/Draft |
| #129 bloqueio do dispatcher Team Lite | `886d364d0c43af0d8aed867bf04c407478af5e8f` | aberta/Draft |
| #135 recuperação documental SQL | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` | aberta/Draft |

Não encontrei reviews humanas em #74, #75, #76, #82, #89, #128, #133 ou #134. #74/#76 são linhas candidatas antigas; #133/#134 são as linhas mais recentes para proveniência dos sinais. #75 é baseline histórico e não substitui #76.

## 2. CI, com evento e HEAD separados

### PASS em checks de Pull Request

- **Normal #133:** [Signaling Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) e [API Target Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827), evento `pull_request`, HEAD exato `8d38036`. Smoke passou com 136/136 verificações autenticadas. Incluiu chamadas WebRTC, áudio remoto, voz, compartilhamento de tela, mesh de três participantes, encerramento/cleanup, convite e rate limit. A etapa específica de emissão distribuída de convites foi SKIPPED nessa execução; AUTH-03 Normal foi testado separadamente em #89/#131.
- **Team Lite #134:** [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252), evento `pull_request`, HEAD exato `ee246aa`. Candidate Checks passou com 110/110 autenticadas, 16/16 não autenticadas, 11/11 contratos HTTP, Playwright Full-IIFE, WebRTC, voz/tela, mesh, convites, rate limits e cleanup.
- **Normal #74:** Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Signaling Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS no HEAD registrado `fb878537`. A bateria específica de rate limit distribuído de convites não foi executada nesse Smoke.
- **Team Lite #76:** [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) PASS no HEAD registrado `3b1406dd`, com 110/110 verificações autenticadas.
- **Team Lite baseline #75:** [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é PASS histórico, não valida a candidata atual.

### PASS em workflow de push, não em check PR

- **#89:** [Production Cutover Guard Candidate 42823679638](https://github.com/Reekyi/UpStatus/actions/runs/42823679638), evento `push`, HEAD exato `842e451`. Validate offline, sidecar preservation, testes de chat/signed upload, guard de cutover e integração AUTH-03 no laboratório passaram. A integração cobriu token malformado/errado/expirado/reutilizado, consumo concorrente com um vencedor, preservação de papéis, não escalonamento por nome e cleanup. O diagnóstico final bloqueou o cutover porque a versão ainda é 3.4.7 e as migrations obrigatórias não constam em produção. Não é check PR-triggered.
- **#137:** [workflow 42821890896](https://github.com/Reekyi/UpStatus/actions/runs/42821890896), evento `push`, HEAD exato `73cf046`. A regressão de cleanup tenta todas as exclusões, sempre faz postflight e agrega erros; Validate offline e integração isolada passaram. #137 é uma branch separada baseada no antigo HEAD `4224dc` de #89; não está integrada. O HEAD atual de #89 possui seu próprio helper de cleanup e também passou no workflow 42823679638.

### FAIL

- **QA #82:** [Validate 42817099198](https://github.com/Reekyi/UpStatus/actions/runs/42817099198), evento `pull_request`, HEAD `ce07ddc`, falhou em `scripts/validate.mjs:26`: `production updateURL mismatch`. O log fez checkout do merge ref do PR. A falha é uma divergência herdada do build/manifest de master, não uma falha causada pelo texto deste relatório. Não fiz rerun.

## 3. AUTH-03 e cutover Normal (#89)

O candidato #89 adiciona setup por convite de uso único: token aleatório de 256 bits, persistência somente do hash, expiração de 15 minutos, consumo atômico, resposta genérica e preservação de papéis. Remove a enumeração pública do estado de setup e a persistência de senha em texto claro no armazenamento do userscript.

O workflow candidato de produção é manual-only, exige `refs/heads/master` e checkout do SHA exato, verifica organização/projeto, fixa Supabase CLI 2.122.1, faz preflight read-only do histórico de migrations e publica primeiro o runtime API beta10 e depois a distribuição `upstatus`. Não executa `db push` nem aplica migrations automaticamente.

**O cutover está intencionalmente bloqueado:**
- `release.json` ainda é versão 3.4.7, igual à versão implantada; `verify-production-cutover.mjs` exige versão semântica estável superior a 3.4.7.
- Produção não tem as três migrations AUTH-03: `20261107010000_setup_invites`, `20261107060000_normalize_setup_invite_role`, `20261107062000_preserve_setup_invite_roles_verbatim`.
- O preflight de #89 valida versão/nome dessas três migrations via GET Management API, mas não valida hash/conteúdo de todas as migrations históricas. O token precisa do escopo `database_migrations_read`; o escopo atual não foi verificado.
- O workflow Normal não publica Team Lite. O cutover do produto completo exige uma linha Team Lite separada e revisada.

O workflow candidato não foi despachado. Nenhum deploy foi realizado.

## 4. Team Lite: dispatcher, aprovação e migrations

O workflow atualmente presente em `team-lite-official` ainda é inseguro: `workflow_dispatch`, secrets de produção no escopo do job, Supabase CLI `latest`, sem verificação adequada de ref/SHA/projeto e comando `supabase functions deploy upstatus`, que é o slug Normal, não `upstatus-team-lite`.

- **#129** substitui o dispatcher legado por um guard fail-closed sem secrets nem comando de deploy. O PR CI registrado no HEAD `886d364` passou, mas permanece Draft e não foi integrado.
- **#128** propõe um novo dispatcher em master com SHA exato do HEAD atual de `team-lite-official`, PR aprovado e mergeado, confirmação explícita `confirm_production_deploy=true`, versão estável e aprovação humana no HEAD exato. O verificador exige usuário humano, não autor, allowlist `UPSTATUS_RELEASE_REVIEWERS` e última review APPROVED no SHA atual. O PR está Draft, sem reviews; a variável de allowlist e os required reviewers do environment production não foram verificados/configurados pela auditoria.
- **#127** implementa verificação de conteúdo por Git blob SHA-1, mas o manifest contém somente as três migrations originais presentes no tree revisado. As quatro migrations remotas ausentes continuam faltando, então o preflight deve falhar fechado.
- **#135** arquiva os quatro statements recuperados do ledger de produção em `docs/migration-recovery/`, fora de `supabase/migrations/`. Cada registro tem um statement e rollback NULL. São statements executados recuperados, não arquivos originais byte a byte nem prova do commit/blob original. O PR continua Draft; Preview foi skipped e Validate herdou a falha `production updateURL mismatch`.

## 5. Supabase — produção

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002. A branch gerenciada `main` permanece `MIGRATIONS_FAILED` (preview ACTIVE_HEALTHY). Há 7 migrations remotas; as quatro versões de 23–27/10 continuam sem SQL original no tree de master.

### Edge Functions e AUTH-03

Há 38 Edge Functions ACTIVE; metadata reporta `verify_jwt=false` em todas. Isso não prova ausência de autenticação: os runtimes principais implementam autenticação customizada. Fontes implantadas inspecionadas:
- `upstatus` v480, source SHA `bb2713ce...`
- `upstatus-team-lite` v15, source SHA `2c13414a...`
- `upstatus-screen-share-3-1-1-beta10` v6, source SHA `f6c5f8a4...`
- `upstatus-test` v281, source SHA `7b5dfb12...`

Nos quatro handlers inspecionados, `POST /api/setup` continua encaminhando para `login(req,true)`. Produção não tem tabela `upstatus_setup_invite_rate_limits`, colunas `setup_token_hash/setup_token_expires_at` nem RPCs de consumo de convite/rate limit. O setup implantado continua legado, sem convite.

O helper de signed upload inspecionado chama `createSignedUploadUrl` e retorna URL pública; não inspeciona os bytes reais do objeto antes do upload. Isso é inspeção de código, não upload/exploit reproduzido.

### Realtime, RLS, grants e SECURITY DEFINER

Consulta SELECT-only em `realtime.messages`:
- **63 linhas persistidas, 63/63 `private=false`**, desde 06/11 até 10/11 13:26:48 UTC.
- Todas no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- 22 `db_change`, 5 `remote_command`, 5 `remote_result`, 31 `user_status`.
- A janela das últimas 24h continha 52 linhas; 63 é o total persistido, não a contagem de 24h.

`realtime.messages`: RLS true, FORCE RLS false, zero policies; `anon` e `authenticated` têm SELECT/INSERT/UPDATE efetivos. Os três triggers de broadcast estão anexados e habilitados em `messages`, `upstatus_state` e `users`. As funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE para anon/authenticated. O Security Advisor gera 3 WARN para anon e 3 WARN para authenticated. Por retornarem trigger, os WARNs não provam uma RPC direta invocável; os grants continuam desnecessários e o broadcast público é o risco concreto. A função de mensagens transmite `to_jsonb(OLD/NEW)` completo.

- 10 tabelas públicas com RLS e sem policies.
- 9 tabelas concedem SELECT/INSERT/UPDATE/DELETE/TRUNCATE a anon e authenticated; `upstatus_visual_config` é a exceção sem esses grants. RLS não protege TRUNCATE.
- Default ACLs: 24 registros e 300 itens ACL expandidos no total. Em `public` e `storage`, defaults de `postgres` e/ou `supabase_admin` concedem privilégios de tabela (incluindo TRUNCATE), EXECUTE em funções e privilégios de sequência a papéis clientes.
- Storage: `chat-images` e `profile-images` públicos, 20 MiB cada; zero policies em `storage.objects`.
- Security Advisor: 10 INFO de RLS sem policy, 3 WARN anon + 3 WARN authenticated. Performance Advisor e Health Advisor sem findings nesta consulta.

## 6. Supabase — laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`): ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. Tem 39 migrations e duas Edge Functions de teste (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3). Não há terceiro projeto full-product TEST.

Snapshot SELECT-only:
- 18 tabelas públicas, todas com RLS; zero grants diretos de tabela para anon/authenticated.
- Zero usuários `__auth_test_*`, zero linhas de rate limit, zero mensagens Realtime, zero buckets Storage.
- Zero policies em `storage.objects`; nenhum bucket.
- Default ACLs: 25 registros e 277 itens ACL expandidos. Ainda há defaults amplos para `supabase_admin` em `public` e `postgres` em `storage`, concedendo privilégios a anon/authenticated para objetos futuros. As tabelas atuais não têm grants diretos, mas o padrão de criação continua permissivo.
- Security Advisor: 18 INFO de RLS sem policy e nenhum WARN de SECURITY DEFINER observado.

O CI #89 executou fixtures temporárias com allowlist explícita para o projeto isolado e opt-in de mutação; o log e o SELECT pós-teste confirmam cleanup. Esta auditoria não executou fixture, migration ou escrita.

## 7. Issues, aceitação física e governança

- **Issue #78:** aberta, 0/8 critérios de aceite. Os oito itens estão desmarcados: Normal/Team Lite sem F5, reentrada, novas chamadas, ausência de áudio/peers/polling duplicados, participantes restantes, CI e teste manual. Último comentário de engenharia é de 08/11; nenhum teste físico foi confirmado.
- **Issue #79:** aberta. O corpo ainda contém snapshot antigo de 07/11 (16/35 itens); os comentários de QA e Engenharia são mais recentes. Atualizei somente o comentário dedicado QA, preservando o comentário da Engenharia e sem duplicatas.
- `master` e `team-lite-official` retornam `protected=false`. Não encontrei reviews humanas nas PRs de release examinadas.
- O arquivo `docs/RELEASE_READINESS.md` foi lido integralmente nesta execução via blob SHA `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres, 8.410 linhas. O último checkpoint gravado no documento é 08/11/2026 15:30 BRT / 18:30 UTC; o documento não reflete os resultados de 10/11 descritos neste relatório.

## 8. Gates

| Gate | Estado | Evidência / motivo |
|---|---|---|
| RT-01 | **blocked** | 63/63 mensagens persistidas públicas; nenhum cutover privado/autorizado em produção. |
| TEST-ISOLATION | **in_progress** | Laboratório isolado e limpo, mas Default ACLs ainda amplas e não existe terceiro projeto full-product TEST. |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes; #135 recupera statements, não os arquivos originais; #127 manifest parcial. |
| AUTH-03 | **in_progress** | Testado no candidato/lab; produção não tem migrations, tabela, colunas ou RPC. |
| ACL-STORAGE | **blocked** | Grants/Default ACLs amplas, 2 buckets públicos e zero policies Storage. |
| RECONNECT | **pending** | Issue #78 0/8; depende de teste físico sem F5. |
| HUMAN-REVIEW | **pending** | PRs Draft, sem reviews; allowlist/env protection não verificados. |

## 9. Próximas ações recomendadas

1. Manter o release bloqueado. Não despachar workflows de produção.
2. Integrar/revalidar os checks completos de #133/#134 e manter a proveniência dos sinais fora do payload.
3. Resolver transporte Realtime privado/autorizado no servidor e torná-lo default somente após validação de membership, destinatário, replay/expiry e rate limit.
4. Completar migrações originais/proveniência e validar o preflight read-only contra produção somente após revisão/autorização; não aplicar migrations automaticamente.
5. Endurecer Default ACLs, grants e Storage com owners autorizados; definir política de buckets e validação de bytes.
6. Integrar #129/#128 somente após revisão; confirmar allowlist de reviewers e proteção do environment.
7. Corrigir o validator herdado da QA sem relaxar a checagem de updateURL.
8. Só depois da integração e revisão, executar os oito testes físicos da #78.

## Limites e segurança

Não houve escrita SQL, migration, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL, dispatch de workflow ou publicação de userscript pela auditoria. Nenhum teste manual foi realizado. A única escrita desta execução é este relatório documental na branch QA e a atualização do comentário QA da Issue #79; o comentário da Engenharia foi preservado.
