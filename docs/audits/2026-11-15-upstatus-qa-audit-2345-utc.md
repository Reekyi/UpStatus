# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-15 23:45 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`  
**Escopo:** PRs #74, #75, #76, #82 e candidatas relacionadas #161, #167, #168, #170; Issues #78 e #79; refs, workflows, bundles/runtimes, migrations, RLS, grants, default ACLs, SECURITY DEFINER, Realtime, Storage e Edge Functions.

## Método e limites

- Leitura do `docs/RELEASE_READINESS.md` na branch QA. O último snapshot interno do documento é **2026-11-15 06:30 UTC**, portanto não representa o estado desta execução.
- Heads obtidos pelas refs/commits do GitHub e comparação QA versus master.
- PR metadata, diffs, reviews, runs e logs de jobs consultados sem iniciar novos workflows.
- Supabase consultado por catálogos, inventários de migrations, Edge Functions, advisors e logs. Todas as consultas SQL foram `SELECT`/consultas de catálogo.
- **Nenhum teste foi executado novamente nesta rodada.** Os resultados CI abaixo são execuções históricas nos SHAs indicados.
- Nenhum teste manual foi realizado: não havia perfil Tampermonkey autenticado, sessão Sale Smartly nem dispositivos reais de microfone/captura de tela disponíveis.
- Não houve escrita no Supabase, deploy, merge, migration, release, publicação de userscript, alteração de secret/flag/permissão ou operação destrutiva.

## 1. Heads reais

| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `6acccf0180c1620bb9756188cf6e8c2086fd5230` |

A QA está **351 commits à frente e 1 atrás de master**. Nenhum rebase foi feito. O rulesets endpoint do GitHub retornou uma lista vazia; isso não comprova a situação da proteção clássica de branches.

## 2. PRs e CI

Todos os PRs examinados permanecem abertos, Draft e sem reviews submetidas.

| PR | HEAD | Evidência observada | Classificação |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS | Automated PASS histórico no SHA |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | Automated PASS histórico; baseline |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) SUCCESS | Automated PASS no SHA |
| #82 QA | `6acccf0180c1620bb9756188cf6e8c2086fd5230` | [Validate 43770387826](https://github.com/Reekyi/UpStatus/actions/runs/43770387826) FAILURE | Automated FAIL |
| #161 Normal | `557814dc31bed779b84a2094358dc6b2a7e67689` | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) SUCCESS | Automated PASS no laboratório |
| #167 anexos/updater | `d100b0820dd7f98e2b78a98e6b6f8c09f13b1867` | [Validate 43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) SUCCESS | Automated PASS offline; sem Smoke/Storage real |
| #168 Retry-After | `c6de3eb29bb419e817a237487185df0df752015d` | [Validate 43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) SUCCESS | Automated PASS de contrato; sem Smoke |
| #170 updater/autorização chat | `693039eddbd01e210fd1344b0196703ca067f374` | [Validate 43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686) FAILURE | Automated FAIL |

### Falhas exatas

**#82:** o log falha com `production updateURL mismatch`. Em master, `scripts/build.mjs` define `PROD_FUNCTION = "upstatus"`, mas mantém o `CLOUD_SERVER` em `upstatus-screen-share-3-1-1-beta10` e deriva `updateUrl` desse endpoint legado. Já `release.json` declara `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js`. O validator compara o artefato com o manifesto e rejeita a divergência. Não é falha de runtime reproduzida; é contrato de build/validação inconsistente.

**#170:** o job Validate gera Normal/TEST 3.4.7 e para em `scripts/chat-regression.test.mjs:110` com `CHAT REGRESSION FAILED: files are staged instead of uploaded immediately`. O corpo da PR registra que master ainda não contém `setPendingAttachment`; essa implementação está na #167, cujo Validate passou. Portanto, #170 ainda não valida o conjunto integrado. Não remover a assertion para forçar CI verde; integrar/reconciliar o contrato de anexos e repetir Validate/Smoke no SHA combinado.

