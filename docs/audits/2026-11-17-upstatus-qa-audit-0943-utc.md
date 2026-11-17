# Auditoria independente de qualidade do UpStatus
**Execução:** 2026-11-17T09:43:28.428Z  
**Escopo:** GitHub `Reekyi/UpStatus`, Supabase produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.  
**Recomendação:** **NOT READY**.

## 1. Método e limites
- Inspeção read-only de GitHub, workflows, PRs, issues, Edge Functions, logs, Advisors e catálogos PostgreSQL.
- Nenhum teste de produto foi iniciado pela QA nesta execução. Os resultados de CI foram inspecionados nos logs existentes.
- Nenhum teste físico em Tampermonkey/Sale Smartly foi realizado.
- Nenhuma escrita em produção, migration, deploy, merge, release, publicação de userscript, secret, flag ou permissão foi feita.
- Única escrita prevista nesta execução: este relatório novo na branch QA dedicada e a atualização do comentário QA já existente na Issue #79.

## 2. Heads reais e estado do repositório
Heads consultados:
| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` antes deste relatório | `d46dbfa97707698de034292e5c1cbdc5268b23b1` |

As branches `master`, `develop` e `team-lite-official` retornaram `protected=false`. A proteção da branch QA não foi inferida a partir dessas três consultas. Existe outra branch chamada `qa/release-readiness-2026-11-04`; ela não foi usada.

O documento [docs/RELEASE_READINESS.md](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md) foi lido integralmente (8.423 linhas, aproximadamente 1,046 MB). O último checkpoint datado no próprio documento é de 15/11/2026 06:30 UTC, portanto o documento principal não incorpora esta fotografia de 17/11.

## 3. PRs, commits e revisões
| PR | Base | HEAD | Arquivos | Estado observado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | master `a9288ccf...` | `dcaf6a072546eda0089e0cee4018c3047011f600` | 90 | Draft, sem review |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | team-lite-official `9065bc1...` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 10 | Draft, sem review |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | team-lite-official `9065bc1...` | `00a578e9174e08238a1289a35feb02d171625421` | 59 | Draft, sem review |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | master `a9288ccf...` | `d46dbfa97707698de034292e5c1cbdc5268b23b1` | 227 | Draft, sem review |
| [#131 AUTH-03](https://github.com/Reekyi/UpStatus/pull/131) | `chore/continuity-foundation` `fb878537...` | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | 6 | Smoke PASS, divergente |
| [#176 Migrations](https://github.com/Reekyi/UpStatus/pull/176) | develop | `b50f8567392322b4309468e0fe9e6fc81ca38c1d` | 6 | Validate FAIL |

- #74, #75, #76 e #82 têm zero reviews registradas.
- #76 contém #75 como ancestral: 330 commits à frente e zero atrás. Não são duas entregas independentes.
- #131 diverge da #74: 1 commit à frente e 4 atrás. A melhoria de rate limit não está integrada ao HEAD da #74.
- #82 contém 227 arquivos, todos Markdown. O Validate ainda falha, mas a alteração não é código funcional.
- O HEAD base registrado nas PRs #74 e #82 não coincide com o HEAD atual de master; atualizar a base e revalidar antes de qualquer integração.

## 4. CI existente: resultados e escopo
**#74 Normal**
- Validate e Smoke aprovados no HEAD `dcaf6a0`.
- 19/19 verificações não autenticadas e 136/136 autenticadas.
- Playwright/Chromium: negociação WebRTC de chamada, áudio de voz e vídeo de tela; entrega de tracks remotas e teardown.
- Mesh autenticado de três participantes.
- Rate limit de sinalização: 90 aceitos e o seguinte rejeitado com HTTP 429 e Retry-After 60.
- Recibos de leitura atômicos e setup por convite exercitados no laboratório isolado.
- Não substitui teste físico no Sale Smartly. O teste de rate limit de emissão de convites não está no Smoke da #74.

Evidência: [#74 Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200).

**#75 Team Lite**
- Candidate Checks PASS em 03/11.
- Verificou versão 3.4.31, sintaxe, portais Lucca/Ycaro, isolamento de sessão convidada e cenários do updater.
- Não executou integração autenticada de voz/tela ou backend.

Evidência: [#75 Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127).

**#76 Team Lite**
- Contratos offline de upload assinado: 11/11 aprovados.
- A etapa de integração autenticada recebeu HTTP 402 do projeto de laboratório; 0/16 verificações não autenticadas passaram.
- Playwright e etapas autenticadas posteriores foram ignorados. Não classificar como reprovação funcional do Team Lite.

Evidência: [#76 Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235).

**#82 QA**
- Validate falha em `scripts/validate.mjs:26`, erro `production updateURL mismatch`.
- Causa está na divergência entre o build de master e o validador, não nos 227 Markdown.

Evidência: [#82 Validate 44049163029](https://github.com/Reekyi/UpStatus/actions/runs/44049163029).

**#131 AUTH-03**
- Smoke PASS: 136/136 autenticadas, 19/19 não autenticadas, browser WebRTC, mesh, rate limit de sinalização e concorrência de emissão de convites.
- O teste de rate limit de convites foi exercitado no laboratório.
- PR diverge da #74 (1 à frente, 4 atrás), então o resultado não prova integração na candidata Normal principal.

Evidência: [#131 Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798).

**#176 Migrations**
- Validate falha em `client signed upload helper missing`.

Evidência: [#176 Validate 43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839).

## 5. Build, distribuição e workflows
### Normal
O bundle atualmente servido por `upstatus` é 3.4.7; seu `@updateURL` e `@downloadURL` apontam para `/upstatus/upstatus.user.js`. Entretanto, o `CLOUD_SERVER` do mesmo bundle aponta para beta10. A função beta10 v6 declara código interno/userscript 3.1.1-beta8. Assim, distribuição e API permanecem em versões diferentes.

O build de master ainda deriva o updateURL de `CLOUD_SERVER` (beta10), enquanto o validator exige `/upstatus/upstatus.user.js`; isso explica o erro da #82. A candidata #74 corrige o updater usando `release.json.scriptUrl`, mas mantém `CLOUD_SERVER` em beta10. O workflow candidato publica somente `upstatus`, não o backend beta10 que o cliente continua chamando.

A candidata Normal continua com `release.json.version=3.4.7`, igual à versão já instalada. O build exige versão estritamente maior para sincronizar o artefato raiz quando o conteúdo diverge. Não há incremento de versão pronto para um novo release.

O workflow de produção candidato melhora o controle: exige branch master, SHA conferido, projeto `dlfvkawaiqduhlazsszm` e CLI 2.122.1. Ainda fixa a versão em 3.4.7 e faz deploy somente de `upstatus`.

### Team Lite
O workflow `deploy-production.yml` da branch oficial e o da candidata continuam usando CLI `latest`, secret genérico `SUPABASE_PROJECT_ID`, sem validação equivalente de projeto/SHA, e fazem deploy do slug `upstatus`, não `upstatus-team-lite`. Se executado no ambiente de produção, pode sobrescrever a função Normal. **Não executar.**

### TEST
O workflow de master usa `SUPABASE_PROJECT_ID` genérico e publica `upstatus-test`; a função ativa `upstatus-test` v281 está no projeto de produção. Não é um Full-Product TEST independente.

A candidata #76 melhora o workflow manual: exige `vars.SUPABASE_TEST_PROJECT_ID`, recusa produção e o projeto de sinalização, fixa CLI 2.122.1 e exige correspondência entre build e deploy. Mas não existe terceiro projeto configurado. O build também recusa usar produção ou o laboratório de sinalização como TEST completo.

## 6. Supabase: projetos, Edge Functions, logs e migrations
Existem somente dois projetos na organização:
- Produção `UpStatus`, ref `dlfvkawaiqduhlazsszm`, status ACTIVE_HEALTHY.
- Laboratório `upstatus-security-test`, ref `bfpjtfqlnypisxljoxkb`, status ACTIVE_HEALTHY.

O laboratório possui somente duas Edge Functions (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3), zero usuários, mensagens, sessões, salas, membros, eventos, bindings, rate-limit rows, call attempts, voice attempts e chat reads; também não há buckets Storage. É laboratório de sinalização/autenticação, não Full-Product TEST.

### Edge Functions
Produção tem 38 funções ACTIVE e todas retornam `verify_jwt=false`. Entre elas: `upstatus` v480, `upstatus-team-lite` v15, beta10 v6, `upstatus-test` v281 e vários slugs beta/test/backup ainda ativos. Isso não prova que todas estejam sem autenticação, pois há validação customizada em algumas rotas; exige inventário individual e retirada controlada das funções obsoletas. Não foi executado teste de acesso nessas rotas.

### Logs HTTP
Janela consultada: 16/11/2026 09:32 UTC a 17/11/2026 09:32 UTC.
- Produção: 77.945 respostas HTTP 402. Chat 41.638; status 18.110; status remoto 18.092; conta/membros/usuário 99; distribuição 6. Último evento observado 17/11 08:38:43 UTC. Não há evento posterior no stream consultado; não afirmar recuperação nem falha contínua depois desse ponto. Causa de produção não identificada.
- Laboratório: 48 respostas HTTP 402 em 16/11, entre 12:37 e 12:41 UTC. Os logs/CI identificam `exceed_edge_functions_invocations_quota`. A quota bloqueou o smoke autenticado.

### Migrations
- Produção: 7 migrations.
- Laboratório: 39 migrations.
- Branch Supabase `main` da produção: `MIGRATIONS_FAILED`; preview status ACTIVE_HEALTHY.
- #176 continua falhando. Evidência anterior de correspondência de quatro statements com o ledger não comprova bytes originais nem replay completo; manter MIGRATION-PROVENANCE em andamento.

## 7. Segurança PostgreSQL, Storage e Realtime
### Produção
- Advisor: 10 INFO de RLS habilitado sem policy; 3 WARN de SECURITY DEFINER executável por anon e 3 WARN por authenticated.
- Nove tabelas públicas de aplicação têm grants SELECT/INSERT/UPDATE/DELETE/TRUNCATE para anon e authenticated. RLS sem policy bloqueia DML comum por linha, mas não torna TRUNCATE aceitável; nenhum exploit foi executado.
- `realtime.messages`: RLS habilitado, zero policies, grants SELECT/INSERT/UPDATE para anon/authenticated.
- Três funções SECURITY DEFINER de broadcast usam `search_path=public` e grants EXECUTE amplos. Retornam trigger; o Advisor reporta exposição RPC, mas execução direta não foi testada.
- Default ACLs amplas em public/storage e schemas auxiliares.
- Buckets públicos `chat-images` (168 objetos) e `profile-images` (20 objetos), ambos sem policies próprias; acesso público de leitura decorre da configuração dos buckets. Grants de Storage também são amplos. Não foi testado upload/download externo.

### Realtime
- Snapshot: 106 mensagens no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, todas `private=false`, último evento em 13/11.
- Trigger de `messages` envia `to_jsonb(OLD/NEW)` no evento `db_change`, ou seja, linha completa.
- Trigger de `upstatus_state` publica metadados de comandos/resultados remotos.
- Trigger de `users` publica nome/status/reason/updated_at/sync.
- A configuração de projeto “Allow public access” não está disponível pelo conector; alcance externo não foi reproduzido.

### Laboratório
- Advisor: 18 INFO de RLS sem policy, sem WARN de SECURITY DEFINER.
- Grants diretos nas tabelas de aplicação foram revogados e funções trigger têm search_path vazio sem EXECUTE para anon/authenticated.
- Ainda há grants amplos em Realtime/Storage e default ACLs em schemas public/storage; zero buckets e zero fixtures no snapshot atual.

## 8. Compatibilidade e riscos dos clientes
- Normal instalado 3.4.7: API beta10, tópico `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite instalado 3.4.30: API própria, mesmo tópico beta10.
- API beta10 v6 serve script 3.1.1-beta8 e tópico beta8.
- Triggers PostgreSQL publicam em `upstatus-live-...`; clientes instalados continuam assinando beta10. As notificações emitidas por esses triggers não chegam ao tópico que os clientes atuais escutam; o comportamento manual não foi testado.
- Candidatas #74/#76 alinham o tópico a `upstatus-live`, mas o transporte autenticado começa desligado (`signaling_transport_enabled=false`) e o fallback público permanece.
- O endpoint autenticado `upstatus-signal-test` só existe no laboratório; a candidata exige mesma origem da API, portanto não pode usar diretamente o endpoint de outro projeto em produção.
- No bundle Normal instalado, o listener de `remote_command` chama `executeRemoteCommand` após validar somente o target do payload; `syncSaleSmartly` acontece antes da confirmação no backend. Team Lite exige sessão local, mas também não prova identidade do remetente no evento.
- Os handlers de voz/tela confiam em `from`, `roomId` e `to` do payload. Em voz ativa, um offer aceito pode criar peer e anexar tracks locais do microfone; com compartilhamento ativo, o peer de tela pode anexar tracks locais da tela. É um caminho estático de spoofing condicionado à possibilidade de publicar no canal público e à sessão já estar em voz/tela; não foi explorado. **Tratar como bloqueador de segurança até autenticação/membership server-side e canal privado serem comprovados.**
- A candidata reduz o evento remoto a wake-up/poll autenticado, mas ainda deixa fallback público e transporte autenticado desligado por padrão.

