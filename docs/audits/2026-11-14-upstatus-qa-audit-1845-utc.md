# UpStatus — auditoria independente de release readiness

**Data da execução:** 2026-11-14 18:45 UTC  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb  
**Veredito:** **NOT READY — não liberar**

## 1. Escopo e método

Foram revalidados os heads de master, develop, team-lite-official e QA; as PRs #74, #75, #76 e #82; candidatos relacionados #89, #133, #149, #157, #158, #159, #161, #163, #164, #165 e #166; Issues #78 e #79; workflows e logs de CI; bundles efetivamente servidos pelas Edge Functions; catálogos PostgreSQL, RLS, grants, Default ACL, SECURITY DEFINER, Realtime, Storage, migrations e inventário de Edge Functions.

O documento docs/RELEASE_READINESS.md foi lido integralmente por seu blob GitHub (1.045.105 caracteres, 8.410 linhas, blob SHA 7cfbd70886df42ce790c078c224b19284a632595). O último checkpoint interno do documento continua em 2026-11-08 18:30 UTC. Os relatórios de 14/11 estão em arquivos separados; o documento central está desatualizado em relação às candidatas #159–#166.

**Limites:** não há checkout local do repositório nem navegador/Tampermonkey físico nesta execução. Não foram executados testes manuais. Foram consultados resultados de CI já existentes; nenhum workflow foi iniciado ou repetido manualmente. Todas as consultas SQL foram SELECT-only. Não houve exploração de canal público, publicação de broadcast, envio de oferta/ICE, captura de áudio/tela ou tentativa de acesso a dados de terceiros.

## 2. Heads reais e divergência

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA | 4ffcbc798db947c211ef3ca4f1739d2824df83ca |

Comparações:
- #74 / chore/continuity-foundation: 887 commits à frente de master e 1 atrás.
- #76 / team-lite/signaling-transport-candidate: 386 commits à frente de team-lite-official e 0 atrás.
- #82 / QA: 315 commits à frente de master e 1 atrás.
- O único commit master-only é 9d40461, uma adição documental de preflight AUTH-03, sem alteração de runtime.
- A comparação master → QA contém 166 arquivos alterados; todos estão em docs/. Nenhum arquivo fora de docs/ foi alterado na QA.
- A QA permaneceu em 4ffcbc durante a coleta; o HEAD foi revalidado imediatamente antes da criação deste relatório.

As PRs obrigatórias continuam abertas e Draft. A API de reviews retornou zero reviews humanas para #74, #75, #76, #82 e para os candidatos de proveniência examinados.

## 3. CI por HEAD e candidatos atuais

| PR / linha | HEAD | Evidência exata | Resultado |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | Validate 43376770142; Smoke 43376770200 | PASS / PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks 41674353127 | PASS histórico, somente checagem de versão/metadata; não substitui #76 |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | Candidate Checks 43363871881 | PASS |
| #82 QA | 4ffcbc798db947c211ef3ca4f1739d2824df83ca | Validate 43621967320 | FAIL: production updateURL mismatch |
| #161 Normal API + invite rate limit | 557814dc31bed779b84a2094358dc6b2a7e67689 | Validate 43479685384; Smoke 43479685445 | PASS / PASS |
| #163 HTTP 409 | 00f357b0f5921d1995bb52c7b50f53ef8276e334 | Validate 43488822143; Contract 43488822237 | PASS offline |
| #165 Normal provenance | 434478771dca54505d3ec8b0cea0ada57d8d6dca | Guard 43619663713; Smoke 43619663747 | Guard PASS; Smoke BLOQUEADO por quota HTTP 402 |
| #166 Team Lite provenance | e90e0dbbc0c6d89d77ea359dff0f1e82b4428413 | Guard 43624572780 | PASS offline |
| #157 Team Lite avatar | b7baf3a98e22b8a9555d667878e49e121d7bcf8c | Team Lite Avatar Hardening 43333849082 | PASS offline |
| #164 Normal avatar | a27ced56564f3d18948c70138f6d6b2a1f2d0907 | Validate 43544570609 | PASS offline |
| #158 builder/chat | 25775192ed5be4197581b55123cd4f2f78386c51 | Validate 43363857861 | FAIL: files are staged instead of uploaded immediately |
| #159 QA updater/role guard | 0bf5a9b76156dea69380468197f19d6ee4bcffc3 | Validate 43392506216 | PASS, mas branch está 41 commits atrás da QA atual |