**#168:** acrescenta `Retry-After: 900` e `Access-Control-Expose-Headers: Retry-After` ao HTTP 429. O Validate passou. Os 900 segundos são um limite superior conservador, não o tempo restante exato da janela. Não há Smoke nem resposta HTTP de runtime comprovando o comportamento implantado.

### Dependências e versionamento

- #161 é candidata empilhada sobre a linha Normal #74; #168 é empilhada sobre #161.
- #167 e #170 são candidatas separadas sobre master; #170 declara a #167 como dependência para o contrato de anexos pendentes.
- #161 troca o destino da API Normal de beta10 para `upstatus`, mas mantém `release.json` e o artefato em **3.4.7**. O atualizador compara versão instalada e remota; sem bump, usuários que já estão em 3.4.7 podem não receber o script atualizado.
- #170 corrige a origem de `@updateURL`/manifesto e a autorização de limpeza do chat no candidato, mas ainda não resolve o bump de versão nem passou no Validate.

## 3. Distribuição e workflows

### Runtimes efetivamente implantados

| Função | Projeto | Versão da função | Versão interna |
|---|---|---:|---|
| `upstatus` | produção | 480 | 3.4.7 |
| `upstatus-team-lite` | produção | 15 | 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | produção | 6 | userscript legado 3.1.1-beta8 |
| `upstatus-test` | produção | 281 | legado/teste |
| `upstatus-signal-test` | laboratório | 32 | candidato de sinalização |
| `upstatus-signal-e2e-once` | laboratório | 3 | harness E2E |

Produção tem 38 Edge Functions ACTIVE; laboratório tem 2. Todas as funções listadas reportam `verify_jwt=false`. Isso, isoladamente, **não prova acesso anônimo**: os handlers principais validam o token de sessão UpStatus no nível da aplicação. A quantidade de funções antigas de teste/beta/backup exige inventário por rota e autenticação; não desativar funções às cegas.

### Bundles servidos

- Normal v480: userscript 3.4.7; `@updateURL`/`@downloadURL` apontam para `/functions/v1/upstatus/upstatus.user.js`, mas o `CLOUD_SERVER` embutido ainda aponta para `upstatus-screen-share-3-1-1-beta10`.
- Team Lite v15: userscript 3.4.30; updater GitHub em `team-lite-official/team-lite/upstatus-team-lite.user.js`; API em `upstatus-team-lite`.
- Ambos os bundles instalados não contêm `private:true` nem `setAuth()`; ambos mantêm o tópico legado `upstatus-screen-share-live-3-1-1-beta10`.

Isso confirma que o Normal está dividido entre distribuição nova e API antiga. A #161 propõe corrigir o destino da API, mas precisa de bump de versão e cutover coordenado.

### Workflows lidos nos heads reais

- Master production: manual-only, usa `SUPABASE_PROJECT_ID` genérico via secret, fixa versão do release em 3.4.7, usa Supabase CLI `latest` e publica `upstatus`. Não fixa explicitamente project ID/SHA aprovado no workflow.
- Team Lite official: usa CLI `latest` e publica `upstatus`, não `upstatus-team-lite`. Não contém preflight de migrations nem validação explícita do projeto/commit. **Não despachar.**
- Develop TEST: executa manualmente e em push para develop; usa `SUPABASE_PROJECT_ID` genérico, CLI `latest` e publica `upstatus-test`, sem guard explícito que compare o projeto de destino com o ID autorizado do laboratório.

Links: [workflow master](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml), [workflow Team Lite](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml), [workflow TEST](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml).

## 4. AUTH-03: setup e autorização implantados

Inspeção estática das funções implantadas Normal e Team Lite:

