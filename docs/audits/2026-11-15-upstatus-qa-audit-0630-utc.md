# UpStatus — auditoria independente QA
**Data:** 2026-11-15 06:30 UTC (03:30 BRT)  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb  
**Veredito:** NOT READY

## Classificação das evidências
- **CI PASS/FAIL:** resultado de workflow no commit consultado.
- **CODE INSPECTION:** leitura de fonte, configuração, catálogo PostgreSQL ou logs; não equivale a exploração.
- **MANUAL PENDING:** exige navegador/dispositivo e operador.
- **BLOCKED:** dependência ou risco impede concluir o gate.
- **NOT VERIFIED:** evidência insuficiente para uma conclusão.

## 1. Integridade do checkpoint e refs
O arquivo docs/RELEASE_READINESS.md foi lido integralmente: 8.410 linhas, blob 7cfbd70886df42ce790c078c224b19284a632595. O último checkpoint existente é 2026-11-08 15:30 BRT / 18:30 UTC. Portanto, o documento estava desatualizado para a rodada de 15/11.

Heads consultados:
- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- develop: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA antes deste append: 95894ba04d1f5a824b51c19c50a408bd88f3329d

A QA estava 329 commits à frente e um atrás de master. O master avançou um commit documental além da base registrada pelas PRs. Nenhum rebase automático foi feito.

As branches master, develop, team-lite-official e QA retornam protected=false; a API de rulesets retorna lista vazia. A leitura detalhada do endpoint de branch protection respondeu 403, portanto a conclusão sobre a proteção usa o campo protected retornado na listagem de branches e a lista vazia de rulesets.

## 2. PRs obrigatórias e CI
| PR | HEAD consultado | Resultado |
|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | Validate PASS e Smoke PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks PASS histórico |
| #76 Team Lite continuidade | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | Candidate Checks PASS |
| #82 QA | 95894ba04d1f5a824b51c19c50a408bd88f3329d | Validate FAIL |

Evidências:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- #75 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43681906370

#74: 19/19 checks não autenticados e 136/136 autenticados. Smoke cobriu WebRTC de chamada, voz e tela, mesh de três participantes, teardown, rate limit distribuído e recibos atômicos. O passo de rate limit de emissão de setup invite foi SKIPPED; não contar como aprovado.

#76: 16/16 checks não autenticados, 110/110 autenticados e 11/11 contratos HTTP no histórico de execução associado. O workflow atual também concluiu os passos de Chromium com IIFE completo e stubs Tampermonkey, enrollment, rate limit de sinalização e rate limit de setup invite. É CI em ambiente isolado, não teste físico.

#75 é baseline histórica. #76 está 327 commits à frente de #75 e sem commits atrás; não contar as duas como entregas independentes.

#82 contém 178 arquivos, todos sob docs/. O Validate do SHA consultado falhou em scripts/validate.mjs:26 com production updateURL mismatch. O novo commit documental não recebeu Validate próprio porque o workflow ignora alterações em docs/.

As listas de reviews de #74, #75, #76 e #82 retornaram vazias. Todas permanecem abertas e Draft.

## 3. Governança e workflows de publicação
As quatro branches consultadas não têm proteção efetiva indicada pela API e não há rulesets.

Workflow oficial Team Lite:
https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml

O workflow é manual, mas:
- executa supabase functions deploy upstatus, não upstatus-team-lite;
- valida o release.json da raiz, não o manifesto team-lite/release.json;
- usa Supabase CLI latest;
- não fixa explicitamente o SHA dispatchado;
- não compara o projeto com uma referência aprovada;
- não faz preflight de migrations.

O manifesto raiz declara 3.4.7 stable; o manifesto Team Lite declara buildVersion 3.4.30 stable. O workflow oficial pode validar a versão errada e publicar a função Normal.

O deploy-test em develop e team-lite-official usa secrets.SUPABASE_PROJECT_ID, CLI latest e não contém guard explícito contra produção ou contra o projeto isolado de sinalização. A versão candidata #74/#76 melhora isso usando vars.SUPABASE_TEST_PROJECT_ID, rejeitando produção e o laboratório de sinalização, fixando CLI 2.122.1 e limitando o deploy de teste. Essas proteções não estão integradas às branches oficiais.

O workflow de produção Normal em master também usa CLI latest e não valida projeto/SHA como a candidata #74. A candidata #74 adiciona guard de master, SHA e projeto e fixa CLI 2.122.1, mas publica somente a função upstatus. O build candidato ainda define o servidor de API como upstatus-screen-share-3-1-1-beta10. A distribuição do userscript e a API beta10 precisam de cutover coordenado; não há prova de que o workflow #74 publique ambos.