### Limitações dos testes

- #74: Validate e Smoke passaram. No Smoke, as etapas de endpoint não autenticado, integração autenticada/browser, rate limit distribuído de sinalização, recibos atômicos e consumo único de convite passaram. A etapa de rate limit distribuído de emissão de convite foi SKIPPED nesse HEAD.
- #76: Candidate Checks passou, incluindo adapter de sinalização, enrollment, recuperação de tentativa de voz, screen-share, contrato HTTP isolado, autenticação, Playwright com IIFE completo, integração/browser autenticados, rate limits, recibos, convites e guard de migrations.
- #75: é somente uma baseline histórica; seu workflow atual verifica scripts/metadata, não a suíte de sinalização da #76.
- #161: Validate e Smoke passaram no HEAD exato, incluindo a etapa distribuída de rate limit de emissão de convites no laboratório.
- #163: o contrato HTTP 409 foi testado offline; não houve chamada HTTP real à Edge Function implantada.
- #165: o guard offline passou. O Smoke recebeu HTTP 402 exceed_edge_functions_invocations_quota em todos os 19 checks não autenticados; os testes autenticados foram skipped. Isso é bloqueio ambiental, não falha de assertion do candidato. Não repetir até o responsável restaurar a cota.
- #166: guard offline passou; a PR deliberadamente não iniciou Smoke Supabase. Browser WebRTC, Storage real e recuperação física continuam sem validação.
- #157/#164: CI de avatar passou, mas não houve upload real nem teste de Storage.
- #158: a regressão do chat falha porque os arquivos ficam staged em vez de serem enviados imediatamente.
- #159: contém correção candidata de updater e autorização de limpeza de chat, mas sua base é 1d47e9 e está 41 commits atrás da QA atual. Não aplicar sem reconciliação.

Links:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43621967320
- #161 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43479685445
- #163 HTTP 409: https://github.com/Reekyi/UpStatus/actions/runs/43488822237
- #165 offline guard: https://github.com/Reekyi/UpStatus/actions/runs/43619663713
- #165 Smoke bloqueado: https://github.com/Reekyi/UpStatus/actions/runs/43619663747
- #166 offline guard: https://github.com/Reekyi/UpStatus/actions/runs/43624572780
- #158 chat regression: https://github.com/Reekyi/UpStatus/actions/runs/43363857861

## 4. UpdateURL e fluxo de publicação Normal

O userscript Normal efetivamente servido pela Edge Function upstatus v480 é 3.4.7 e contém @updateURL e @downloadURL apontando para /functions/v1/upstatus/upstatus.user.js. O header instalado está correto.

O defeito de master está no builder:
- release.json declara versão 3.4.7 e scriptUrl estável /upstatus/upstatus.user.js.
- scripts/build.mjs de master ainda define a API Normal como beta10 e constrói updateUrl a partir da URL beta10.
- scripts/validate.mjs exige o endpoint estável /upstatus/upstatus.user.js.
- O Validate da QA falha em scripts/validate.mjs:26 com production updateURL mismatch.

A #161 separa o alvo da API e o alvo do updater, deriva CLOUD_SERVER de PROD_FUNCTION=upstatus e valida scriptUrl/@updateURL/@downloadURL contra o endpoint de distribuição. Também impede que o artefato Normal continue apontando para beta10. O CI passou, mas a candidata continua Draft e release.json ainda usa 3.4.7, a versão já instalada. O guard de cutover exige versão estável superior a 3.4.7; portanto não se pode publicar código alterado sob a mesma versão.

A #158 não é aceitável enquanto quebrar o envio imediato de anexos. A #159 tem um fix de autorização de limpeza de chat (Ricardo + role persistida implementation_admin) e Validate PASS, mas está obsoleta em relação à QA atual.

