# Auditoria independente de qualidade — UpStatus
**Data da execução:** 2026-11-12 06:30 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`

## Veredito executivo

**NÃO LIBERAR (NOT READY).**

A auditoria confirmou que os userscripts efetivamente embutidos nas Edge Functions de produção ainda executam comandos recebidos por broadcasts públicos. A candidata Normal #146 reduz os broadcasts de comandos a avisos e usa polling autenticado, mas o dispatcher #143 ainda contém o handler antigo. Team Lite #76 tem proteção equivalente para comandos; a candidata de sinalização #149 melhora a separação de origem, porém o transporte autenticado continua opt-in e seu workflow está vermelho por uma falha no parser do próprio teste de triggers.

Também permanecem pendentes o primeiro acesso obrigatório por convite, a privacidade/autorização do Realtime, grants/ACL/Storage, quatro migrations originais ausentes, testes físicos e aprovação humana.

Nenhuma operação de produto foi executada. A auditoria foi somente leitura em GitHub e Supabase. Não foram iniciados novos testes, reruns ou workflows pela QA.

## Heads reais e integridade

| Referência | HEAD verificado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `9c1ff5de97c10e8ab5c7d9b03feb39eb173c3bd3` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

A comparação QA ↔ master retornou **242 commits à frente e 1 atrás**. A PR #147 usa como base o antigo HEAD QA `6b9aba1`; o HEAD QA atual está cinco commits à frente. Os cinco commits posteriores são relatórios documentais QA, sem alterações de runtime.

O documento `docs/RELEASE_READINESS.md` foi lido integralmente pela URL raw da branch QA (aprox. 1,05 MB; a página GitHub informa 8.409 linhas / 5.746 LOC). O último checkpoint registrado dentro do documento é **2026-11-08 18:30 UTC**. O conteúdo, portanto, não registra as PRs #147–#149 nem os workflows de 12/11 e não deve ser tratado como fotografia atual.

## PRs prioritárias e CI

| PR / referência | HEAD | Evidência atual | Classificação |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Validate e Signaling Smoke PASS; nos logs, as etapas de rate limit de emissão de convite foram SKIPPED | CI PASS parcial; AUTH-03 não incluído |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Run 41674353127 PASS histórico | CI histórico; substituído pela candidata #76 |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Run 43124413080 PASS; 110/110 verificações autenticadas, 16/16 não autenticadas, 11/11 contrato HTTP; WebRTC de chamada/voz/tela e rate limit 90 aceitas + 1 HTTP 429 | CI PASS no HEAD exato |
| #82 QA | `9c1ff5de97c10e8ab5c7d9b03feb39eb173c3bd3` | Validate 43163115150 FAIL: `production updateURL mismatch` | CI FAIL |
| #131 AUTH-03 Normal | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | Run 42760281798 PASS; 136/136 autenticadas, 19/19 não autenticadas, WebRTC e rate limit | CI PASS no candidato |
| #143 dispatcher | `c4a04fa755b877bc76b1372170a26e7b974264e6` | API Candidate Validate 43093687347 PASS; a definição do workflow limita pull_request à base master, mas a PR usa base `fix/normal-beta10-api-parity` | Não há evidência de Guard como check da PR |
| #146 remote hints | `71c5ce2f730ade8ee3e8b090498202933809ce5c` | Validate 43108250452 PASS | CI PASS no candidato |
| #147 release target | `e6c1b740d3f3b2b5c05fcc603f7420e1c131aea3` | Teste direcionado 43147567694 PASS; Validate completo 43147344544 FAIL em `CHAT REGRESSION FAILED: files are staged instead of uploaded immediately` | CI misto; fluxo de anexo pendente não implementado no template |
| #148 admin role | `716a41db346de2f7ea1c821e29f02fb0256d09c5` | Workflow focado 43151937348 PASS | CI focado PASS; primeiro setup sem convite permanece |
| #149 call-source Team Lite | `7c0fb7305f5c57f81a799b9b89bfa0a0de06840c` | Guard 43165253219 PASS; Candidate Checks 43165253295 falha na etapa final de parsing do workflow | CI FAIL por teste de trigger; etapas funcionais anteriores passaram |

As PRs #74, #75, #76 e #82 continuam abertas/Draft. As PRs #147, #148 e #149 também não possuem aprovação humana registrada. A consulta de reviews não retornou reviews para #74, #75, #76, #82, #147, #148 ou #149.

### Falhas e regressões específicas

**#82 / updater QA:** o log 43163115150 confirma que o build gera 3.4.7 e falha em `scripts/validate.mjs:26` com `production updateURL mismatch`. O `release.json` de master contém o endereço estável correto, mas o build da branch QA ainda ignora `release.scriptUrl`.

**#147 / chat:** a candidata corrige o uso de `release.scriptUrl`, separa API e distribuição e passou no teste direcionado. Porém, o template ainda contém upload direto (`uploadFileDirect`) e não contém `setPendingAttachment(file)`; o teste de regressão exige que o arquivo seja preparado antes do envio. O Validate completo falha nessa primeira asserção. Não classificar a falha como mero falso negativo sem implementar ou remover deliberadamente o requisito de anexos pendentes.

**#148 / setup:** a PR remove o fallback que escolhia administrador pelo nome quando o papel estava vazio e usa `a.role || "implementation_user"`. Contudo, `/api/setup` ainda chama `login(req,true)` sem token de convite. Uma conta pré-configurada com papel admin, mas sem senha, ainda poderia ser reivindicada no primeiro setup; o papel armazenado seria preservado. A PR não substitui AUTH-03.

**#149 / workflow trigger:** o workflow contém listas YAML válidas em bloco para `push.branches` e `pull_request.branches`. O teste `parseBranchTargets` usa `\\s*` após o nome do trigger; o whitespace greedily consome a quebra de linha/indentação antes de `branches:`, e a captura deixa apenas `branches:`, fazendo a regex seguinte falhar. O log 43165253295 confirma `push must declare a readable branches list` em `scripts/test-team-lite-candidate-workflow-triggers.mjs:18`. A falha é do parser estático do teste, não prova de branch trigger ausente no workflow. Corrigir o parser com whitespace horizontal explícito ou parser YAML, sem enfraquecer as verificações de cobertura.

## Runtimes efetivamente implantados

As fontes das Edge Functions foram lidas e os campos `USERSCRIPT_BASE64` decodificados para inspeção estática dos artefatos servidos:

| Runtime | Edge Function | Versão da função | Userscript embutido | Source SHA |
|---|---|---:|---|---|
| Normal | `upstatus` | v480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| Team Lite | `upstatus-team-lite` | v15 | 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| API Normal beta10 | `upstatus-screen-share-3-1-1-beta10` | v6 | API auxiliar | — |
| TEST legado | `upstatus-test` | v281 | runtime TEST no projeto de produção | — |

Nos dois userscripts instalados:
- O listener `remote_command` lê `payload.command` e chama `executeRemoteCommand(c)`.
- O listener `remote_result` consome o resultado vindo do broadcast.
- `call_signal`, voice-room e screen-share são entregues diretamente aos handlers locais.
- O tópico cliente é `upstatus-screen-share-live-3-1-1-beta10`.
- Não há `private:true`, `setAuth()` ou transporte autenticado ativo no bundle instalado.

Team Lite verifica a própria sessão e geração local antes de processar o comando, mas isso não autentica o emissor do broadcast.

**#146** muda o listener Normal para receber apenas um aviso e agendar polling autenticado. **#76** possui proteção equivalente para comandos. O template do dispatcher #143 ainda contém o handler antigo que executa o payload recebido; a comparação #143 ↔ #146 retorna branches divergentes (10 commits à frente e 15 atrás para #146). Não publicar o dispatcher atual.

### Sinalização de chamadas, voz e tela

A #149 introduz `receiveCallSignal(p, authenticatedSource)` com proveniência fora do payload e permite, quando o transporte seguro está habilitado, somente hints públicos explícitos `presence` e `ended`. O marcador controlável pelo payload `_authenticatedTransport` foi removido.

Entretanto, `signalTransportFlag` continua default `false` e o endpoint autenticado começa vazio. Com a flag desligada, o guard de origem não é aplicado e os listeners públicos continuam ativos. Portanto, #149 é uma melhoria do caminho opt-in, não uma correção segura por padrão. O Normal #146 ainda não possui transporte server-mediated equivalente para voz/tela.

## Realtime, RLS, grants e SECURITY DEFINER

Snapshot read-only de produção:
- 109 linhas em `realtime.messages`, todas `private=false`: 57 `user_status`, 40 `db_change`, 6 `remote_command`, 6 `remote_result`.
- Triggers publicam no tópico legado `upstatus-live-6f8c-4d8f-ae5a-91c7b2d6e4f0` (identificador completo conferido no SQL: `upstatus-live-6f8c-4d8f-ae5a-91c7b2d6e4f0`); os clientes usam o tópico beta10. Os tópicos não coincidem.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; anon/authenticated possuem SELECT, INSERT e UPDATE efetivos.
- `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users`: SECURITY DEFINER, `search_path=public`, retorno `trigger`, uma trigger anexada a cada função, EXECUTE efetivo para anon/authenticated.
- `upstatus_broadcast_messages` envia `to_jsonb(CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END)` em `db_change`, com `private=false`.
- O trigger de remote state envia campos de comando e resultado no tópico legado, também com `private=false`.

O Advisor conta seis WARN relacionados a SECURITY DEFINER (três funções para cada papel cliente) e dez INFO em produção. As funções retornam `trigger`; não foi demonstrada chamada RPC direta. O problema concreto confirmado é a configuração de execução ampla combinada com broadcasts públicos, não uma exploração RPC reproduzida.

### RLS e privilégios de tabela

- 10 tabelas públicas com RLS e zero policies.
- Nove tabelas públicas possuem grants diretos amplos para anon e authenticated: 126 grants no total.
- 18 grants TRUNCATE (nove tabelas para dois papéis); RLS não protege TRUNCATE.
- Storage: 32 grants diretos.
- Realtime: 8 grants diretos.
- Total observado nas três schemas: 166 grants.
- Default ACL: 120 itens expandidos para anon/authenticated em public, storage, graphql e graphql_public, incluindo privilégios MAINTAIN, TRIGGER e TRUNCATE.

## Storage e mensagens

- `chat-images`: público, 168 objetos, limite 20 MiB.
- `profile-images`: público, 20 objetos, limite 20 MiB.
- `storage.objects`: zero policies próprias.
- `public.messages`: 296 linhas; todas com `file_name IS NULL`.
- Tipos: 241 text, 17 image, 7 audio, 5 document, 4 video, 22 system.

## AUTH-03 e proveniência de migrations

Produção:
- Cinco usuários; três `implementation_admin` e dois `implementation_user`.
- Zero password hashes vazios e zero papéis vazios.
- Nenhuma coluna `setup_token_*`.
- Tabela de rate limit de convites ausente.
- RPCs de convite/rate limit ausentes.

Laboratório:
- Colunas `setup_token_expires_at`, `setup_token_issued_at`, `setup_token_hash`, `setup_token_issued_by`.
- Tabela de rate limit presente.
- `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` são SECURITY INVOKER, `search_path` vazio e EXECUTE restrito a service_role.
- Nove tabelas de fixtures consultadas estavam vazias.

A migration `20261109230000_setup_invite_rate_limit.sql` e seu teste possuem SHA idênticos entre Normal #131 e Team Lite #76:
- Migration: `ab73b5cd8200147a449327d21798eef588834d50`.
- Teste: `bd12f37dc464c3b1ab322494914d0763fa733d49`.

Produção registra sete migrations; o laboratório tem 39. Quatro SQLs históricos correspondentes ao ledger de produção retornaram 404 no branch master:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

O dispatcher #143 deve continuar falhando fechado para essas fontes sem blob original validado. Seu manifesto também precisa incluir a migration AUTH-03 quando a integração for reconciliada.

## Edge Functions e ambientes

- Produção: 38 Edge Functions ACTIVE; as 38 reportam `verify_jwt=false`. Isso não prova ausência de autenticação nos handlers; os endpoints UpStatus principais usam sessão/token próprio e precisam ser avaliados individualmente.
- Laboratório: duas Edge Functions ACTIVE: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Nenhuma função server-mediated de sinalização está implantada na produção.
- A organização possui dois projetos Supabase: produção e `upstatus-security-test`. Não existe terceiro projeto full-product TEST.
- O laboratório tem 39 migrations, zero grants diretos de tabela public para anon/authenticated e as fixtures consultadas estavam vazias.
- A branch gerenciada de produção `main` continua `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`.

## Issues e aceitação manual

Issue #78 permanece OPEN com **0/8 critérios físicos marcados**. Os oito itens seguem desmarcados, incluindo reconexão sem F5 para Normal e Team Lite, reentrada em sala, novas chamadas, ausência de peers órfãos/polling duplicado, continuidade de participantes, CI e teste manual no navegador.

Nenhum teste físico foi executado nesta rodada. Os testes WebRTC citados acima são CI automatizado com navegador/fixtures isolados; não substituem Tampermonkey real, microfone, permissão de tela ou queda de rede física.

## Gates reavaliados

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 109 eventos private=false, zero policies em realtime.messages, grants de cliente e tópico divergente |
| TEST-ISOLATION | DONE | Projeto de laboratório separado, workflows isolados e fixtures consultadas vazias; ainda não há ambiente full-product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais retornam 404 em master; dispatcher exige proveniência |
| AUTH-03 | IN_PROGRESS | Candidatas Normal/Team Lite e testes passaram; produção não tem tokens, RPCs ou rate limit |
| ACL-STORAGE | BLOCKED | 126 grants public, 120 Default ACL items, TRUNCATE, buckets públicos e zero policies Storage |
| RECONNECT | PENDING | Issue #78 0/8; sem confirmação física de Ricardo |
| HUMAN-REVIEW | PENDING | PRs Draft, sem reviews humanas e sem autorização explícita |

## Ações desta execução e limites

- Leitura integral do documento de prontidão e conferência de heads.
- Inspeção das PRs #74, #75, #76, #82, #143, #146, #147, #148 e #149, arquivos alterados e logs de workflows.
- Decodificação read-only dos userscripts embutidos nas Edge Functions Normal e Team Lite.
- Consultas SQL somente SELECT em produção e laboratório.
- Nenhum teste local novo, rerun ou workflow iniciado pela QA.
- Nenhuma alteração em código de produto, secrets, flags, roles, grants, policies, ACL, migrations, produção ou publicação.
- Única escrita no GitHub: este novo relatório documental na branch QA e atualização do comentário QA já existente na Issue #79. O comentário da Engenharia não foi alterado.