Não despachar os workflows oficiais atuais até correção e revisão humana.

## 4. Artefatos e compatibilidade instalados
Fontes implantadas lidas via Management API:
- Normal: upstatus v480, userscript 3.4.7.
- Team Lite: upstatus-team-lite v15, userscript 3.4.30.
- API legada Normal: upstatus-screen-share-3-1-1-beta10 v6.
- TEST legado: upstatus-test v281, userscript 3.3.28.

Os bundles embutidos de Normal e Team Lite foram decodificados para inspeção:
- Normal atualiza e baixa de /functions/v1/upstatus/upstatus.user.js.
- Team Lite atualiza e baixa diretamente da branch mutável team-lite-official no GitHub.
- Ambos assinam upstatus-screen-share-live-3-1-1-beta10.
- Nenhum usa private:true ou realtime.setAuth().
- Normal encaminha eventos remotos para handlers sem identidade autenticada do publicador.
- Team Lite confere sessão local e geração de autenticação, mas isso não autentica o publicador do broadcast.

A branch usada pelo updater Team Lite está sem proteção. Preferir artefatos de release imutáveis com SHA verificável.

## 5. Realtime e banco
Snapshot de produção:
- 10 tabelas public com RLS e zero policies.
- 9 tabelas public concedem privilégios diretos a anon/authenticated, incluindo SELECT/INSERT e TRUNCATE.
- Três funções SECURITY DEFINER de broadcast têm search_path=public e EXECUTE efetivo para anon/authenticated/service_role.
- As funções retornam trigger; o Advisor sinaliza EXECUTE via RPC. A auditoria não tentou invocação direta.
- realtime.messages: RLS habilitado, zero policies, 7 partições e grants SELECT/INSERT/UPDATE para anon/authenticated.
- Os três triggers de broadcast publicam com private=false.
- upstatus_broadcast_messages envia to_jsonb(OLD/NEW) completo, incluindo campos de mensagem e metadados.
- Eventos observados: 26 db_change, 4 remote_command, 4 remote_result e 72 user_status, todos no tópico público legado. Última linha observada em 13/11.

Security Advisor de produção: 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated relacionados às funções SECURITY DEFINER.

Laboratório:
- 18 tabelas public com RLS e zero policies.
- Nenhum grant direto de tabela para anon/authenticated nas tabelas public consultadas.
- Três funções SECURITY DEFINER de broadcast com search_path vazio e EXECUTE somente para service_role.
- Payloads dos triggers reduzidos a {op: TG_OP}.
- Realtime continua private=false; realtime.messages tem grants de cliente, zero policies, zero partições e zero linhas.
- Não há buckets de produto.

A minimização do payload no laboratório é real, mas não conclui RT-01. O transporte privado/autorizado ainda não está habilitado como padrão nos dois produtos.

## 6. RLS, Storage e AUTH-03
Storage de produção:
- chat-images: público, 168 objetos, limite 20 MiB.
- profile-images: público, 20 objetos, limite 20 MiB.
- Zero policies próprias em storage.objects.

O código de upload assinado valida MIME e tamanho declarados pelo cliente, mas não inspeciona os bytes antes de emitir a URL assinada. A função sniffMime usada no caminho data URL retorna o MIME declarado quando não reconhece a assinatura; portanto também não rejeita todo conteúdo desconhecido. Nenhum exploit ou upload real foi executado.

Produção:
- 5 usuários; zero password_hash vazio; zero role vazio; 3 com papel implementation_admin.
- Não há colunas setup_token_* nem RPC consume_upstatus_setup_invite.
- users, upstatus_sessions e upstatus_profiles continuam ligados por nomes, sem user_id nas colunas consultadas.

Runtimes implantados:
- Normal exige 6 caracteres no login e primeiro setup.
- Team Lite exige 4 caracteres no login e primeiro setup.
- Ambos mantêm POST /api/setup sem token de convite. Se uma conta existente tiver password_hash vazio, o primeiro setup pode ser reivindicado sem convite; o fallback atribui implementation_admin por nome quando role está vazio.
- GET /api/account?name=... revela needsSetup sem autenticação.
- /api/chat/clear autoriza pelo nome Ricardo, sem exigir papel persistido implementation_admin.

O snapshot atual tem todas as cinco contas configuradas; isso reduz a exposição imediata do primeiro setup, mas não corrige o desenho do endpoint.

O laboratório tem quatro colunas setup_token_* e RPC de consumo de convite SECURITY INVOKER, search_path vazio e EXECUTE somente service_role. Não é produção.