## 5. Realtime e compatibilidade Normal / Team Lite

Bundles efetivamente servidos:
- Normal: Edge Function upstatus v480, userscript 3.4.7, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- Team Lite: Edge Function upstatus-team-lite v15, userscript 3.4.30, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- API Normal beta10: upstatus-screen-share-3-1-1-beta10 v6, source SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
- TEST legado: upstatus-test v281.

Nos dois userscripts instalados:
- canal Realtime criado sem private:true;
- não há realtime.setAuth();
- remote_command chega ao handler do cliente; Normal executa diretamente executeRemoteCommand quando target corresponde ao membro; Team Lite também executa após validar a própria sessão local, mas não autentica o publicador;
- call_signal, voice-room e screen-share recebem payloads do canal sem prova criptográfica da identidade/membership do emissor.

### Proveniência das chamadas

As candidatas #74/#76 usavam _authenticatedTransport dentro do próprio payload. Esse marcador é controlável por quem publica o evento e não prova origem autenticada.

As novas #165 Normal e #166 Team Lite removem o marcador e passam authenticatedSource como argumento separado:
- polling autenticado chama receiveCallSignal(payload, true);
- broadcast público chama receiveCallSignal(payload, false);
- allowlist pública aceita apenas hints próprios de presence/ended quando o transporte autenticado estiver habilitado;
- join_declined, offer, answer e ICE não são hints públicos permitidos.

Os guards offline passaram. Porém signalTransportFlag continua false por padrão e signalTransportEndpoint continua vazio. Com a flag desligada, o caminho legado público continua aceitando sinais. A correção de proveniência não fecha RT-01 enquanto o transporte seguro não for default e o caminho público sensível não for removido.

### Backend server-mediated ausente

O helper existe e a função de laboratório upstatus-signal-test v32 implementa /signal, /poll, /room/open e rotas de membership. Entretanto, os templates de servidor inspecionados nas bases Normal e Team Lite não contêm /api/signal, /api/room, signalRoute ou roomRoute. O endpoint de produção correspondente não existe.

A função isolada usa token de sessão customizado, valida sender e membership, aplica rate limit distribuído (90 writes/min e 240 reads/min) e retorna Retry-After. Mas não é uma implantação de produção. Apontar clientes de produção ao laboratório não é uma solução.

### Tópicos e triggers

- Clientes instalados assinam upstatus-screen-share-live-3-1-1-beta10.
- Triggers PostgreSQL publicam em upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.

O snapshot atual de realtime.messages contém 106 linhas, todas private=false, no tópico dos triggers; última linha em 2026-11-13 20:52:22 UTC. O tópico não coincide com o dos clientes instalados. Isso não comprova entrega aos clientes.

O trigger upstatus_broadcast_messages usa to_jsonb(OLD/NEW) e publica o registro completo em broadcast db_change com private=false. Isso inclui potencialmente conteúdo textual, URLs de anexos, metadados e identificadores da mensagem. A configuração Dashboard “Allow public access” não está disponível no conector; não foi reproduzido acesso externo. O achado é um caminho de divulgação por desenho que deve ser tratado como P0 de confidencialidade até que o payload seja minimizado e o canal privado/autorizado seja validado.

Os outros triggers publicam remote_command/remote_result e user_status também com private=false.

## 6. PostgreSQL, RLS, grants, SECURITY DEFINER e Storage

### Produção

- 10 tabelas public; todas com RLS habilitado e zero policies.
- Nove tabelas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER.
- information_schema.role_table_grants retorna 126 grants diretos no schema public: 9 tabelas × 7 privilégios × 2 papéis.
- RLS não protege TRUNCATE. Nenhuma operação TRUNCATE foi tentada.
- realtime.messages: RLS true, FORCE RLS false, zero policies; anon e authenticated têm SELECT/INSERT/UPDATE; 106 linhas, todas private=false.
- Default ACL: 24 registros, 75 entradas ACL expandidas, incluindo defaults amplos em public/storage e schemas GraphQL.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public, retornam trigger e têm EXECUTE concedido a anon/authenticated. O Advisor as conta como WARN. Como retornam trigger, não foi demonstrada invocação direta como RPC comum; o EXECUTE amplo é desnecessário e o search_path deve ser endurecido.
- Security Advisor: 6 WARN e 10 INFO.

