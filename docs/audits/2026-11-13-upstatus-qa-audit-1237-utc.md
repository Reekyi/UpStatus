# Auditoria independente UpStatus — 2026-11-13 12:37 UTC

**Resultado:** NÃO LIBERAR  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, diffs, workflows, logs já existentes, fontes de Edge Functions, migrations, catálogos PostgreSQL e Security Advisor. Não foram disparados workflows, testes mutáveis ou requisições de produto. Não houve teste manual.

## 1. Heads e integridade documental

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `cdc9e34bacec6d3d7bf956ae181535784d3a31f2` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 / QA | `cdc9e34bacec6d3d7bf956ae181535784d3a31f2` |
| PR #160 | `d36eae7c78de74bd9938fd38d558752f0bf214cb` |
| PR #161 | `a1d8dc8409ae894a5fb02acd2014749b7281868f` |
| PR #162 | `185970def568ffdc9ec08167dc5b846461e8d471` |

Comparações atuais:
- QA: 278 commits à frente e 1 atrás de master; os arquivos divergentes retornados são documentais.
- #74: 887 commits à frente e 1 atrás de master.
- #75: 59 commits à frente de team-lite-official.
- #76: 386 commits à frente de team-lite-official.
- #82 contém 278 commits e 136 arquivos documentais.
- #161 tem 10 commits/9 arquivos; #162 tem 4 commits/6 arquivos e é filho direto da #161.

Li integralmente `docs/RELEASE_READINESS.md` pelo blob GitHub: **1.045.105 bytes e 8.410 linhas**. O último checkpoint técnico dentro do arquivo continua em **08/11/2026 18:30 UTC**. O arquivo original não foi alterado.

As PRs #74, #75, #76, #82, #160, #161 e #162 estão abertas/Draft e a API de reviews retornou zero reviews humanas para todas. A API de rulesets retornou lista vazia; o endpoint de branch protection retornou 403 para o conector, portanto a proteção individual das branches não pôde ser confirmada.

## 2. CI e testes existentes

