# UpStatus — auditoria independente de QA
**Data:** 2026-11-14T06:36:30.772Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório signaling/auth:** `bfpjtfqlnypisxljoxkb`

## Resultado executivo

**Release: NOT READY.** O CI dos candidatos Normal e Team Lite está verde nos HEADs consultados, mas isso não fecha os bloqueadores de produção. A inspeção dos userscripts efetivamente servidos pelas Edge Functions confirmou que ambos usam Realtime público sem identidade Supabase e aceitam comandos/sinais de mídia vindos do canal. Também confirmei que as APIs instaladas ainda autorizam upload assinado com `upsert:true`, tamanho/MIME declarados pelo navegador e associação de avatar apenas pelo prefixo público do bucket.

A candidata #164 melhora a validação de avatar, mas está baseada em `develop`, não está integrada às linhas oficiais e seu teste de Storage usa mocks. Nenhum teste físico foi realizado nesta rodada.

## 1. Documento de readiness e heads reais

Li integralmente `docs/RELEASE_READINESS.md` na branch QA:
- Blob: `7cfbd70886df42ce790c078c224b19284a632595`.
- 1.045.105 caracteres e 8.410 linhas.
- Último checkpoint técnico no documento: 08/11/2026 às 18:30 UTC. O readiness principal está seis dias atrás da fotografia desta auditoria.

Heads confirmados:
| Ref | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA / #82 | `ecd5c3beaa034e5b58ac157e85b79387785705fc` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |

A QA está 298 commits à frente e 1 atrás de master. O único commit posterior de master, `9d40461`, adiciona documentação de preflight de histórico de migrations; não altera runtime. Não fiz rebase nem atualizei refs concorrentes.