## 9. AUTH-03
- Produção tem cinco contas, nenhuma com password_hash ou role vazio, mas `public.users` não tem colunas `setup_token_*` e não há RPC de consumo de convite/rate limit.
- Runtime instalado ainda permite primeiro setup sem token; papel admin pode ser inferido por nomes fixos (Ricardo/Lohan/Guilherme). `/api/chat/clear` no runtime instalado valida nome literal Ricardo, sem exigir role; candidata #74 adiciona role check, mas mantém nome fixo.
- Candidata Normal #74 exige convite, mas não chama rate limit de emissão.
- Team Lite #76 inclui rate limit.
- #131 adiciona rate limit de cinco convites por admin/900 s e passou no Smoke, mas diverge da #74 (1 à frente/4 atrás). Não integrado em produção.

## 10. Issues e Control Center
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados; nenhum teste de reconexão sem F5 confirmado.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): checklist 16/35, 19 pendentes. O comentário QA dedicado foi atualizado in-place; comentário da Engenharia preservado. O feed desta execução diferencia inspeção concluída de quota bloqueada, sem afirmar correção de produto.

## 11. Gates QA
| Gate | Estado | Justificativa |
|---|---|---|
| RT-01 | blocked | Broadcasts públicos, sem policies, clientes em tópico antigo e sem transporte autenticado padrão. |
| TEST-ISOLATION | blocked | Apenas laboratório de sinalização; não há terceiro Full-Product TEST. |
| MIGRATION-PROVENANCE | in_progress | 7/39 ledger entries; PR #176 falha e original byte-for-byte/replay não provados. |
| AUTH-03 | in_progress | #131 Smoke PASS, mas divergente; produção não tem convite/RPC. |
| ACL-STORAGE | blocked | Grants, default ACLs e buckets públicos em produção; lab ainda com ACLs de Storage/Realtime. |
| RECONNECT | pending | Sem teste físico de Normal e Team Lite sem F5. |
| HUMAN-REVIEW | pending | Sem review/aprovação explícita e sem autorização de release. |

## 12. Próximos passos
1. Identificar a causa dos 402 de produção e restaurar quota do laboratório com o proprietário da organização.
2. Criar Full-Product TEST dedicado e separado do projeto de sinalização.
3. Integrar/reconciliar #131 com #74 e unificar AUTH-03.
4. Fechar canal público de voz/tela, validar membership/identidade server-side e remover fallback público antes de qualquer uso sensível.
5. Alinhar distribuição, API e versões; atualizar workflow Normal e corrigir slug/guards do Team Lite.
6. Revisar 38 Edge Functions, RLS, grants, default ACLs, SECURITY DEFINER e Storage.
7. Validar migrations em ambiente isolado e recuperar proveniência original.
8. Executar os oito testes físicos da #78 e obter aprovação humana.

**Conclusão:** manter `not_ready`. Os resultados automatizados da #74/#131 são úteis, mas não compensam o desalinhamento do runtime instalado, a exposição Realtime, os 402, a ausência de Full-Product TEST e a falta de aceitação física.