| PR | Evidência | Resultado e limite |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS. Smoke confirma 136/136 checks autenticados e WebRTC call/voice/screen, mesh de 3 membros, teardown e rate limits. **A etapa de rate limit de emissão de setup-invite foi SKIPPED** porque o harness ainda não existe nesse HEAD. |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico no HEAD exato de 03/11; não substitui a candidata atual #76. |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS: 110/110 checks autenticados; browser Chromium com call/voice/screen e mesh de 3 membros; rate limit de sinalização, read receipts, setup-invite de uso único e rate limit de emissão; Playwright full-IIFE com stubs de GM/Tampermonkey. |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | [Validate 43419606017](https://github.com/Reekyi/UpStatus/actions/runs/43419606017) | **FAIL** no HEAD `cdc9e34`, evento `pull_request`: `production updateURL mismatch` em `scripts/validate.mjs:26`. |
| [#160 rate limit Normal](https://github.com/Reekyi/UpStatus/pull/160) | [Smoke 43399500463](https://github.com/Reekyi/UpStatus/actions/runs/43399500463) | PASS no HEAD exato; adiciona rate limit distribuído de emissão de convites. É uma linha paralela à #161. |
| [#161 Normal API + rate limit](https://github.com/Reekyi/UpStatus/pull/161) | [Smoke 43407101808](https://github.com/Reekyi/UpStatus/actions/runs/43407101808) | PASS no HEAD exato, evento `pull_request`: 136/136 autenticados, setup-invite de uso único e rate limit distribuído de emissão; browser call/voice/screen e mesh. Alinha API e updater Normal à função `upstatus`. |
| [#162 HTTP 409 voz](https://github.com/Reekyi/UpStatus/pull/162) | [Workflow 43422554676](https://github.com/Reekyi/UpStatus/actions/runs/43422554676) | PASS em evento **push**, não `pull_request`. Contrato offline, regressão estática e Validate offline completo. Não chama a Edge Function implantada. |

### Classificação importante da #162

A #162 extrai `voiceOpenErrorStatus()`, inclui `VOICE_ATTEMPT_ALREADY_ACTIVE => 409`, verifica estaticamente que a rota importa e usa o helper, e cria objetos `Response` locais para os casos 400/404/410/409/500. Isso é um **teste unitário/contratual offline com verificação estática de wiring**, não um E2E HTTP da rota Deno nem uma chamada real ao Supabase. O workflow novo é somente `push` na branch da candidata, então não constitui check de PR disparado por `pull_request`.

O comentário da Engenharia registra que a primeira execução falhou por checkout raso e a execução final passou após `fetch-depth: 0`. A PR permanece Draft, sem review. O log termina com `Validation OK: PROD 3.4.7 / TEST 3.4.7`; a versão Normal ainda não foi incrementada.

## 3. Workflows e publicação

### Normal

- O workflow herdado de master ainda usa CLI `latest` e mantém release estável em 3.4.7.
- A linha #74 melhora o workflow: checkout do SHA exato, exige master, confere projeto de produção e fixa CLI 2.122.1.
- A #161 alinha o API target e o updater do Normal à função `upstatus`, evitando o descompasso anterior com beta10.
- O Smoke da #74 não cobre o rate limit de emissão de convites; a #161 inclui o harness e passa essa etapa.

### Team Lite

O workflow `.github/workflows/deploy-production.yml` tanto em `team-lite-official` quanto na candidata #76 continua executando:

`supabase functions deploy upstatus`

O destino correto para Team Lite é `upstatus-team-lite`. O workflow também usa CLI `latest`, não fixa projeto esperado nem valida o SHA aprovado. **Não despachar.**

O workflow candidato de TEST é mais seguro: manual-only, rejeita o projeto de produção e o laboratório de sinalização, exige project ref dedicado e fixa CLI 2.122.1. Porém faz checkout de `develop`, não da branch candidata, e o terceiro projeto ainda não existe. Não é autorização para publicar.

### QA e voz

O Validate da #82 continua falhando em contrato de updater. O workflow novo da #162 é push-only; o teste verde não está associado a um evento de PR. Nenhum workflow foi disparado pela auditoria.

## 4. Supabase — projetos, Edge Functions e migrations

A organização contém somente dois projetos:
- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe ambiente full-product TEST independente.

Produção:
- 38 Edge Functions ACTIVE; `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281.
- 12 funções com prefixo `upstatus-test` (incluindo backups/betas) continuam ACTIVE no projeto de produção.
- Nenhuma função `upstatus-signal` existe em produção.
- Todas as funções listadas reportam `verify_jwt=false`; isso não prova falha por si só, mas exige que cada handler mantenha autenticação própria correta.

Laboratório:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.
- O pacote implantado `upstatus-signal-test` v32 não contém `voice-status.mjs`; o handler mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`, que cai no fallback 500. A correção da #162 ainda não está no runtime implantado.

Migrations:
- Ledger de produção: 7 migrations.
- Diretório canônico `supabase/migrations` em master: 3 arquivos SQL.
- Os quatro registros adicionais do ledger são visual config, filename de mensagem, MIME types de documentos e limites de upload.
- Laboratório: 39 migrations.
- Branch gerenciada Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

## 5. AUTH-03, identidade e autorização implantadas

Consulta agregada de produção: 5 usuários, zero password hashes vazios, zero roles vazias e cinco nomes distintos. O schema de `users` possui somente PK em `id`; não há constraint UNIQUE em `name`.

Inspeção das fontes implantadas Normal v480 e Team Lite v15:
- `POST /api/setup` chama `login(req,true)` sem token de primeiro acesso.
- Se a conta não tem senha, o setup permite definir uma senha; se a role está vazia, o fallback promove Ricardo, Lohan e Guilherme a `implementation_admin` pelo nome.
- `POST /api/chat/clear` verifica somente `name === "Ricardo"`, não uma role/proprietário persistidos.
- `upstatus_sessions` e `upstatus_profiles` continuam identificados por `user_name`, sem `user_id`.

Produção não tem colunas `setup_token_*`, tabela de rate limit de setup-invite ou RPC de consumo de convite. O laboratório tem as quatro colunas de setup-token e a tabela `upstatus_setup_invite_rate_limits`, além das tabelas de rate limit de sinalização. AUTH-03 foi validado no laboratório/candidatas, não implantado em produção.

## 6. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- 10 tabelas `public` com RLS e zero policies.
- 9 dessas tabelas concedem privilégios amplos a anon e authenticated: 63 grant rows por papel, incluindo 9 grants TRUNCATE por papel. `upstatus_visual_config` é a exceção sem esses grants.
- 120 entradas de Default ACL para anon/authenticated, distribuídas entre objetos de postgres/supabase_admin e schemas public/storage/graphql/graphql_public.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role. As funções retornam `trigger`; não foi demonstrada invocação RPC direta. O grant amplo permanece desnecessário e o search_path deve ser endurecido.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; anon/authenticated têm SELECT/INSERT/UPDATE.
- Snapshot de 14 dias: 125 mensagens, todas `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; última em 12/11 20:16:43 UTC.
- Buckets `chat-images` e `profile-images` públicos, limite 20 MiB cada, 168 e 20 objetos, respectivamente; zero policies próprias em `storage.objects`.
- Security Advisor: 6 WARN e 10 INFO.

### Laboratório

- 18 tabelas `public` com RLS e zero policies; nenhuma delas concede grants diretos a anon/authenticated nas tabelas public consultadas.
- Três funções de broadcast SECURITY DEFINER com `search_path` vazio e EXECUTE somente para service_role.
- `realtime.messages` sem linhas e sem policies, mas ainda com grants SELECT/INSERT/UPDATE a anon/authenticated.
- Nenhum bucket ou objeto Storage.
- Default ACLs ainda amplas em storage e nos schemas GraphQL/public criados por supabase_admin.
- O laboratório é um ambiente de signaling/auth, não um ambiente completo do produto.

**Limite:** a configuração Dashboard de “Allow public access” do Realtime não foi exposta pelo conector; não foi enviado broadcast de teste nem tentativa de exploração. O achado é a configuração/código não autenticado observada, não uma exploração reproduzida.

## 7. Issues, aceitação física e Control Center

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): permanece OPEN, **0/8** critérios físicos aprovados. Não houve teste Tampermonkey/browser físico, queda real de internet, reconexão sem F5, permissões reais de microfone/tela ou interoperabilidade instalada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16 itens marcados e 19 pendentes no corpo. O comentário QA existente foi atualizado; o comentário da Engenharia foi preservado.
- O JSON do Control Center contém `gate_updates` e `activity_updates`; nenhuma duplicata foi criada.

Gates desta execução:
- RT-01: blocked.
- TEST-ISOLATION: blocked.
- MIGRATION-PROVENANCE: blocked.
- AUTH-03: blocked.
- ACL-STORAGE: blocked.
- RECONNECT: pending, aguardando confirmação física de Ricardo.
- HUMAN-REVIEW: pending, sem aprovação explícita.

## 8. Bloqueios e próximos passos

1. Consolidar #161 + #162 sobre a linha #74, preservando convite único, rate limit, API/updater alinhados e contrato 409.
2. Tornar o workflow #162 um check de PR e acrescentar E2E HTTP real no laboratório para `/room/open`.
3. Criar ambiente full-product TEST separado; só então planejar a substituição do runtime TEST legado.
4. Implantar endpoint de sinalização autenticada em produção, validar no ambiente isolado e somente depois planejar cutover; não habilitar flag antes disso.
5. Corrigir workflow oficial Team Lite para slug correto, SHA/projeto fixos e CLI pinada.
6. Migrar autorização/sessões/perfis para identidade imutável e aplicar AUTH-03 em produção após revisão.
7. Fechar grants, Default ACL, SECURITY DEFINER e políticas/limites de Storage; recuperar proveniência das quatro migrations ausentes e diagnosticar `MIGRATIONS_FAILED`.
8. Executar os oito testes físicos da #78 e obter review/aprovação humana do SHA final.

**Ação pendente de Ricardo:** decidir se autoriza o provisionamento de um terceiro projeto Supabase full-product TEST. O custo/billing não foi verificado; nenhum projeto foi criado.

## 9. Limites e segurança desta execução

Todas as consultas SQL foram SELECT-only. Foram inspecionados logs de CI já existentes; nenhum workflow foi disparado, nenhum teste local/HTTP foi executado, nenhuma fixture foi criada e nenhum teste manual foi simulado. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva. A única escrita é este novo relatório append-only na branch QA e a atualização do comentário QA existente na Issue #79.