| PR | HEAD | Base | Diferença atual | Estado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | master | 887 ahead / 1 behind | OPEN, Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 ahead / 0 behind | OPEN, Draft |
| [#76 Team Lite atual](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | team-lite-official | 386 ahead / 0 behind | OPEN, Draft |
| [#82 QA documental](https://github.com/Reekyi/UpStatus/pull/82) | `ecd5c3beaa034e5b58ac157e85b79387785705fc` | master | 298 ahead / 1 behind | OPEN, Draft |

A #76 está 327 commits à frente da baseline #75. A #82 contém 154 arquivos, todos em `docs/`; não altera runtime. Reviews submetidas: zero em #74, #75, #76 e #82.

## 2. CI por HEAD exato

| PR | Workflow | Run | Resultado |
|---|---|---|---|
| #74 | Validate | [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | PASS |
| #74 | Signaling Smoke | [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS |
| #75 | Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico |
| #76 | Candidate Checks | [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS |
| #82 | Validate | [43562773212](https://github.com/Reekyi/UpStatus/actions/runs/43562773212) | FAIL |
| #164 | Validate | [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) | PASS |

### Normal #74

O Smoke passou 19/19 verificações não autenticadas e 136/136 verificações de integração autenticadas. O log confirma negociação WebRTC de chamada/voz/tela, entrega de tracks remotos, mesh de três participantes, recuperação de sala e rate limit de sinalização: 90 aceitas, uma rejeitada com HTTP 429 e Retry-After de 60 segundos. **A etapa de rate limit distribuído de emissão de setup-invite foi SKIPPED**; não deve ser contabilizada como aprovada. O consumo único de convite passou.

### Team Lite #76

O Candidate Checks passou 16/16 verificações não autenticadas e 110/110 autenticadas. Também passou 11/11 verificações de contrato HTTP, testes de recuperação de voz/tela, IIFE em Chromium offline com stubs de Tampermonkey, integração isolada, rate limit de sinalização e rate limit distribuído de emissão de setup-invite. O teste confirma 90 operações aceitas e uma rejeitada com HTTP 429. Isso é CI automatizado no laboratório, não teste físico do userscript instalado.

### Baseline #75

O job executou apenas a checagem de scripts candidatos e metadados de versão. É uma PASS histórica da baseline, não substitui os testes atuais da #76.

### QA #82

O Validate do SHA `ecd5c3be` falhou em `scripts/validate.mjs:26`:
`VALIDATION FAILED: production updateURL mismatch`.

O log confirma build 3.4.7 / TEST 3.4.7 antes da falha. Em master, `scripts/build.mjs` deriva o updateURL de `cloud + /upstatus.user.js`; para produção, `cloud` ainda aponta para beta10. O validator exige `/functions/v1/upstatus/upstatus.user.js`. O `release.json` já contém o endereço correto. A candidata #74 corrige o builder para usar `release.json.scriptUrl` e valida updateURL/downloadURL contra esse manifesto. A correção ainda não está em master, portanto a falha herdada da #82 permanece. Não removi assertions nem executei rerun.

## 3. Runtimes instalados: Realtime e comandos

Decodifiquei o `USERSCRIPT_BASE64` servido pelas funções implantadas:
- Normal: função distribuidora `upstatus` v480, userscript 3.4.7; o cliente usa API `upstatus-screen-share-3-1-1-beta10` v6.
- Team Lite: função `upstatus-team-lite` v15, userscript 3.4.30; o cliente usa essa própria função como API.

Ambos os userscripts configuram o tópico `upstatus-screen-share-live-3-1-1-beta10`, usam o publishable key e criam `channel(UP_REALTIME_TOPIC)` sem `config.private=true` e sem `realtime.setAuth()`.

Achado P0 de release por inspeção estática:
- O handler `remote_command` chama `executeRemoteCommand` quando `command.target === member`. O Normal não valida remetente nem assinatura. Team Lite acrescenta verificação de sessão local/geração, mas não autentica o emissor do broadcast.
- `executeRemoteCommand` chama `syncSaleSmartly(c.status)` e depois POST autenticado em `/api/status` usando a sessão do próprio usuário-alvo. O comando público pode, se um emissor conseguir publicar no canal, induzir o navegador da vítima a alterar seu próprio status.
- `voiceRoomReceive` confia em `from`, `to`, `roomId`, `sessionId` e timestamps fornecidos pelo payload; esses campos não provam membership.
- `screenShareReceive` aceita offer com `roomId/from/to`; `screenShareMakePeer` adiciona os tracks locais de tela quando o compartilhamento está ativo. Há caminho estático para negociação com emissor não verificado.

Não houve subscribe externo, broadcast de prova, captura de áudio/tela ou exploração. A configuração do Dashboard “Allow public access” não está exposta pelo conector; por isso, a exploração ao vivo não foi demonstrada. Até confirmar e fechar essa configuração, tratar como bloqueador crítico. O token publicável não é segredo e sua rotação não corrige o desenho.

## 4. Realtime e PostgreSQL — fotografia read-only

Consulta de `realtime.messages` nos últimos 14 dias:
- 106 eventos, todos `private=false`.
- Tópico observado: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. Os broadcasts dos triggers, portanto, não chegam ao tópico que os clientes atuais assinam.

Estado de `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies e SELECT/INSERT/UPDATE concedidos a anon/authenticated. A função `upstatus_broadcast_messages` transmite `to_jsonb(OLD/NEW)` completo no evento `db_change`; a função de remote state transmite metadata de `remote_command`; todas usam `private=false`.

Produção:
- 10 tabelas public com RLS habilitado e sem policies: chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, upstatus_visual_config e users.
- 126 grants diretos amplos em nove tabelas, para anon/authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- 24 entradas Default ACL. As ACLs de objetos public criados por postgres/supabase_admin concedem privilégios amplos a anon/authenticated para tabelas, sequences e funções.
- Três funções SECURITY DEFINER de broadcast, com `search_path=public` e EXECUTE para PUBLIC, anon e authenticated.

Precisão sobre o Security Advisor: ele reporta seis WARN (três funções para anon e três para authenticated) e dez INFO de RLS sem policies. As três funções SECURITY DEFINER retornam `trigger`; a sugestão do Advisor de invocação direta via PostgREST RPC é falso positivo para chamada RPC comum. Os EXECUTE grants continuam desnecessários e devem ser restringidos; o risco concreto observado é o broadcast público e o payload transmitido. Anon/authenticated não têm CREATE no schema public, portanto object-shadowing por esse caminho não foi demonstrado.

Storage:
- `storage.objects` tem RLS habilitado e zero policies.
- `chat-images`: público, limite 20 MiB, 168 objetos.
- `profile-images`: público, limite 20 MiB, 20 objetos.

## 5. Avatar e anexos

O userscript Normal instalado chama a API beta10 v6; o userscript Team Lite chama upstatus-team-lite v15. Ambos enviam `avatarUrl` depois do upload assinado. **Correção de auditoria:** não há evidência de incompatibilidade Normal entre `avatarUrl` e `dataUrl`; a função distribuidora Normal v480 tem uma rota separada que aceita dataUrl, mas o cliente instalado usa beta10, cujo endpoint aceita avatarUrl.

Nas APIs instaladas beta10 e Team Lite:
- `profileRoute` aceita URL com prefixo público de profile-images sem verificar ownership por `users.id`.
- `signedUploadRoute` confia no MIME e tamanho declarados pelo cliente, permite até 20 MiB e usa `createSignedUploadUrl(..., {upsert:true})`.
- Os bytes recebidos diretamente pelo Storage não são inspecionados pelo handler antes da publicação.

A #164 (HEAD `a27ced5`, base `develop`) introduz avatar server-mediated, limite de 3 MiB no corpo antes do parse, 2 MiB nos bytes decodificados, assinatura MIME, prefixo de ownership derivado de `users.id`, `upsert:false` e HTTP 410 para a antiga rota assinada de avatar. Seu Validate passou. Os testes de servidor usam Node VM e Storage mockado; não houve upload real. Faltam decoder/re-encode de imagem, limites de dimensões/pixels e integração Team Lite. O upload direto assinado de anexos do chat permanece; no candidato, a autorização ainda usa MIME/tamanho declarados, embora a sobrescrita seja bloqueada. A #164 não está integrada em #74/#76 nem nos runtimes instalados.

## 6. AUTH-03 e Edge Functions

Produção:
- 5 usuários, 319 sessões, 5 perfis.
- `users` tem id e name; `upstatus_sessions` e `upstatus_profiles` são associados por `user_name`.
- Nenhuma constraint UNIQUE em `users.name`.
- Nenhuma tabela de setup-invite/rate-limit e nenhuma RPC de convite.
- O runtime expõe `needsSetup`, `/api/setup` e `/api/login`; não foi encontrado rate limit distribuído de login/setup.

O laboratório contém as migrations/candidatas de convite e rate limit, mas elas não estão em produção. Rate limit de emissão de convite não substitui rate limit de tentativas de senha.

Edge Functions:
| Projeto | Função | Versão |
|---|---|---:|
| Produção | upstatus | v480 |
| Produção | upstatus-team-lite | v15 |
| Produção | upstatus-screen-share-3-1-1-beta10 | v6 |
| Produção | upstatus-test | v281 |
| Laboratório | upstatus-signal-test | v32 |
| Laboratório | upstatus-signal-e2e-once | v3 |

As funções reportam `verify_jwt=false`; os handlers principais usam token/sessão próprios do UpStatus. Isso não prova ausência de autenticação, mas exige que cada rota continue validando o token customizado. `upstatus-test` v281 está no projeto de produção, não em um Full-Product TEST isolado.

## 7. Projetos, migrations e workflows

Projetos:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, us-west-2.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, sa-east-1, sem branches e sem buckets Storage.

Migrations:
- Produção: 7 versões no ledger, até `20261027155438 / set_upstatus_upload_limits_20mb`.
- Laboratório: 39 versões.
- Master contém somente 3 SQLs canônicos. Quatro versões de produção não têm fonte correspondente em master: `20261023154754 create_upstatus_visual_config`, `20261026195855 add_chat_message_file_name`, `20261027154329 allow_chat_document_mime_types`, `20261027155438 set_upstatus_upload_limits_20mb`.
- Branch gerenciada Supabase `main`: MIGRATIONS_FAILED; preview ACTIVE_HEALTHY. A causa operacional do status não foi determinada nesta leitura.

Workflows:
- Master `deploy-production.yml`: manual-only, usa secret genérico `SUPABASE_PROJECT_ID`, CLI latest e publica `upstatus`, sem guard equivalente ao candidato #74.
- #74 candidato: valida branch master, SHA, projeto, versão estável 3.4.7 e fixa CLI 2.122.1. O guard de versão precisa ser coordenado com o próximo bump.
- Master `deploy-test.yml`: manual-only, secret genérico e CLI latest. #74/#76 adicionam `SUPABASE_TEST_PROJECT_ID`, rejeitam produção e o laboratório signaling, e fixam CLI 2.122.1.
- A branch oficial Team Lite tem apenas o workflow compartilhado `deploy-production.yml`, que publica `upstatus`; não existe workflow de produção dedicado que publique `upstatus-team-lite`. `team-lite-candidate.yml` é CI, não deploy.

## 8. Issues, aceitação e classificação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados. Reconexão Normal/Team Lite sem F5, áudio real e reentrada continuam sem aceite manual.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados.
- Reviews humanas em #74, #75, #76 e #82: zero.

Classificação:
- **CI automatizado:** #74 Validate/Smoke, #76 Candidate Checks, #75 baseline checks, #164 Validate.
- **Inspeção de código/configuração:** workflows, builders, userscripts decodificados, Edge Functions, RLS/grants/ACL, Realtime e Storage.
- **Consulta read-only:** SQL de catálogo/dados, projetos, branches, migrations e advisors.
- **Teste manual:** nenhum realizado pela auditoria.
- **Pendente/bloqueado:** Full-Product TEST, migrations originais, AUTH-03 em produção, Realtime privado, ACL/Storage, reconexão física e aprovação humana.

## 9. Gates e próximos passos

| Gate | Estado |
|---|---|
| RT-01 | BLOCKED |
| TEST-ISOLATION | BLOCKED |
| MIGRATION-PROVENANCE | BLOCKED |
| AUTH-03 | BLOCKED |
| ACL-STORAGE | BLOCKED |
| RECONNECT | PENDING |
| HUMAN-REVIEW | PENDING |

Próximas prioridades:
1. Remover a confiança em broadcast público para remote_command, voz e tela; autenticar membership e identidade do emissor.
2. Alinhar tópico dos triggers e dos clientes, sem transmitir linhas completas de mensagens.
3. Migrar avatar e anexos para upload validado pelo servidor, com ownership e inspeção de bytes; integrar Normal e Team Lite em conjunto.
4. Criar Full-Product TEST com Storage e API próprios.
5. Implementar convite único, identidade por ID e rate limit de login/setup em produção.
6. Restringir grants, Default ACL, funções SECURITY DEFINER e Storage.
7. Recuperar as quatro fontes SQL e resolver MIGRATIONS_FAILED.
8. Corrigir o updateURL em master e criar workflow de produção Team Lite com destino correto.
9. Executar os oito testes físicos de #78 e obter revisão/aprovação humana.

## Limites e segurança

Todas as consultas SQL desta rodada foram SELECT-only. GitHub e Supabase foram inspecionados em leitura. Nenhum teste HTTP ou broadcast de exploração foi enviado à produção; nenhum áudio ou vídeo foi capturado. Não executei testes locais nem testes manuais. Nenhuma migration, DDL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva ocorreu. A única escrita é este relatório novo na branch QA e a atualização do comentário QA dedicado na Issue #79.
