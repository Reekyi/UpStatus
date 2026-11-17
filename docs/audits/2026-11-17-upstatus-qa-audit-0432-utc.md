# Auditoria independente UpStatus | 2026-11-17 04:32 UTC

**Veredito: NOT READY.** Esta rodada revalidou GitHub, CI existente, código candidato, bundles Edge implantados, logs e catálogos PostgreSQL. A QA não executou testes de produto.

## 1. Método e limite

- GitHub: leitura de refs, PRs, diffs, workflows, status/checks, issues e arquivos.
- Supabase: leitura de projetos, migrations, Edge Functions, logs, Security Advisor e SQLs SELECT-only de catálogo.
- Escrita autorizada nesta rodada: este relatório novo na branch QA e atualização do comentário QA existente na Issue #79.
- Não houve escrita SQL, alteração de produção, deploy, merge, migration, release, publicação de userscript, alteração de secret/flag/grant/policy/ACL ou mutação de fixtures.

## 2. Documento de prontidão e refs

docs/RELEASE_READINESS.md foi lido integralmente na branch qa/release-readiness-2026-11-04-master: 1.046.356 caracteres, 8.423 linhas. O último checkpoint interno é de 2026-11-15 06:30 UTC; portanto, o documento-base está desatualizado para a fotografia de 2026-11-17.

Heads observados:
- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- develop: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA: 5f3d028638701daaa26b33d5b8b9eb265c5fc1d2

As quatro refs retornaram protected=false pela API de branches. Não encontrei proteção de branch ativa nesses refs.

QA está 387 commits à frente e 1 atrás da master atual. O único commit da master que não está na QA é 9d40461, uma atualização documental. Não fiz rebase nem incorporei o commit concorrente.

## 3. PRs obrigatórias e CI

| PR | HEAD | Estado | Evidência atual |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | Open / Draft | Validate e Smoke SUCCESS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Open / Draft | PASS histórico |
| #76 Team Lite signaling | 00a578e9174e08238a1289a35feb02d171625421 | Open / Draft | Candidate Checks FAILURE por quota; contratos signed-upload SUCCESS |
| #82 QA docs | 5f3d028638701daaa26b33d5b8b9eb265c5fc1d2 | Open / Draft | Validate FAILURE em production updateURL mismatch |

Nenhuma das quatro PRs possui review humana registrada.

### #74 Normal

