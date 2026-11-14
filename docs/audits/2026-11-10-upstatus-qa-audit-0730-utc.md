# Auditoria independente UpStatus — 10/11/2026 07:30 UTC

## Resumo executivo

**Recomendação: `not_ready`.** A PR #132 corrigiu a derivação do endpoint API no candidato Normal e passou no workflow PR-triggered do HEAD exato. Normal #74 e Team Lite #76 também passaram nos respectivos workflows isolados. Isso não altera a produção: os userscripts implantados continuam em tópicos Realtime antigos, o primeiro setup permanece sem convite, e grants/Storage e migrations seguem bloqueando o release.

Esta rodada usou GitHub e Supabase em modo de inspeção. Não foram iniciados workflows, testes manuais, deploys, merges, migrations ou alterações de produção.

## Heads e PRs

| Ref/PR | HEAD | Base / comparação | Estado |
|---|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | — | atual |
| QA / #82 | `f43c94818d4e8a3dbb4a5458b0c47198c197347c` | master: 181 à frente, 1 atrás | open, Draft |
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | master: 883 à frente, 1 atrás | open, Draft |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official `9065bc15` | open, Draft; baseline histórico |
| #76 Team Lite | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | team-lite-official: 378 à frente, 0 atrás | open, Draft |
| #131 AUTH-03 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | Normal #74: 1 à frente, 0 atrás | open, Draft |
| #132 API Normal | `74d787ba903fc05be38586b5ad7385c3cbef34cb` | Normal #74: 4 à frente, 0 atrás | open, Draft |
| #129 Deploy Guard | `886d364d0c43af0d8aed867bf04c407478af5e8f` | team-lite-official | open, Draft |

A branch QA permanece 181 commits à frente e 1 atrás de master. O único commit de master após o merge-base é `9d40461`, documentação de preflight read-only de migrations; não contém runtime. Não fiz rebase. PRs #74, #75, #76, #82, #131 e #132 não têm submissões de review humana.

A descrição da #132 está parcialmente desatualizada: ainda cita HEAD `5c486230` e 3 commits à frente; a API atual informa HEAD `74d787ba` e comparação de 4 commits à frente. O workflow aprovado abaixo está no SHA atual.

## CI: evidência vinculada aos HEADs

| Escopo | Execução | Resultado |
|---|---|---|
| #74 Normal Validate | [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) | PASS |
| #74 Normal Signaling Smoke | [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS |
| #75 baseline histórico | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; não substitui #76 |
| #76 Team Lite Candidate Checks | [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | PASS |
| #82 QA Validate | [42769837539](https://github.com/Reekyi/UpStatus/actions/runs/42769837539) | FAIL |
| #131 AUTH-03 Smoke | [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | PASS |
| #132 API Target Candidate Validation | [42773004553](https://github.com/Reekyi/UpStatus/actions/runs/42773004553) | PASS |
| #129 Team Lite Deploy Guard | [42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) | PASS |

### Detalhes relevantes dos logs

- **Normal #74:** 136/136 verificações autenticadas; negociação WebRTC e entrega de faixas de áudio/voz/vídeo de tela; mesh de três participantes; teardown; rate limit de sinalização; recibos de leitura concorrentes; consumo atômico de convite e limpeza. O job usou o projeto isolado `bfpjtfqlnypisxljoxkb`.
- **Team Lite #76:** 110/110 verificações autenticadas; chamadas, voz, tela, mesh de três participantes; ciclo de salas abertas; recuperação de tentativas de voz; rate limit de convites por administrador; updater e isolamento de portais. Testes de offline/online e reentrada são automatizados, não teste físico de rede.
- **#131:** rate limit de emissão de convites com cinco permissões por administrador a cada 15 minutos; 24 chamadas concorrentes no primeiro bucket (5 permitidas, 19 negadas), segundo administrador isolado (5 permitidas, 1 negada), reset e limpeza. A própria PR declara que não cobre throttling de tentativas de login.
- **#132:** workflow PR-triggered com checkout completo, credenciais Git não persistidas, verificação explícita da ref `team-lite-official`, guard de build TEST e `scripts/validate.mjs`. Logs mostram regressões de signaling, setup-invite, dispatch, upload assinado cliente/servidor, chat e updater, terminando em `Validation OK: PROD 3.4.7 / TEST 3.4.7`. Não houve deploy.
- **#82:** falha herdada em `scripts/validate.mjs:26`: `production updateURL mismatch`. O novo HEAD documental não corrigiu a baseline do validator.
- **#129:** guard offline passou, mas continua Draft; enquanto não for integrado, o workflow oficial Team Lite continua perigoso.