- Ambas expõem `POST /api/setup`, que chama `login(req, true)`.
- Nenhuma possui rota `/api/setup-invite` ou chama `consume_upstatus_setup_invite_rate_limit`.
- O setup só configura uma conta **já existente** em `public.users` e sem `password_hash`; não é criação irrestrita de contas. Não foi demonstrada tomada de conta.
- Produção tem 5 usuários; 0 sem password hash e 0 sem role no snapshot. Logo, não há conta atualmente desconfigurada, mas o fluxo não exige convite único nem rate limit.
- Normal exige senha mínima de 6 caracteres; Team Lite exige 4.
- A limpeza global do chat em ambos os runtimes verifica apenas `name === "Ricardo"`; não consulta o papel persistido `implementation_admin`. A #170 adiciona a verificação de papel no candidato, mas seu Validate falha.

O catálogo de produção não contém a tabela `upstatus_setup_invite_rate_limits`, a tabela `upstatus_signal_rate_limits`, nem as RPCs `consume_upstatus_setup_invite_rate_limit`, `consume_upstatus_signal_rate_limit` ou `consume_upstatus_setup_invite`. O laboratório contém esses objetos e mantém a tabela de rate limit com RLS e sem grants de cliente. A evidência de CI da #161 é isolada; não é rollout de produção.

## 5. Realtime e segurança de banco

### Produção

- Snapshot consultado: 106 linhas em `realtime.messages`, todas com `private=false`; último evento observado em 2026-11-13 20:52 UTC. Ausência de eventos mais recentes não prova indisponibilidade.
- `realtime.messages`: RLS habilitado, zero policies, grants efetivos SELECT/INSERT/UPDATE para anon/authenticated.
- Os clientes assinam `upstatus-screen-share-live-3-1-1-beta10`; os triggers PostgreSQL publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Há divergência de tópico; a entrega desses broadcasts aos listeners atuais não está demonstrada.
- `upstatus_broadcast_messages()` é SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated e envia `to_jsonb(OLD/NEW)` completo em canal público.
- `upstatus_broadcast_remote_state()` também é SECURITY DEFINER com `search_path=public` e publica metadados de comandos/resultados em canal público.
- `upstatus_broadcast_users()` é SECURITY DEFINER com `search_path=public` e publica estado do usuário em canal público.

### Laboratório

- As três funções usam `search_path=""` e não têm EXECUTE efetivo para anon/authenticated.
- Os payloads foram reduzidos a `{op: TG_OP}`.
- Ainda publicam com `private=false` no tópico `upstatus-live-...`; portanto, a arquitetura não é privada/autorizada e RT-01 continua bloqueado.
- O projeto está sem fixtures de produto; os eventos Realtime observados eram zero.

### RLS, grants, default ACL e Storage

- Security Advisor: produção 6 WARN (EXECUTE das três funções para anon e authenticated) e 10 INFO (tabelas RLS sem policies); laboratório 0 WARN e 18 INFO.
- Produção: 10 tabelas public com RLS e sem policies; 9 tabelas backend-owned ainda têm grants diretos de anon/authenticated. O inventário soma 126 linhas de privilégios no schema public, incluindo 18 grants TRUNCATE. RLS não protege TRUNCATE; os grants continuam desnecessários mesmo quando as policies impedem acesso a linhas.
- Laboratório: 18 tabelas public com RLS e sem policies, mas zero grants diretos de anon/authenticated no schema public.
- Em ambos os projetos continuam grants anon/authenticated em schemas Realtime e Storage; o laboratório não está globalmente sem grants de cliente.
- `pg_default_acl` expandido por `aclexplode`: 300 privilégios padrão na produção e 277 no laboratório; 120 e 96, respectivamente, concedidos a PUBLIC/anon/authenticated. Esses totais cobrem vários schemas e não significam que cada entrada seja explorável; requerem revisão por owner/schema.
- Storage produção: buckets `chat-images` e `profile-images` públicos, 20 MiB cada, 168 e 20 objetos; zero policies próprias em `storage.objects`. Laboratório sem buckets/objetos. A privacidade dos buckets precisa de decisão explícita.