- [Validate run 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): SUCCESS.
- [Smoke run 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS.
- 136/136 checks autenticados e cenários Chromium de chamada WebRTC, voz, screen-share, mesh de três participantes, teardown, rate limit de sinalização e read receipts passaram.
- O step “Verify distributed setup-invite issuance rate limit” foi SKIPPED porque o harness não estava presente no HEAD. Portanto, o PASS não valida esse contrato no Normal.
- A PR está 887 commits à frente do SHA-base e 1 atrás da master atual; o diff contém 90 arquivos, 13.558 adições e 219 remoções. Revisão de ancestralidade/escopo é obrigatória antes de integração.

### #75 e #76 Team Lite

- #75 tem 59 commits e 10 arquivos; seu PASS [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é histórico e limitado ao baseline.
- #76 tem 389 commits e 59 arquivos; é continuação direta da #75: 330 commits à frente, zero atrás.
- Em [Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235), os contratos offline de signed-upload passaram. Os 11/11 testes do mapeador HTTP isolado também passaram.
- O smoke do endpoint real do laboratório falhou em 0/16 checks: todos receberam HTTP 402, inclusive health e os endpoints que deveriam retornar 401/405. O corpo confirmou exceed_edge_functions_invocations_quota. Playwright, integração autenticada, concorrência e checks seguintes foram SKIPPED.
- Não classificar esse resultado como defeito funcional do adapter; a validação de integração está bloqueada pela infraestrutura.

### #82 QA

- O diff contém 222 arquivos e todos estão em docs/; são 53.722 adições e zero remoções. Não há arquivos de runtime no diff.
- O [Validate 44011458173](https://github.com/Reekyi/UpStatus/actions/runs/44011458173) falhou no checkout do merge ref da9af3f, em scripts/validate.mjs:26.
- A falha é reproduzível por inspeção estática do contrato herdado de master: scripts/build.mjs em master define o endpoint de API/atualização pelo slug beta10, enquanto scripts/validate.mjs exige que o updateURL contenha /upstatus/upstatus.user.js. A PR #74 altera o build para usar release.json.scriptUrl na distribuição; #82 não contém essa correção porque é documental. Não atribuir a falha ao Markdown.

## 4. Build, workflows e compatibilidade

### Normal

- Bundle implantado em upstatus: versão 3.4.7, Edge v480. O userscript servido tem updateURL em /functions/v1/upstatus/upstatus.user.js, mas chama a API beta10.
- API beta10 implantada: Edge v6; o userscript embutido declara versão interna 3.1.1-beta8.
- O cliente Normal implantado assina upstatus-screen-share-live-3-1-1-beta10.
- O build candidato #74 corrige a URL de distribuição para release.json.scriptUrl e muda o tópico candidato para upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, alinhado aos triggers PostgreSQL. Porém, o API base do candidato continua apontando para beta10.
- O workflow de produção da #74 tem guards de branch master, SHA exato, projeto e token, fixa CLI 2.122.1, mas publica somente upstatus; não publica beta10. Logo, isoladamente, não fecha o cutover da API que o cliente continua chamando.
- O workflow exige versão exatamente 3.4.7. O release.json e o artefato raiz atual também são 3.4.7; o build guard de sincronização do artefato raiz exige versão maior que a atual. Um candidato com a mesma versão pode não ser reconhecido pelo updater como atualização. Escolher e validar uma versão estável nova antes do release.

### Team Lite

- Bundle implantado: versão 3.4.30, Edge v15; o cliente implantado também usa o tópico beta10 legado.
- O candidato #76 é 3.4.31 e usa o tópico novo upstatus-live-..., igual ao Normal candidato e aos triggers do banco.
- O adapter de sinalização é compartilhado entre os candidatos. Entretanto, signaling_transport_enabled é false por padrão e o endpoint configurável começa vazio. Sem configuração explícita no Tampermonkey, os listeners públicos legados permanecem ativos. O cliente não configura private:true nem setAuth().
- O workflow oficial .github/workflows/deploy-production.yml em team-lite-official usa CLI latest, não valida SHA/projeto/migrations e executa supabase functions deploy upstatus. O slug correto é upstatus-team-lite. **Não despachar esse workflow.**
- O workflow candidato #76 tem checks separados para signed-upload e candidate-checks, usa o projeto isolado explicitamente e serializa testes com fila. O run atual falhou antes do navegador por quota.

## 5. Supabase: projetos, migrations e Edge Functions

Só existem dois projetos na organização, plano Free:
- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11, 7 migrations, 38 Edge Functions ACTIVE.
- Laboratório bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11, 38 migrations, 2 Edge Functions ACTIVE, sem branches Supabase.

Não existe Full-Product TEST independente. O workflow de deploy TEST exige SUPABASE_TEST_PROJECT_ID e rejeita produção e o projeto de sinalização isolada; com apenas esses dois projetos, não há alvo válido.

Todas as 38 Edge Functions de produção retornam verify_jwt=false; as duas funções do laboratório também. Isso não prova que todas as rotas aceitam anônimos: cada runtime precisa autenticar internamente e ser revisado por rota. Slugs relevantes:
- produção: upstatus v480, upstatus-test v281, beta10 v6, upstatus-team-lite v15;
- laboratório: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
Não existe função server-mediated upstatus-signal/equivalente em produção.

A branch Supabase main de produção continua MIGRATIONS_FAILED, apesar do preview ACTIVE_HEALTHY. Nenhuma migration foi aplicada nesta auditoria.

## 6. Disponibilidade e logs

### Produção

Na janela de 24 horas consultada, o stream function_edge_logs contém 77.925 linhas, todas HTTP 402:
- /api/chat: 41.630
- /api/status: 18.104
- /api/remote-status: 18.086
- /api/members: 33
- /api/me: 33
- /api/account: 33
- download /upstatus/upstatus.user.js: 6

Primeiro evento: 2026-11-16 11:41:55 UTC. Último: 2026-11-16 21:00:47 UTC. Não há eventos posteriores de Edge Functions na janela, embora PgBouncer e PostgreSQL continuem registrando atividade até 04:02 e 03:27 UTC, respectivamente. Isso não comprova recuperação nem falha atual; indica ausência de telemetria de Edge após 21:00.

### Laboratório

Foram 48 registros de Edge Function entre 12:37:25 e 12:41:42 UTC de 16/11, correspondentes ao bloqueio de quota observado no CI. Não há registros posteriores de Edge Functions na janela consultada. PostgreSQL/PgBouncer continuaram com atividade. A recuperação do endpoint não está comprovada.

## 7. Segurança, Realtime e Storage

### Produção

- Dez tabelas em public com RLS habilitado e zero policies.
- Nove tabelas backend-owned concedem privilégios diretos amplos a anon e authenticated, incluindo TRUNCATE. RLS não protege TRUNCATE; isso não demonstra, por si só, uma rota PostgREST de TRUNCATE.
- realtime.messages: RLS true, FORCE RLS false, zero policies; SELECT/INSERT/UPDATE concedidos a anon e authenticated.
- Snapshot do tópico UpStatus: 106 mensagens, todas private=false: 72 user_status, 26 db_change, 4 remote_command, 4 remote_result.
- Os três triggers upstatus_broadcast_* são SECURITY DEFINER, search_path=public, retornam trigger e têm EXECUTE concedido a anon/authenticated/service_role. O Advisor gera 3 WARN para anon e 3 WARN para authenticated. Não foi feita tentativa de exploração RPC; a classificação de retorno trigger deve ser preservada.
- O trigger de mensagens transmite a linha completa via to_jsonb(OLD/NEW). Os triggers de remote-state transmitem metadados de comando/resultado. Todos publicam no tópico upstatus-live-... com private=false.
- Default ACLs amplas permanecem para postgres e supabase_admin em public, além de defaults amplas em storage/GraphQL.
- Buckets chat-images e profile-images são públicos, limite 20 MiB; há 168 e 20 objetos, respectivamente. Zero policies em storage.objects; os buckets públicos tornam objetos legíveis publicamente por desenho. Isso não prova upload anônimo irrestrito, mas a política de privacidade e as permissões precisam de decisão/revisão.

### Laboratório

- Dezoito tabelas públicas com RLS e sem policies; privilégios diretos de anon/authenticated nas tabelas públicas consultadas estão revogados.
- As três funções de broadcast são SECURITY DEFINER com search_path vazio e EXECUTE negado a anon/authenticated; Advisor sem WARN de SECURITY DEFINER.
- realtime.messages continua sem policies e ainda concede SELECT/INSERT/UPDATE a anon/authenticated, mas o snapshot não encontrou mensagens.
- Default ACLs de supabase_admin em public/storage/graphql e de postgres em storage ainda são amplas.
- Não há buckets de produto no laboratório.

## 8. AUTH-03 e primeiro acesso

Produção:
- Sem tabela upstatus_setup_invites, sem upstatus_setup_invite_rate_limits, sem colunas setup_token_* em users e sem RPCs consume_upstatus_setup_invite*.
- Os runtimes implantados ainda têm POST /api/setup legado sem convite obrigatório. Normal exige senha mínima de seis caracteres; Team Lite exige quatro.
- O fallback nominal de papel administrativo permanece no código implantado; a limpeza de chat ainda autoriza pelo nome literal Ricardo.

Laboratório:
- Não há tabela upstatus_setup_invites; o desenho atual usa colunas setup_token_* na tabela users.
- Existe upstatus_setup_invite_rate_limits.
- Existem consume_upstatus_setup_invite e consume_upstatus_setup_invite_rate_limit, SECURITY INVOKER, search_path vazio, EXECUTE somente service_role.
- O candidato Normal #74 consome convite, mas não chama o RPC de rate limit de emissão. Team Lite #76 aplica 5 emissões por admin a cada 900 segundos e falha fechado com 503/429. A paridade Normal/Team Lite não está fechada.

## 9. Issues e gates

- Issue #78: OPEN, 0/8 critérios físicos. Não houve teste manual de perda/retorno de internet sem F5, Tampermonkey, microfone real, captura real de tela ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79: OPEN, 16/35 itens marcados e 19 pendentes. O comentário dedicado <!-- UPCONTROL:QA --> foi atualizado no lugar; permanece um único comentário QA e o comentário da Engenharia foi preservado.

Gates:
- RT-01: BLOCKED — tópicos legados, mensagens públicas e transporte autenticado opt-in.
- TEST-ISOLATION: BLOCKED — somente produção e laboratório de sinalização existem.
- MIGRATION-PROVENANCE: IN PROGRESS — ledgers 7/38 e branch main MIGRATIONS_FAILED; sem replay isolado.
- AUTH-03: BLOCKED — schema/runtimes de produção não têm convite/rate limit.
- ACL-STORAGE: BLOCKED — grants/default ACLs, Realtime e Storage permanecem abertos.
- RECONNECT: PENDING — depende dos oito critérios físicos; nenhum foi confirmado pela QA.
- HUMAN-REVIEW: PENDING — nenhuma review humana ou autorização de release foi registrada.

## 10. Próximas ações

1. O proprietário da organização precisa revisar Usage/Billing e spend cap do laboratório; a organização aparece no plano Free.
2. Diagnosticar separadamente a causa dos 402 em produção; a ausência de logs posteriores não é evidência de recuperação.
3. Consolidar Normal: distribuição, versão estável nova, API beta10 versus upstatus, tópico Realtime e rate limit de convites.
4. Corrigir o workflow oficial Team Lite para slug correto, SHA/projeto fixos e CLI pinada; não despachar o workflow atual.
5. Tornar sinalização autenticada o padrão e remover listeners públicos sensíveis após cutover/rollback aprovado.
6. Revisar grants/default ACLs, SECURITY DEFINER e Storage com plano coordenado.
7. Provisionar Full-Product TEST, validar migrations e diagnosticar MIGRATIONS_FAILED.
8. Executar os testes físicos da #78 e obter aprovação humana.

**Conclusão: NÃO LIBERAR.** CI verde em candidato isolado não comprova implantação, compatibilidade instalada ou segurança de produção.