## Integração Normal / Team Lite e publicação

### Correção confirmada na #132

A #132 altera `scripts/build.mjs` para derivar o `CLOUD_SERVER` Normal dos mesmos `PROJECT` e `PROD_FUNCTION` usados pelo backend. O validator passa a exigir que artefato e workflow de deploy apontem para a mesma função e rejeita o slug beta10 legado. O workflow de validação não contém secrets nem permissão de escrita.

Isso corrige o **candidato**. O userscript Normal atualmente implantado ainda aponta sua API para `upstatus-screen-share-3-1-1-beta10`; não houve publicação/cutover.

### Team Lite oficial continua bloqueado

O workflow `.github/workflows/deploy-production.yml` em `team-lite-official` ainda:
- expõe `workflow_dispatch`;
- carrega secrets e environment de produção;
- usa Supabase CLI `latest`;
- não verifica rigorosamente ref, SHA e projeto;
- executa `supabase functions deploy upstatus`, slug do Normal, em vez de `upstatus-team-lite`.

A #129 substitui esse workflow por um guard fail-closed, sem secrets nem capacidade de deploy. A PR continua Draft. **Não despachar o workflow oficial.**

O workflow Normal candidato é mais restrito: manual-only, exige branch master, SHA exato e projeto esperado, fixa Supabase CLI 2.122.1 e publica apenas `upstatus`. A configuração de release permanece presa a 3.4.7; não há aprovação humana de release.

## Supabase: produção e laboratório

Projetos visíveis: somente produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`, ambos ACTIVE_HEALTHY. O laboratório é isolado, mas não é um ambiente full-product TEST independente.

| Medida | Produção | Laboratório |
|---|---:|---:|
| Migrations | 7 | 39 |
| Tabelas públicas | 10 | 18 |
| Tabelas públicas com RLS | 10 | 18 |
| Policies no schema public | 0 | 0 |
| Tabelas públicas com grants diretos anon/authenticated | 9 | 0 |
| Mensagens Realtime | 39 nas últimas 24h | 0 |
| Buckets Storage | 2 | 0 |
| Linhas no rate-limit de convites | tabela ausente | 0 |

O projeto de laboratório tem duas Edge Functions de teste: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. A função `upstatus-test` v281 está no **projeto de produção**, não no projeto isolado. As 39 migrations do laboratório incluem `20261110000612_setup_invite_rate_limit_contract_test`, mas não a migration candidata de produção `20261109230000_setup_invite_rate_limit`.

### Edge Functions implantadas

Produção lista 38 funções ACTIVE, todas reportando `verify_jwt=false`. Isso não prova, por si só, que todos os handlers estejam sem autenticação; os runtimes principais usam autenticação customizada e precisam ser avaliados por rota.

| Runtime | Edge version | Userscript embutido | API do cliente | Tópico Realtime |
|---|---:|---:|---|---|
| `upstatus` | v480 | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` | beta10 |
| `upstatus-team-lite` | v15 | 3.4.30 | `upstatus-team-lite` | beta10 |
| `upstatus-test` | v281 | 3.3.28 | `upstatus-screen-share-3-1-1-beta10` | beta10 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | backend legado | — | — |

Nos três userscripts embutidos inspecionados, não há `private:true`, `realtime.setAuth()` nem configuração do transporte autenticado. Os runtimes Normal, Team Lite e TEST ainda encaminham primeiro setup para `login(req,true)`; não contêm colunas `setup_token_*`, RPC de consumo de convite ou a tabela de rate limit.