## 7. Edge Functions e disponibilidade
Produção tem 38 Edge Functions ACTIVE, todas reportando verify_jwt=false. Isso não prova ausência de autenticação porque os handlers principais usam token customizado; é necessário inventário por rota.
Inventário: dois runtimes principais (upstatus e upstatus-team-lite), uma API beta10 legada e 35 funções históricas test/beta/backup.
Laboratório tem upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não existe endpoint server-mediated equivalente implantado em produção.

A função upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não contém mapeamento explícito para VOICE_ATTEMPT_ALREADY_ACTIVE. O contrato candidato #163 passou offline; o runtime implantado não comprova esse status.

### Respostas HTTP 402 observadas
No recorte de logs de 24h:
- Produção: 88 function_edge_logs com HTTP 402 entre 14/11 16:32:55 e 20:57:39 UTC. Incluem downloads dos userscripts Normal e Team Lite e chamadas beta10 para chat, status e remote-status.
- Produção: 6 edge_logs com HTTP 402 no websocket Realtime entre 14/11 17:57:03 e 17:57:24 UTC.
- Laboratório: 19 chamadas HTTP 402 para upstatus-signal-test em 14/11 às 17:10:45 UTC.

O log registra os códigos e rotas, mas não expõe a causa. O padrão é compatível com bloqueio/quota da plataforma, porém isso não foi confirmado. Não há tráfego posterior no recorte que prove recuperação. Tratar como incidente de disponibilidade observado e investigar no painel de uso/quota antes de repetir Smoke.

## 8. Migrations e ambientes
Produção: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations. A branch gerenciada main reporta MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY.
Laboratório: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations e sem fixtures full-product.

As quatro migrations originais abaixo constam no ledger de produção, mas seus arquivos não foram encontrados em master (404):
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

Não reconstruir esses SQLs a partir do schema. Recuperar os blobs/commits originais e validar proveniência.

Não existe Full-Product TEST independente: o único projeto adicional é o laboratório de sinalização/auth, sem usuários, sessões, mensagens, salas, buckets ou fixtures de produto.

## 9. Issues e aceitação manual
- Issue #78: aberta, 0/8 critérios físicos concluídos.
- Issue #79: aberta, 16 itens marcados e 19 pendentes no corpo consultado.

Nenhum teste manual foi executado. Não havia navegador com Tampermonkey, microfone ou captura de tela reais disponível nesta execução. CI Chromium com stubs não comprova reconexão física sem F5, permissões reais de mídia ou interoperabilidade instalada Normal ↔ Team Lite.

## 10. Gates e próximos passos
- RT-01: BLOCKED — broadcasts públicos e transporte autenticado não é default.
- TEST-ISOLATION: BLOCKED — sem Full-Product TEST e respostas 402 no laboratório.
- MIGRATION-PROVENANCE: BLOCKED — quatro arquivos originais ausentes.
- AUTH-03: BLOCKED — setup sem convite/rate limit implantado em produção.
- ACL-STORAGE: BLOCKED — grants, SECURITY DEFINER, Realtime e Storage sem hardening suficiente.
- RECONNECT: PENDING — Issue #78 0/8 e sem teste físico.
- HUMAN-REVIEW: PENDING — sem reviews humanas e sem autorização explícita.

Prioridades:
1. Investigar as respostas 402 em produção e laboratório; confirmar quota/causa e recuperação sem iniciar novos testes enquanto o ambiente não estiver estável.
2. Corrigir o workflow Team Lite (slug, manifesto correto, projeto/SHA fixos, CLI pinada, preflight e rollback) e proteger branches.
3. Coordenar distribuição do userscript Normal com a API beta10; publicar artefatos imutáveis e verificáveis.
4. Remover broadcasts públicos completos, implementar transporte server-mediated privado/autorizado e tornar o modo seguro default em Normal e Team Lite.
5. Endurecer SECURITY DEFINER, EXECUTE, grants, Default ACL, RLS, Storage e política de acesso aos anexos.
6. Completar AUTH-03, remover setup por nome e autorização de limpeza baseada somente em nome; uniformizar política de senha.
7. Validar bytes/MIME no upload e alinhar limites entre cliente, backend e buckets.
8. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
9. Provisionar Full-Product TEST, executar testes integrados e depois os oito critérios físicos da #78.
10. Obter reviews humanas e autorização explícita antes de qualquer release.

## Limites desta execução
Somente inspeções read-only no GitHub e Supabase. Todas as consultas SQL foram SELECT-only. Não houve execução de scripts locais, rerun de CI, teste manual, mutação de fixtures, merge, deploy, migration, release, publicação de userscript, leitura de secrets ou alteração de flags/permissões. A única escrita foi documental na branch QA dedicada.
