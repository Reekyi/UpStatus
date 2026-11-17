# UpStatus — auditoria independente QA
Data: 2026-11-14T22:42:32.225Z
Repositório: Reekyi/UpStatus
Projeto Supabase de produção: dlfvkawaiqduhlazsszm
Projeto Supabase de laboratório: bfpjtfqlnypisxljoxkb

## Resultado executivo

**RELEASE: NOT READY.** Esta rodada foi somente inspeção. Nenhum teste local ou manual foi executado pela QA; os resultados automatizados abaixo foram lidos nos logs existentes do GitHub Actions. Não havia checkout local nem navegador/Tampermonkey disponível para aceitação física.

Achados prioritários:

1. Produção continua transmitindo a linha completa de public.messages em broadcast Realtime com private=false. O setting de acesso público do Dashboard não está disponível para inspeção, portanto a exposição externa efetiva não foi reproduzida.
2. As três funções de broadcast em produção são SECURITY DEFINER, usam search_path=public e têm EXECUTE para PUBLIC, anon e authenticated. O Security Advisor reporta 3 WARN para anon e 3 para authenticated. Não foi feita chamada RPC.
3. O laboratório já contém hardening relevante: payload de broadcast reduzido a {op}, search_path vazio e EXECUTE restrito a service_role. Isso ainda não está em produção; o canal continua private=false.
4. O transporte server-mediated continua desativado por padrão e não existe a função upstatus-signal em produção. O endpoint upstatus-signal-test está em outro projeto e o cliente exige mesma origem.
5. O Validate da PR #82 falha no HEAD atual. A PR #167 passa Validate, mas não tem Smoke ou teste manual.
6. O Smoke adicional da PR #165 falhou por quota de Edge Functions do laboratório, antes de iniciar a suíte autenticada.
7. A recuperação de migrations na PR #135 preserva statements do ledger, não os arquivos SQL originais nem sua proveniência Git.
8. Branches master, develop, team-lite-official e QA retornam protected=false; a API de rulesets retorna lista vazia.

## Heads e integridade

Snapshot dos heads consultados:

| Branch | HEAD | Protected |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | false |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 | false |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | false |
| QA | bbc922a058af9a22b6a80095604eaff79a8960ec | false |

A API de repository rulesets retornou lista vazia. Não há branch protection clássica reportada para as quatro branches consultadas.

Comparações:

- QA contra master: 320 commits à frente, 1 atrás; 170 arquivos divergentes, todos documentais na PR #82.
- #74 contra master: 887 commits à frente, 1 atrás; 90 arquivos alterados.
- #75 contra team-lite-official: 59 commits à frente, 0 atrás; 10 arquivos.
- #76 contra team-lite-official: 386 commits à frente, 0 atrás; 57 arquivos.
- #76 está 327 commits à frente de #75, portanto #75 é baseline ancestral, não uma entrega independente.
- #166 está 6 commits à frente do HEAD de #76.
- #167 está 15 commits à frente de master.

As PRs #74, #75, #76, #82, #165, #166 e #167 não possuem reviews submetidas no endpoint de reviews consultado.

## Documento central de prontidão

Li integralmente docs/RELEASE_READINESS.md na branch QA. O arquivo tem 1.050.184 caracteres e 5.746 linhas. O último checkpoint interno é 08/11/2026 15:30 BRT / 18:30 UTC.

O documento está desatualizado em relação aos heads, workflows, PRs e estado atual do Supabase. Foi criado este relatório separado para evitar substituir ou reescrever o documento central de 1 MB.

## PRs obrigatórias e CI

| PR | HEAD | Resultado observado |
|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | Validate e Smoke PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | Candidate Checks PASS |
| #82 QA | bbc922a058af9a22b6a80095604eaff79a8960ec | Validate FAIL |

### #74 Normal

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- Log: 19/19 verificações não autenticadas e 136/136 autenticadas.
- Chromium/Playwright validou negociação WebRTC e entrega de áudio para chamada, sala de voz e compartilhamento de tela, teardown e malha autenticada de três participantes.
- Rate limit distribuído: 90 aceitos; o seguinte foi rejeitado com HTTP 429 e Retry-After de 60 segundos.
- Fixtures temporários foram limpos.
- Isso é CI no laboratório, não teste físico nem produção.

### #75 Team Lite baseline

- Candidate Checks histórico: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- PASS histórico, mas #76 descende desta baseline e contém 327 commits adicionais.

### #76 Team Lite

- Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- Log: 16/16 verificações não autenticadas e 110/110 autenticadas.
- Chromium validou WebRTC de chamada, voz e tela, teardown, recuperação e malha de três participantes.
- Rate limit distribuído: 90 aceitos; o seguinte recebeu HTTP 429 e Retry-After de 60 segundos.
- Isso é CI no laboratório, não teste físico nem produção.

### #82 QA

- Validate no HEAD exato: https://github.com/Reekyi/UpStatus/actions/runs/43644110450
- Falha em scripts/validate.mjs:26: production updateURL mismatch.
- O commit de QA é documental, mas o workflow herdado ainda executa o validator de master e falha.
- Não foi iniciado rerun pela auditoria.

## Candidatas adicionais relevantes

### #165 Normal — proveniência de origem

- HEAD: 434478771dca54505d3ec8b0cea0ada57d8d6dca.
- Guard offline PASS em push: https://github.com/Reekyi/UpStatus/actions/runs/43619663713.
- Smoke falhou: https://github.com/Reekyi/UpStatus/actions/runs/43619663747.
- O projeto de laboratório respondeu HTTP 402 com exceed_edge_functions_invocations_quota; 0/19 verificações não autenticadas passaram e a etapa autenticada não foi executada.
- O workflow normal-call-source-guard.yml da PR tem gatilho push, sem pull_request. O Smoke existente filtra a base master, enquanto a PR #165 usa outra branch-base. Assim, os checks observados são push checks, não uma aprovação integrada de PR.

### #166 Team Lite — proveniência de origem

- HEAD: e90e0dbbc0c6d89d77ea359dff0f1e82b4428413.
- Guard PASS em push e pull_request: https://github.com/Reekyi/UpStatus/actions/runs/43624542624 e https://github.com/Reekyi/UpStatus/actions/runs/43624572780.
- A correção remove _authenticatedTransport do payload, passa authenticatedSource fora do payload e restringe sinais públicos de descoberta a presence/ended com discoveryOnly=true.
- Não encontrei Smoke integrado no HEAD #166; a evidência é o guard offline.

### #167 Builder e chat

- HEAD: d100b0820dd7f98e2b78a98e6b6f8c09f13b1867.
- Validate PASS: https://github.com/Reekyi/UpStatus/actions/runs/43635704388.
- O builder usa release.scriptUrl e separa URL de distribuição do endpoint de API. O validator exige updateURL/downloadURL iguais ao scriptUrl estável e preserva Normal beta10 como API até cutover coordenado.
- A limpeza do chat exige Ricardo e o papel persistido implementation_admin, não apenas o nome de exibição.
- Anexos ficam pendentes no composer até o envio da mensagem e devem ser restaurados em caso de falha. É mudança funcional que ainda requer teste manual.
- Não houve Smoke Supabase nem teste manual na #167.

## Proveniência do transporte autenticado

Os candidatos #165/#166 removem o marcador controlável _authenticatedTransport e passam a fornecer a origem como argumento separado. A allowlist pública é limitada a sinais de descoberta presence/ended com discoveryOnly=true.

Entretanto, signalTransportFlag continua false por padrão e signalTransportEndpoint vazio. O cliente exige endpoint HTTPS de mesma origem, no caminho /functions/v1/upstatus-signal ou /upstatus-signal-test.

Não há função upstatus-signal em produção. upstatus-signal-test v32 existe somente no laboratório. O endpoint do laboratório tem outra origem, portanto não pode ser configurado como endpoint de produção respeitando a validação same-origin. Os listeners públicos legados permanecem ativos quando a flag está desligada.

Os templates Normal e Team Lite inspecionados não contêm as rotas server-mediated /signal e /room. A árvore candidata contém apenas a função de teste, não um runtime server-mediated de produção.

## Updater e workflows de publicação

### Updater

O userscript Normal instalado é 3.4.7 e o updateURL estável servido por upstatus v480 está correto. O API server usado pelo Normal instalado continua sendo upstatus-screen-share-3-1-1-beta10 v6. Team Lite instalado é 3.4.30 e usa upstatus-team-lite v15.

A #167 corrige o builder e o Validate no seu próprio HEAD. Isso não altera o runtime instalado nem corrige automaticamente o Validate de master/#82.

### Workflow Normal candidato #74

- Manual-only.
- Exige refs/heads/master, SHA de checkout igual a GITHUB_SHA, projeto esperado dlfvkawaiqduhlazsszm e token presente.
- Fixa Supabase CLI 2.122.1.
- Deploya somente a função upstatus.
- Não coordena deploy da API beta10 nem de um endpoint de sinalização server-mediated.

### Workflow Normal em master

- Manual-only.
- Guarda versão estável 3.4.7.
- Usa Supabase CLI latest.
- Deploya upstatus.
- Não tem as verificações de SHA/projeto encontradas na candidata #74.