## 6. Edge logs, migrations e ambiente de teste

- Nas últimas 24h consultadas, ambos os projetos expuseram somente `pgbouncer_logs` e `postgres_logs`; não havia `edge_logs`/`function_edge_logs` suficientes. Não é possível calcular HTTP 402 atual nem afirmar recuperação a partir deste snapshot.
- Produção: 7 migrations no ledger; última `20261027155438`. Branch gerenciada `main` está `MIGRATIONS_FAILED`, com preview `ACTIVE_HEALTHY`.
- Laboratório: 39 migrations; última `20261110000612`; sem branch gerenciada.
- A pasta `supabase/migrations` em master e QA contém somente 3 arquivos SQL. Quatro fontes aplicadas em produção seguem ausentes: `20261023154754_create_upstatus_visual_config.sql`, `20261026195855_add_chat_message_file_name.sql`, `20261027154329_allow_chat_document_mime_types.sql`, `20261027155438_set_upstatus_upload_limits_20mb.sql`.
- Laboratório: 0 usuários, 0 objetos Storage e 0 mensagens Realtime. Não é Full-Product TEST; o projeto serve como laboratório parcial de segurança/sinalização.

## 7. Issues e aceitação manual

- Issue #78 permanece aberta com **0/8** critérios físicos marcados. Não há confirmação de Ricardo de reconexão real sem F5.
- Issue #79 permanece aberta com **16/35** itens marcados.
- Nenhum teste manual de perda de internet, reconexão, áudio bidirecional, microfone, captura de tela ou interoperabilidade entre userscripts instalados foi executado nesta rodada.
- Nenhum dos PRs #74, #75, #76, #82, #161, #167, #168 e #170 possui review submetida.

## 8. Gates

| Gate | Estado | Justificativa |
|---|---|---|
| RT-01 | BLOCKED | Canais públicos, payloads completos em produção, tópicos divergentes e sem transporte privado default |
| TEST-ISOLATION | BLOCKED | Laboratório parcial, sem dados/fixtures de produto |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais ausentes; branch main MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Setup sem convite/rate limit nos runtimes; RPC/tabela ausentes em produção |
| ACL-STORAGE | BLOCKED | Grants, default ACL, SECURITY DEFINER e buckets públicos sem decisão/policies |
| RECONNECT | PENDING | Depende de teste físico Normal e Team Lite sem F5 |
| HUMAN-REVIEW | PENDING | Nenhuma review/autorizações humanas submetidas |

## Veredito

**NOT READY. Não liberar.**

Prioridades de engenharia:
1. Integrar #167/#170 sem enfraquecer as regressões; executar Validate e Smoke no SHA combinado.
2. Definir bump de versão Normal e coordenar manifesto, updater, API e rollback.
3. Corrigir workflow Team Lite para o slug correto, projeto fixo, SHA/ref aprovado, CLI pinada e preflight.
4. Corrigir TEST para impedir deploy a projeto não autorizado.
5. Implantar AUTH-03 somente após migration revisada e autorização; aplicar convite/rate limit nos dois produtos.
6. Tornar Realtime privado/autenticado, alinhar tópicos e remover broadcasts sensíveis públicos.
7. Revisar grants/default ACLs, SECURITY DEFINER e política/limites de Storage.
8. Recuperar os quatro SQLs originais, diagnosticar MIGRATIONS_FAILED e provisionar Full-Product TEST.
9. Executar os oito testes físicos e obter revisão/aprovação humana.

**Integridade:** produção e laboratório permaneceram read-only. Nenhum teste foi executado, nenhuma fixture foi criada e nenhum workflow foi iniciado. A única escrita planejada desta rodada é este novo relatório na branch QA e a atualização do comentário QA dedicado na Issue #79.