## Realtime, RLS, grants e Storage

- Os triggers PostgreSQL publicam no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os três userscripts implantados assinam `upstatus-screen-share-live-3-1-1-beta10`. O tópico de trigger e o tópico dos clientes não coincidem.
- As 39 mensagens observadas em 24h estão todas com `private=false`: 20 `db_change`, 13 `user_status`, 3 `remote_command`, 3 `remote_result`.
- `realtime.messages`: RLS habilitado, zero policies, grants SELECT/INSERT/UPDATE para anon e authenticated.
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` são `SECURITY DEFINER`, `search_path=public`, retornam `trigger` e têm EXECUTE efetivo para anon/authenticated/service_role. O Advisor gera três WARN para anon e três para authenticated. Como retornam `trigger`, não afirmei que sejam invocáveis diretamente como RPC; os riscos observados são os privilégios desnecessários e os broadcasts públicos, incluindo a linha completa da mensagem.
- Security Advisor de produção: 6 WARN e 10 INFO (RLS habilitado sem policies).
- As 9 tabelas públicas com grants a anon/authenticated mantêm DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. RLS sem policies bloqueia acesso por linha; TRUNCATE não é protegido por RLS.
- `pg_default_acl`: 24 registros e 300 itens expandidos na produção. Há defaults amplos para objetos criados por postgres/supabase_admin, inclusive grants de cliente em schemas expostos; a revisão de owner e escopo continua necessária.
- `storage.objects`: RLS habilitado, FORCE RLS false, zero policies e grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated. `chat-images` e `profile-images` são públicos, 20 MiB cada.

A configuração do Dashboard que permite ou bloqueia public access de canais Realtime não foi exposta pelo conector; não houve tentativa de inscrição externa nem exploração. Portanto, não alego acesso externo reproduzido.

## Migrations e proveniência

A produção lista sete migrations, terminando em `20261027155438 / set_upstatus_upload_limits_20mb`. Os quatro arquivos abaixo continuam 404 em `master`:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A branch Supabase gerenciada `main` está em `MIGRATIONS_FAILED`, enquanto `preview_project_status` está ACTIVE_HEALTHY. A causa não foi identificada. Não reconstruí SQLs nem apliquei migrations.

## Issues, teste manual e aprovação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): continua aberta, 0/8 critérios de aceite marcados. A auditoria não executou teste físico no Tampermonkey, queda real de internet, permissões reais de microfone/tela ou interoperabilidade instalada. Testes Playwright/CI não fecham esses critérios.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): corpo mantém checklist histórico de 16/35. O comentário dedicado QA foi atualizado separadamente; o comentário da Engenharia foi preservado.
- Não há reviews humanas nas PRs candidatas consultadas. HUMAN-REVIEW permanece pendente.

## Gates e veredito

| Gate | Estado |
|---|---|
| RT-01 | blocked |
| TEST-ISOLATION | in_progress |
| MIGRATION-PROVENANCE | blocked |
| AUTH-03 | in_progress |
| ACL-STORAGE | blocked |
| RECONNECT | pending |
| HUMAN-REVIEW | pending |

**NÃO LIBERAR.** Próximos passos: revisar #132; corrigir/neutralizar o dispatcher Team Lite via #129; planejar cutover de Realtime com canal privado/autorizado e payload mínimo; integrar setup-invite e rate limit com rollout coordenado; recuperar os quatro SQLs originais; resolver MIGRATIONS_FAILED; revisar grants/default ACL/Storage; somente depois preparar build seguro para os testes físicos da #78 e revisão humana.

## Limites e segurança da execução

Todas as consultas Supabase foram SELECT-only e todas as leituras GitHub foram GET. Não foram executados testes manuais, workflows, reruns, migrations, SQL writes, deploys, merges, releases, publicação de userscripts, alterações de secrets/flags/roles/grants/policies/ACLs ou operações destrutivas. A única escrita no repositório é este novo relatório na branch QA; a única outra escrita é a atualização do comentário QA existente na Issue #79.