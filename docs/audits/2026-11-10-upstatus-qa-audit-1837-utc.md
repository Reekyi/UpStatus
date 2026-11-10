# Auditoria independente de QA do UpStatus — 2026-11-10 18:37 UTC

## 1. Escopo, método e integridade documental

Repositório: [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
Produção Supabase: `dlfvkawaiqduhlazsszm`  
Laboratório isolado: `bfpjtfqlnypisxljoxkb`  
Branch documental: `qa/release-readiness-2026-11-04-master`

A auditoria usou GitHub e Supabase em modo de inspeção. Foram consultados refs, metadados e diffs de PRs, runs/jobs/logs, reviews, fontes de build, workflows, código de clientes e Edge Functions implantadas, migrations, catálogo PostgreSQL, Security Advisor, Realtime, RLS, grants, Default ACLs e Storage.

**Documento-base lido integralmente antes da análise:** `docs/RELEASE_READINESS.md`, blob `7cfbd70886df42ce790c078c224b19284a632595`, 1.045.105 caracteres e 8.410 linhas. O último checkpoint registrado no documento é de 2026-11-08 18:30 UTC. O documento-base não foi alterado.

Nenhum workflow foi iniciado ou repetido pela auditoria. Nenhum teste manual foi executado no navegador/Tampermonkey. Todas as consultas SQL foram SELECT-only. A única escrita desta rodada é este relatório na branch QA e a atualização do comentário QA existente na Issue #79. O comentário da Engenharia foi preservado.

## 2. Heads reais

| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `a1d4886a63872c8a024163c40123403677559ae0` antes deste relatório |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 / `chore/continuity-foundation` | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| PR #75 / Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 / Team Lite signaling | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` |
| PR #82 / QA | `a1d4886a63872c8a024163c40123403677559ae0` |
| PR #89 / AUTH-03 Normal | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` |
| PR #101 / signaling server runtime | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` |
| PR #133 / Normal provenance | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` |
| PR #134 / Team Lite provenance | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` |
| PR #135 / migration recovery | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` |
| PR #137 / fixture cleanup | `73cf0461b8f173277a18e1d2525e8d5ea7aa5526` |
| PR #139 / parity workflow | `be0d10e7c5208f23b4769614c5ac33bba938a91a` |

Comparações:
- QA contra master: 199 commits à frente, 1 atrás; branches divergentes. Nenhum rebase foi feito.
- #133 contra a base #74: 14 à frente, 0 atrás.
- #134 contra a base #76: 10 à frente, 0 atrás.
- #76 contra #75: 319 à frente, 0 atrás; #75 é baseline histórica, não payload equivalente.
- #101 contra a base #74: divergente, 10 à frente e 6 atrás.
- #137 contra a base atual de #89: divergente, 5 à frente e 7 atrás; GitHub reporta `mergeable=false`.

As PRs #74, #75, #76, #82, #89, #101, #133, #134 e #139 foram consultadas quanto a reviews; todas retornaram zero reviews. Continuam abertas e Draft.

## 3. CI e workflows — classificação por evidência

| PR / referência | Evidência no HEAD exato | Resultado e limite |
|---|---|---|
| #74 Normal | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Signaling Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | **AUTOMATED PASS**. Validate e Smoke concluíram sucesso. |
| #75 Team Lite baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico limitado**. O job executou somente “Check candidate scripts and version metadata”; não é a suíte completa de integração. |
| #76 Team Lite | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | **AUTOMATED PASS**. 110/110 checks autenticados; inclui integração isolada, WebRTC, browser Full-IIFE com stubs, convites, rate limits e limpeza. |
| #82 QA | [Validate 42867123051](https://github.com/Reekyi/UpStatus/actions/runs/42867123051) | **AUTOMATED FAIL**. `production updateURL mismatch` em `scripts/validate.mjs:26`. |
| #89 AUTH-03 | [Production Cutover Guard 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | **AUTOMATED PASS do guard**, mas o log termina em `PRODUCTION CUTOVER BLOCKED`; não é deploy nem cutover. |
| #101 signaling server | [PR #101](https://github.com/Reekyi/UpStatus/pull/101) | **NOT VERIFIED por CI PR** no HEAD atual: `fetch_commit_workflow_runs` não retornou run PR-triggered para esse SHA. O push/parity histórico não comprova o check atual da PR. |
| #133 Normal | [API Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827), [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | **AUTOMATED PASS**. 136/136 verificações autenticadas; chamada, voz, tela, mesh, rate limits, convites e limpeza. |
| #134 Team Lite | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298), [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) | **AUTOMATED PASS**. 110/110 autenticadas, 16/16 não autenticadas, 11/11 contratos HTTP; Playwright Full-IIFE e integração isolada. |
| #137 fixture cleanup | [PR #137](https://github.com/Reekyi/UpStatus/pull/137) | **NOT VERIFIED por CI PR** no HEAD atual. O push run anterior não substitui check PR; branch está divergente e não mergeable. |
| #139 source parity | [Workflow 42851899626](https://github.com/Reekyi/UpStatus/actions/runs/42851899626) | Check geral **PASS**, mas a etapa de paridade foi **SKIPPED** porque `supabase/functions/upstatus-signal/index.ts` não existe na base dessa PR. Não é prova de paridade da fonte de produção. |

Os logs de #133 confirmam 136/136 integrações autenticadas, entrega de áudio remoto, voz, vídeo de tela, mesh de três participantes, teardown, rate limit 90+1/429, concorrência de recibos e consumo de convite. O teste distribuído de emissão de convites passou nessa execução.

Os logs de #134 confirmam 110/110 integrações autenticadas, 16/16 não autenticadas, 11/11 contratos HTTP, chamadas/voz/tela WebRTC, mesh, rate limits e limpeza.

Esses resultados são **CI automatizado em ambiente isolado e browser controlado**. Não equivalem a teste físico instalado no Sale Smartly, permissões reais de microfone/display ou queda física de internet.

## 4. Bloqueador de arquitetura Normal: dois contratos incompatíveis

Comparei `scripts/build.mjs` e os workflows das linhas candidatas.

**PR #89 — dual runtime**
- Userscript distribuído por `upstatus`.
- API continua em `upstatus-screen-share-3-1-1-beta10`.
- Build gera os dois entrypoints a partir do template de servidor.
- Workflow manual-only, checkout do SHA exato, valida master, organização/projeto, CLI 2.122.1, preflight read-only de migrations e publica API beta10 antes do distribuidor `upstatus`.
- O guard exige versão estável superior à produção 3.4.7 e as migrations AUTH-03. O run 42840853509 bloqueou o cutover corretamente.

**PR #133 — runtime único**
- Userscript e API apontam para `upstatus`.
- Build gera o runtime Normal único e TEST.
- `release.json` mantém scriptUrl em `/functions/v1/upstatus/upstatus.user.js`.
- O build usa essa URL para o updater, mas usa `upstatus` como CLOUD_SERVER.

As duas linhas passam nos próprios testes, mas não são intercambiáveis. A produção atual distribui pelo runtime `upstatus` e usa beta10 como API. Integrar #89 e #133 sem decisão explícita de topologia pode trocar o endpoint API e quebrar clientes já instalados.

**Ação necessária:** Ricardo/Engenharia precisa escolher se Normal mantém distribuição `upstatus` + API beta10 (dual runtime) ou se fará migração coordenada para runtime único. Sem essa decisão, não é seguro combinar as linhas.

## 5. Sinalização autenticada continua opt-in

Inspecionei os templates dos HEADs #133 e #134:
- `signaling_transport_enabled` tem default `false`.
- `signaling_transport_endpoint` começa vazio.
- Nenhum template usa `private:true` ou `realtime.setAuth()`.
- Com a flag desligada, o caminho público legado continua ativo para call signaling, voice-room e screen-share.
- No Normal, o listener público `call_signal` entrega o payload a `receiveCallSignal(..., false)`; os listeners públicos de voz e tela permanecem ativos quando a flag está desligada.
- Team Lite também verifica a sessão local atual antes de processar eventos, mas isso não autentica a origem do remetente.

O candidato server-mediated está na [PR #101](https://github.com/Reekyi/UpStatus/pull/101), mas a PR continua Draft, divergente da base e sem check PR-triggered no HEAD atual. A fonte contém autenticação por token de sessão, membership de sala, rate limit e limpeza limitada. Não existe função `upstatus-signal` implantada em produção.

**Classificação:** CODE INSPECTION de risco de confiança no caminho legado. Nenhuma exploração externa foi tentada. A configuração Dashboard “Allow public access” não foi consultada pelo conector; portanto não afirmo que um terceiro externo tenha conseguido entrar no tópico.

## 6. Supabase produção — fotografia read-only

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.

### Edge Functions e artefatos implantados

38/38 Edge Functions estão ACTIVE e todas reportam `verify_jwt=false` no metadata. Isso não demonstra ausência automática de autenticação: os runtimes principais inspecionados usam token customizado. A auditoria não analisou individualmente os 38 handlers.

| Função | Versão Edge | Userscript embutido | API/observação |
|---|---:|---|---|
| `upstatus` | v480 | 3.4.7 | updateURL aponta para `/upstatus`; CLOUD_SERVER aponta para beta10 |
| `upstatus-team-lite` | v15 | 3.4.30 | API Team Lite; tópico Realtime novo |
| `upstatus-screen-share-3-1-1-beta10` | v6 | 3.1.1-beta8 | bundle ainda identificado como beta8 e updateURL beta8 |
| `upstatus-test` | v281 | 3.3.28 | função TEST dentro do próprio projeto de produção |

Nenhuma função de produção `upstatus-signal` existe. Os bundles implantados inspecionados não usam Realtime privado nem `setAuth()`. Os runtimes Normal, Team Lite e beta10 ainda encaminham o primeiro setup para `login(req,true)`.

### Realtime

Consulta de `realtime.messages` em produção:
- 65 linhas no snapshot, 65/65 com `private=false`.
- Tópico: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Eventos: 20 `db_change`, 6 `remote_command`, 6 `remote_result`, 33 `user_status`.
- Janela observada: 2026-11-09 12:02:26 UTC a 2026-11-10 18:00:19 UTC.

O parent `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado e zero policies; anon/authenticated possuem SELECT/INSERT/UPDATE. Os três triggers de broadcast estão habilitados.

As três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, retorno `trigger` e EXECUTE efetivo para anon/authenticated. O Security Advisor as sinaliza como executáveis por ambos os papéis. Não tentei invocação RPC direta. O trigger de mensagens publica `to_jsonb(OLD/NEW)` completo.

Os clientes implantados continuam nos tópicos beta10/beta8, enquanto os triggers publicam no tópico novo. O cutover de tópico não está concluído.

### RLS, grants, Default ACLs e Storage

- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas backend-owned com grants diretos para anon e authenticated, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER; 126 linhas de privilégios no catálogo.
- 24 registros de Default ACL, com 120 itens ACL destinados a anon/authenticated.
- Security Advisor observado em 18:34 UTC: 10 INFO de RLS sem policy, 3 WARN de SECURITY DEFINER para anon e 3 WARN para authenticated.
- Buckets `chat-images` e `profile-images` públicos, 20 MiB cada.
- `storage.objects` tem RLS habilitado e zero policies; grants de cliente continuam presentes.

RLS sem policy impede operações de linha para esses papéis, mas não protege TRUNCATE. A auditoria não tentou executar DML, TRUNCATE ou RPC.

### AUTH-03 e migrations

Produção tem somente 7 migrations remotas. O catálogo confirmou:
- ausência da tabela de rate limit de convites;
- ausência da tabela de rate limit de sinalização;
- ausência das tabelas de salas server-mediated;
- zero colunas `setup_token_*`;
- zero RPCs de consumo de convite e rate limit.

A branch `main` continua reportando MIGRATIONS_FAILED; a causa não foi diagnosticada nesta auditoria.

A PR #89 passou no guard e nos testes isolados, mas não aplicou nada em produção. O log registrou cutover bloqueado porque a versão estável ainda é 3.4.7 e as migrations AUTH-03 obrigatórias não estão aplicadas.

## 7. Laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

- 39 migrations.
- 18 tabelas públicas com RLS habilitado e sem policies.
- Nenhum grant direto de tabela pública para anon/authenticated nas tabelas de produto consultadas.
- Zero mensagens em `realtime.messages`.
- Zero buckets Storage.
- Duas Edge Functions: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Security Advisor: 18 INFO de RLS sem policy, sem WARN de SECURITY DEFINER.

**Limite de isolamento:** Default ACLs ainda contêm 96 itens destinados a anon/authenticated para objetos futuros em schemas como public, storage e GraphQL. O laboratório está limpo de fixtures e sem grants diretos nas tabelas atuais, mas não está completamente endurecido para futuras migrations.

### Drift de contrato HTTP

Comparei a fonte candidata da #101 com a Edge Function `upstatus-signal-test` v32 implantada no laboratório.

- A fonte candidata converte `VOICE_ATTEMPT_ALREADY_ACTIVE` em HTTP 409.
- O runtime v32 implantado converte `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` em 409, mas não inclui `VOICE_ATTEMPT_ALREADY_ACTIVE`; esse caso cai no 500.
- O check de helper HTTP no Candidate Checks é um teste offline do mapper. Não é uma request HTTP contra o runtime v32 implantado.

A migration candidata `20261108190000_distributed_signaling_rate_limit.sql` existe na branch da #101, com limpeza limitada a 100 registros e `FOR UPDATE SKIP LOCKED`, mas não aparece no ledger do laboratório. O laboratório usa migrations de teste anteriores; a migration exata de produção não foi exercitada ali.

## 8. Migrations e proveniência

A pasta `supabase/migrations` em master contém apenas três arquivos:
- `20261005160000_upstatus_cloud.sql`
- `20261005173000_remote_realtime.sql`
- `20261005180000_client_presence.sql`

O ledger remoto de produção contém sete versões, incluindo quatro migrations cujos SQLs originais não estão na pasta de master:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A [PR #135](https://github.com/Reekyi/UpStatus/pull/135) arquiva statements recuperados do ledger em `docs/migration-recovery/`; não restaura os quatro arquivos originais byte a byte e não os coloca em `supabase/migrations/`. Os arquivos de recuperação não devem ser aplicados como se fossem originais sem revisão de proveniência e rollback.

## 9. Workflows de publicação

### Normal master
O workflow atual em master:
- usa Supabase CLI `latest`;
- faz checkout sem fixar explicitamente `github.sha`;
- fixa `release.json.version` em 3.4.7;
- publica somente `upstatus`;
- não tem o preflight completo de projeto/SHA/migrations do candidato #89.

### Team Lite oficial
O workflow em `team-lite-official`:
- executa `supabase functions deploy upstatus`, alvo Normal em vez de `upstatus-team-lite`;
- usa CLI `latest`;
- não verifica SHA/projeto/migrations com os guards do candidato.

**Não despachar o workflow Team Lite oficial atual.** A correção #129 continua Draft e não está integrada.

### Candidato Normal #89
O workflow candidato é manual-only, verifica SHA exato, branch master, organização/projeto, migrations em modo read-only e fixa CLI 2.122.1. Publica API beta10 antes do distribuidor upstatus. O guard bloqueia o cutover até versão/migrations e alinhamento estarem prontos.

## 10. Issues e aceitação manual

- Issue #78 permanece OPEN, 0/8 critérios físicos marcados. Última atualização em 2026-11-08 07:04 UTC. Não houve teste manual nesta execução de queda real de internet, recuperação sem F5, microfone/display reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 permanece OPEN; o corpo contém 16 itens marcados e 19 pendentes. O comentário QA existente foi atualizado, sem duplicata; o comentário separado da Engenharia não foi alterado.

## 11. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público; transporte server-mediated não é default nem está implantado em produção |
| TEST-ISOLATION | IN_PROGRESS | Projeto isolado e limpo, mas Default ACLs e runtime HTTP ainda precisam de hardening/paridade |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais ausentes; PR #135 recupera statements documentais |
| AUTH-03 | BLOCKED | CI isolado passou, mas estruturas e fluxo ainda ausentes em produção |
| ACL-STORAGE | BLOCKED | Grants, Default ACLs, SECURITY DEFINER e Storage sem hardening |
| RECONNECT | PENDING | Issue #78 0/8; requer confirmação física de Ricardo |
| HUMAN-REVIEW | PENDING | PRs principais Draft e zero reviews; sem autorização explícita de release |

## 12. Próximas ações recomendadas

1. Ricardo/Engenharia decidir a topologia Normal (dual runtime ou runtime único) antes de combinar #89 e #133.
2. Tornar o transporte autenticado fail-closed por padrão somente depois de o endpoint server-mediated estar implantado e integrado; adicionar teste que exija default seguro.
3. Adicionar check PR real para a fonte server-mediated e validar HTTP 409 contra o runtime implantado, não apenas helper offline.
4. Aplicar a migration exata de rate limit somente em ambiente descartável e provar limpeza limitada/concorrrência.
5. Recuperar/validar a proveniência dos quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
6. Endurecer grants, Default ACLs, funções broadcast e Storage com plano de rollback revisado.
7. Corrigir o dispatcher Team Lite antes de qualquer publicação.
8. Só depois solicitar os testes físicos da Issue #78 e revisão humana.

## 13. Registro de segurança

Nenhuma produção foi alterada. Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva foi realizada. Todas as consultas SQL desta auditoria foram SELECT-only. Nenhum workflow foi iniciado ou repetido manualmente. Nenhum teste físico foi realizado.

Apenas este relatório foi criado na branch QA e o comentário QA existente da Issue #79 foi atualizado. O comentário da Engenharia foi preservado.