### Storage de produção

| Bucket | Público | Limite | Objetos |
|---|---|---:|---:|
| chat-images | Sim | 20 MiB | 168 |
| profile-images | Sim | 20 MiB | 20 |

- Zero policies em storage.objects.
- RLS de storage.objects está habilitado, mas anon/authenticated têm INSERT/SELECT/UPDATE/DELETE concedidos.
- O acesso público a objetos por URL não oferece ownership por usuário; não foi feita tentativa de ler objeto.
- A candidata #157 vincula avatar Team Lite a users.id; #164 faz hardening equivalente no Normal. Ambos passaram CI offline, sem upload real.
- Os limites de mídia e do bucket precisam ser alinhados. O bucket chat-images aceita imagens, áudio, vídeo e documentos, não apenas imagens.

### Laboratório

- 18 tabelas public, todas com RLS, zero policies e zero grants diretos de tabela para anon/authenticated nas tabelas consultadas.
- Default ACL: 25 registros, 70 entradas ACL.
- Três funções upstatus_broadcast_* continuam SECURITY DEFINER, mas com search_path vazio e EXECUTE apenas para service_role.
- realtime.messages: zero linhas, zero policies, RLS true, FORCE RLS false; grants SELECT/INSERT/UPDATE para anon/authenticated permanecem.
- Security Advisor: zero WARN e 18 INFO.
- O laboratório demonstra hardening de grants de tabelas e triggers, mas não é um ambiente de produto completo.

## 7. Edge Functions, AUTH-03 e migrations

### Inventário

| Projeto | Status | Edge Functions | Migrations |
|---|---|---:|---:|
| Produção dlfvkawaiqduhlazsszm | ACTIVE_HEALTHY | 38 ACTIVE | 7 |
| Laboratório bfpjtfqlnypisxljoxkb | ACTIVE_HEALTHY | 2 ACTIVE | 39 |

Todas as 38 Edge Functions de produção reportam verify_jwt=false no nível da plataforma. Isso não prova ausência de autenticação: os handlers operacionais inspecionados usam token customizado de sessão. Cada rota ainda exige revisão individual.

Produção:
- PostgreSQL 17.11.0.002.
- upstatus v480, upstatus-team-lite v15, beta10 v6 e upstatus-test v281.
- cinco usuários, 319 sessões e cinco perfis.
- zero setup_token_* columns e zero RPC consume_upstatus_setup_invite.
- sete migrations, última 20261027155438 set_upstatus_upload_limits_20mb.
- branch gerenciada main está MIGRATIONS_FAILED; preview_project_status está ACTIVE_HEALTHY. Causa não identificada.

Laboratório:
- PostgreSQL 17.11.0.003.
- upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- 39 migrations.
- quatro colunas setup_token_* e uma RPC consume_upstatus_setup_invite; a RPC é SECURITY INVOKER, search_path vazio e EXECUTE apenas service_role.
- zero usuários, sessões, perfis, buckets, objetos, salas, memberships, eventos, bindings, rate limits, tentativas de chamada, tentativas de sala de voz e linhas Realtime.

O laboratório está sem fixtures e sem Storage. Não é Full-Product TEST.

### AUTH-03

A #161 contém rate limit distribuído de emissão de convites: 5 por administrador por 15 minutos, bucket baseado em SHA-256, RPC atômica, HTTP 429 ao exceder e HTTP 503 fail-closed se a RPC estiver indisponível. Validate e Smoke passaram no laboratório no HEAD exato.

A #89 contém o fluxo de setup invite e preflight read-only de histórico de migrations, mas as migrations AUTH-03 não foram aplicadas à produção. O snapshot atual confirma ausência de colunas e RPC. AUTH-03 permanece bloqueado.

### Contrato HTTP 409 de voz