### Workflow oficial Team Lite

- Manual-only.
- Usa Supabase CLI latest.
- Não valida explicitamente SHA e projeto de destino.
- Executa supabase functions deploy upstatus, não upstatus-team-lite.
- Não despachar esse workflow.

## Supabase — produção

Projeto dlfvkawaiqduhlazsszm:

- Projeto consultado ACTIVE_HEALTHY.
- 38 Edge Functions ACTIVE; todas reportam verify_jwt=false no gateway. Isso não prova ausência de autenticação, pois os handlers core usam token de sessão próprio.
- Funções relevantes: upstatus v480 (distribuição), upstatus-screen-share-3-1-1-beta10 v6 (API Normal), upstatus-team-lite v15 (API Team Lite) e upstatus-test v281.
- Não existe função upstatus-signal em produção.
- 7 migrations no ledger.
- Branch gerenciada main continua MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.

### Auth e identidade

- auth.users: 0.
- public.users: 5.
- upstatus_sessions: 319.
- upstatus_profiles: 5.
- Sessões e perfis não têm user_id.
- Zero colunas setup_token_*.
- Zero tabelas upstatus_signal_*.

A autenticação do produto é customizada; não se deve interpretar auth.users=0 como inexistência de contas do UpStatus.

### RLS, grants e Default ACL

- 10 tabelas públicas têm RLS habilitado e zero policies.
- 9 tabelas públicas concedem a anon e authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- RLS não protege TRUNCATE; não foi demonstrada chamada REST que execute TRUNCATE.
- Default ACL: 24 registros e 75 itens ACL.
- realtime.messages: RLS true, FORCE RLS false, zero policies; anon/authenticated têm SELECT, INSERT e UPDATE.

### SECURITY DEFINER

As três funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users:

- SECURITY DEFINER.
- search_path=public.
- EXECUTE concedido a PUBLIC, anon, authenticated e service_role.
- Advisor: 3 WARN para anon e 3 WARN para authenticated, com referências a /rest/v1/rpc.
- Não foi realizada chamada RPC. Como as funções retornam trigger, a invocabilidade direta HTTP não foi reproduzida; os grants amplos continuam desnecessários e devem ser revistos.

### Realtime

Snapshot read-only: 106 linhas em realtime.messages, todas private=false:

| Evento | Quantidade |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_command | 4 |
| remote_result | 4 |

- upstatus_broadcast_messages serializa OLD/NEW completo via to_jsonb.
- upstatus_broadcast_remote_state publica campos de comando/resultado.
- upstatus_broadcast_users publica name, status, reason, updated_at e sync.
- Tópico dos triggers: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- Tópico dos clientes instalados: upstatus-screen-share-live-3-1-1-beta10.
- Os clientes não usam private:true nem realtime.setAuth().

O setting Allow public access do Dashboard não foi exposto pelo conector. Não houve exploração externa ou reprodução de acesso; o achado é um caminho de exposição potencial confirmado estaticamente, não um vazamento externo comprovado.

### Storage

- chat-images: público, 20 MiB.
- profile-images: público, 20 MiB.
- 188 objetos no total, conforme snapshot.
- storage.objects: zero policies; anon/authenticated têm DELETE, INSERT, SELECT e UPDATE.
- A leitura por URL pública não prova isolamento por usuário. Não foi feita tentativa de upload, exclusão ou download de objeto.

### Security Advisor

Produção:
- 10 INFO de RLS habilitado sem policy.
- 3 WARN para anon e 3 WARN para authenticated nas funções SECURITY DEFINER.
- Health e Performance Advisors sem findings nesta consulta.

## Supabase — laboratório

Projeto bfpjtfqlnypisxljoxkb:

- 39 migrations.
- 2 Edge Functions ACTIVE: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- 0 usuários, 0 sessões, 0 perfis, 0 buckets, 0 objetos e 0 mensagens Realtime.
- 4 colunas setup_token_* e 7 tabelas upstatus_signal_*.
- 18 tabelas públicas com RLS e zero policies; sem grants diretos anon/authenticated nas tabelas públicas consultadas.
- storage.objects ainda tem grants anon/authenticated DELETE/INSERT/SELECT/UPDATE e zero policies, mas não há buckets.
- Default ACL: 25 registros e 70 itens ACL.
- Security Advisor: 18 INFO, 0 WARN.

### Hardening de broadcast no laboratório

As três funções de broadcast continuam SECURITY DEFINER, mas:

- search_path vazio.
- EXECUTE somente para postgres e service_role.
- Nenhum EXECUTE efetivo para anon/authenticated.
- O payload transmitido é somente {op: TG_OP}, inclusive em db_change, remote_command, remote_result e user_status.
- O canal ainda usa private=false e não há linhas/partições no snapshot.

Isso é progresso real no laboratório, não prova de migração em produção.

### Contrato HTTP 409 de voz

O source da função candidata #74 mapeia VOICE_ATTEMPT_CONFLICT e VOICE_ATTEMPT_ALREADY_ACTIVE para 409. O source implantado no laboratório v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE.

O teste autenticado da #74 chama diretamente serviceRpc para o singleton e verifica o corpo do erro, não o status HTTP da função. Portanto, a evidência CI atual não comprova o contrato HTTP 409 para VOICE_ATTEMPT_ALREADY_ACTIVE no endpoint implantado. O helper cliente aceita ambos os nomes de erro, mas o status real continua pendente.

## Migrations e proveniência

PR #135: https://github.com/Reekyi/UpStatus/pull/135

- Draft, aberta, 6 arquivos, head 98e96cfe.
- Recupera quatro statements de supabase_migrations.schema_migrations por SELECT read-only.
- Cada registro tem um statement e rollback NULL.
- Os arquivos ficam em docs/migration-recovery, fora de supabase/migrations.
- O README e o manifest declaram expressamente que não são os arquivos originais: comentários, formatação e commit/blob original não são comprovados.
- A PR #135 não está incorporada à branch QA atual.

A afirmação anterior de “4/4 comparações exatas” só pode ser entendida como correspondência do texto recuperado com o ledger de produção, não como recuperação byte a byte das fontes SQL originais. MIGRATION-PROVENANCE permanece bloqueado.

## Issues e aceitação manual

- Issue #78: OPEN, 0/8 critérios marcados. Reconexão sem F5, nova chamada após queda, microfone, tela, peers/pollers e teste manual continuam pendentes.
- Issue #79: OPEN, 16 itens marcados e 19 pendentes no corpo. O checklist ainda referencia heads antigos de #74/#76 e runs históricos; os itens manuais marcados pertencem ao fluxo legado e não substituem aceitação física dos candidatos atuais.

Nenhum teste manual foi executado nesta rodada. Não houve navegador/Tampermonkey real, queda física de rede, captura de microfone ou tela.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcasts públicos em produção, payload completo e ausência de endpoint autenticado de produção |
| TEST-ISOLATION | blocked | Laboratório isolado, mas sem fixtures persistentes/full-product e Smoke adicional bloqueado por quota |
| MIGRATION-PROVENANCE | blocked | PR #135 recupera statements do ledger, não fontes originais |
| AUTH-03 | blocked | Produção sem setup tokens, user_id e rate limit de convite equivalente |
| ACL-STORAGE | blocked | Grants, Default ACL, funções SECURITY DEFINER e Storage ainda amplos em produção |
| RECONNECT | pending | Issue #78 0/8 e nenhum teste físico |
| HUMAN-REVIEW | pending | PRs obrigatórias sem reviews; nenhuma autorização de release |

## Próximas prioridades

1. Reduzir broadcasts de produção a wake-ups mínimos; nunca transmitir a linha completa de messages.
2. Revogar EXECUTE de PUBLIC/anon/authenticated nas funções trigger e usar search_path vazio.
3. Construir e implantar endpoint server-mediated no projeto de produção, com sessão, membership, destinatário, replay/expiry e rate limit validados no servidor.
4. Tornar o transporte autenticado default seguro e remover fallback público sensível.
5. Integrar e revalidar #165/#166 nas linhas-pai; restaurar quota do laboratório e executar Smoke completo no HEAD da PR.
6. Revalidar o contrato HTTP 409 no endpoint implantado, não somente por serviceRpc ou teste offline.
7. Corrigir o workflow Team Lite para upstatus-team-lite, SHA/projeto validados e CLI pinada.
8. Completar AUTH-03, grants, Default ACL e política de Storage.
9. Resolver a proveniência das migrations com fontes originais ou decisão formal sobre o uso dos statements do ledger.
10. Executar os oito testes físicos da #78 e obter reviews/aprovação humana.

## Limites e segurança desta execução

- GitHub e Supabase foram usados somente para leitura, exceto a criação deste relatório na branch QA e a atualização do comentário QA dedicado na Issue #79.
- Todas as consultas SQL foram SELECT-only.
- Nenhum workflow foi iniciado ou repetido pela auditoria.
- Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL, fixture ou operação destrutiva foi executada.
- Não houve teste local ou manual.
- A branch QA estava no HEAD bbc922a imediatamente antes da criação deste arquivo; foi criado um arquivo novo, sem substituir documentos existentes.