A função de laboratório upstatus-signal-test v32 não contém VOICE_ATTEMPT_ALREADY_ACTIVE; atualmente mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para 409, mas o código já ativo cai em 500. A #163 adiciona o mapeamento em módulo puro e testa o contrato offline. Não houve chamada HTTP real nem deploy; o runtime v32 continua sem a correção.

## 8. Workflows de publicação

- Workflow master .github/workflows/deploy-production.yml é workflow_dispatch, usa Supabase CLI latest e projeto via segredo genérico; exige versão 3.4.7. Não foi despachado.
- Workflow oficial de team-lite-official também usa CLI latest e publica a função upstatus, não upstatus-team-lite. Não valida explicitamente SHA, projeto e histórico de migrations. **Não despachar esse workflow.**
- A candidata #89 contém verificações de projeto/SHA e preflight read-only de migrations, mas está Draft e não foi integrada.
- O deploy Normal e o deploy Team Lite precisam ser tratados como fluxos distintos, com função correta, CLI pinada, projeto verificado e cutover coordenado.

## 9. Issues e aceitação física

- Issue #78 permanece aberta com 0/8 critérios físicos aprovados. Último comentário de aceitação observado é de 2026-11-08. Não houve teste real Tampermonkey, queda de internet, reconexão sem F5, reentrada, microfone/display permissions ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 permanece aberta com 16/35 itens marcados.
- Nenhuma review humana foi encontrada nas PRs obrigatórias nem nas candidatas de proveniência #133/#149/#165/#166.
- Nenhum teste manual foi realizado nesta auditoria.

## 10. Gates reavaliados nesta execução

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | Bundles instalados sem private:true/setAuth; backend /api/signal e /api/room ausente; transporte opt-in |
| TEST-ISOLATION | BLOCKED | Laboratório vazio e sem Storage; Smoke #165 bloqueado por quota HTTP 402 |
| AUTH-03 | BLOCKED | Produção sem setup tokens/RPC; candidato #161 passou apenas no laboratório |
| ACL-STORAGE | BLOCKED | 126 grants diretos; 9 tabelas com TRUNCATE; zero policies Storage; buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8; nenhum teste físico |
| HUMAN-REVIEW | PENDING | Zero reviews humanas nas PRs obrigatórias |

MIGRATION-PROVENANCE não foi reavaliado nesta rodada; o último resultado previamente registrado permanece sem alteração.

## 11. Prioridades para Engenharia

1. Minimizar o payload do trigger de mensagens; não publicar linhas completas em broadcast público.
2. Implementar backend server-mediated de sinalização nas duas linhas de produção, com sessão, membership, destinatário, expiração, replay e rate limit validados no servidor.
3. Tornar o transporte autenticado default seguro e remover listeners públicos sensíveis; não deixar flag default false.
4. Integrar #165 e #166 nas bases atuais e repetir Smoke somente depois de restaurar a quota do laboratório.
5. Corrigir o contrato HTTP 409 no runtime e validar por HTTP real.
6. Corrigir o builder/API/updater sem quebrar o envio imediato de anexos.
7. Corrigir o workflow Team Lite para upstatus-team-lite e adicionar verificação de SHA/projeto/CLI/migrations.
8. Aplicar AUTH-03 somente após revisão e autorização humana explícita.
9. Endurecer grants, Default ACL, funções SECURITY DEFINER e Storage com plano revisado.
10. Provisionar Full-Product TEST, executar os oito testes físicos da #78 e obter aprovação humana.

## 12. Segurança operacional

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets, flags, roles, grants, policies, ACL, fixtures ou operação destrutiva.

As únicas escritas desta execução foram este relatório documental na branch QA dedicada e a atualização do comentário UPCONTROL:QA na Issue #79. O comentário da Engenharia na Issue #79 foi preservado. O comentário dedicado UPCONTROL:QA foi atualizado no mesmo ID, sem duplicatas, com JSON válido e feed de atividades desta execução.

**Conclusão: NÃO LIBERAR.** A correção de proveniência avançou nos candidatos, mas o runtime instalado continua no caminho público legado, o backend autenticado não existe nos templates de produção e o ambiente de integração está sem quota.
