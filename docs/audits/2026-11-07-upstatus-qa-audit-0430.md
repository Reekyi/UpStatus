# UpStatus — auditoria independente QA (2026-11-07 04:30 UTC)

## Classificação de evidência

- **AUTOMATED PASS:** workflow concluído com sucesso no SHA exato indicado.
- **CODE INSPECTION:** leitura estática de código, catálogo PostgreSQL ou metadados; não equivale a exploração runtime.
- **MANUAL PENDING:** exige Tampermonkey, navegador/dispositivo real ou operador.
- **PENDING:** evidência ou execução ainda não concluída.
- **BLOCKED:** gate de release impedido por risco ou dependência confirmada.
- **NOT VERIFIED:** fonte/ambiente insuficiente para sustentar a conclusão.

## 1. Refs GitHub e PRs

Consulta atual: 2026-11-07, aproximadamente 04:30 UTC. Todas as PRs seguem OPEN, Draft e unmerged. As consultas de reviews não retornaram submissões humanas.

| PR | Branch | HEAD exato | Base | Comparação |
|---|---|---|---|---:|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | chore/continuity-foundation | 4c0eb56bc218729da52891daed39afe31f6b3307 | master a9288ccfcb0f308d3a587bfca624418a395be07b | 795 ahead / 0 behind |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | team-lite/3.4.31-guest-fixes | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official 9065bc1536fde64f437f6f12b7abb9b072cb8281 | 59 ahead / 0 behind |
| [#76 Team Lite continuation](https://github.com/Reekyi/UpStatus/pull/76) | team-lite/signaling-transport-candidate | 87ede473bd9baefe96d9388ed1508f3d52d54679 | team-lite-official 9065bc1536fde64f437f6f12b7abb9b072cb8281 | 222 commits ahead of #75 / 0 behind |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | qa/release-readiness-2026-11-04-master | f260899a8671e76f424fa85868c39f90b9b5d724 | master a9288ccfcb0f308d3a587bfca624418a395be07b | 81 ahead / 0 behind |

#75 é baseline histórico; #76 é a continuação atual. Não tratar as duas como candidatos independentes.

## 2. CI nos HEADs atuais

### Normal #74 — AUTOMATED PASS

- [Validate 42336501535](https://github.com/Reekyi/UpStatus/actions/runs/42336501535), job [128294511547](https://github.com/Reekyi/UpStatus/actions/runs/42336501535/job/128294511547): SUCCESS.
- [Signaling Smoke 42336501795](https://github.com/Reekyi/UpStatus/actions/runs/42336501795), job [128294513396](https://github.com/Reekyi/UpStatus/actions/runs/42336501795/job/128294513396): SUCCESS.
- Ambos executados no HEAD exato 4c0eb56bc218729da52891daed39afe31f6b3307.

Evidências dos logs:
- Migration layout guard e enrollment static checks passaram.
- Build Normal 3.4.7 / TEST 3.4.7.
- Regressões de chat, updater e payload Realtime não confiável passaram.
- 19/19 checks não autenticados e 129/129 checks autenticados passaram.
- Chromium validou negociação WebRTC e entrega de áudio remoto em chamada e voice room, além de vídeo remoto em screen share; teardown de peers/media passou.
- Rate limit do endpoint isolado: 90 aceitas, uma rejeitada com HTTP 429 e Retry-After 60s.
- Teste concorrente do rate limiter e read receipts atômicos passaram.
- Enrollment isolado passou para elegibilidade NULL/empty, conta configurada negada, token malformado/incorreto/expirado/replay, concorrência com exatamente um vencedor, fallback de role e limpeza.

### Team Lite #76 — AUTOMATED PASS

- [Candidate Checks 42336506037](https://github.com/Reekyi/UpStatus/actions/runs/42336506037), job [128295655676](https://github.com/Reekyi/UpStatus/actions/runs/42336506037/job/128295655676): SUCCESS.
- Executado no HEAD exato 87ede473bd9baefe96d9388ed1508f3d52d54679.
- 16/16 checks não autenticados e 103/103 checks autenticados passaram.
- WebRTC call/voice/screen com tracks remotas e teardown passaram.
- Rate limit, Retry-After, concorrência, read receipts e enrollment isolado passaram.
- Candidate bundle v3.4.31, updater/manifest, guest portals Lucca/Ycaro, isolamento de sessão e testes de sequência/recuperação de voice room passaram.

### Guardas dos workflows

Os dois workflows usam o mesmo grupo de concorrência upstatus-signaling-isolated-tests, queue max e cancel-in-progress false. Ambos usam checkout fixado ao SHA de actions/checkout e permissions contents: read. Os testes mutáveis apontam explicitamente para https://bfpjtfqlnypisxljoxkb.supabase.co, exigem a service-role key e as variáveis de opt-in correspondentes. Os logs confirmam o preflight de projeto isolado e opt-in explícito.

Os workflows foram executados pela engenharia, não por esta auditoria. O teste de enrollment usa service_role para criar fixtures e chama a RPC diretamente. **Não testa o HTTP POST /api/setup-invite nem a autorização real da Edge Function para admin versus não-admin.**

## 3. AUTH-03 — enrollment por convite nos candidatos

**CODE INSPECTION + RPC runtime automatizada; HTTP PENDING.**

Fontes atuais:
- Normal template: src/server/index.template.ts, blob 63dadc2e43eb27b45ba5c686e9bb30ca2fe269dd.
- Team Lite template: src/server/team-lite-index.template.ts, blob 45beb694b0d324c4a19d7b66a9ba8f94eb10c00b.
- Normal static contract: scripts/auth-enrollment.test.mjs, blob 848e1e7aaa1043a73c35bb384837b7d35d1e89cb.
- Runtime test: scripts/test-auth-enrollment.mjs, blob 6ea501766b9e97b9605650b6abafb85fc4136d24.
- Migration: supabase/migrations/20261107010000_setup_invites.sql, blob cc052b3195f4ec8b3b37e217abd8c3f99b6b080c.
- Test migration: supabase/test-migrations/20261107010000_setup_invites_test.sql, blob c161d8b8122ae701116ac1992a2a58c03d629775.

O desenho candidato:
- Emissão de convite somente após contexto de sessão e verificação de papel admin.
- Token aleatório de 32 bytes; somente SHA-256 armazenado.
- Expiração de 15 minutos.
- /api/setup exige token hexadecimal de 64 caracteres.
- RPC consome o token e define a senha atomicamente.
- Token e metadados são limpos no consumo.
- Resposta genérica para convite inválido/expirado.
- GET /api/account deixa de revelar o estado de setup.
- Resposta global do servidor contém Cache-Control: no-store.

A RPC no projeto isolado foi inspecionada por catálogo: SECURITY INVOKER, search_path vazio, EXECUTE negado a PUBLIC/anon/authenticated e permitido a service_role. O índice único parcial do hash está presente. A migration aceita password_hash NULL ou string vazia.

Pendências:
1. A emissão HTTP por admin e a negação HTTP por não-admin não foram exercitadas.
2. O teste atual prepara as linhas diretamente com service_role e chama a RPC; não comprova entrega do token nem ausência de token bruto nos logs da rota.
3. Não há UI administrativa para emitir convite; exige cliente API interno e entrega privada.
4. A RPC usa coalesce(u.role, 'implementation_user'), que não normaliza string vazia ou whitespace. Isso não concede admin, mas pode deixar papel inconsistente; usar NULLIF(BTRIM(role),'') e testar NULL/empty/whitespace.
5. O guard de mutação está correto quanto à origem e opt-in, mas sua mensagem de erro cita UPSTATUS_SIGNAL_ALLOW_MUTATION mesmo quando o chamador de auth usa UPSTATUS_AUTH_ALLOW_MUTATION.

## 4. AUTH-02 — login/setup sem rate limit próprio

**BLOCKED / CODE INSPECTION.**

Os templates Normal e Team Lite não chamam rate limiter nos handlers de login/setup. Consultas nos dois bancos não encontraram:
- public.upstatus_auth_rate_limits;
- public.consume_upstatus_auth_rate_limit(...).

O rate limit de signaling não protege /api/login, /api/setup ou /api/setup-invite. É necessário rate limit distribuído, fail-closed, com limite por identidade/origem confiável, 429, Retry-After, concorrência e testes de recuperação. Não confiar em X-Forwarded-For ou CF-Connecting-IP sem comprovar que o gateway os fornece de forma não falsificável.

Política de senha observada:
- Normal: setup exige 6 caracteres; login existente aceita 4.
- Team Lite: setup e login aceitam 4.
Isso mantém compatibilidade de login entre clientes para contas Team Lite de 4–5 caracteres, mas permite que Team Lite crie senhas mais fracas. Decidir e documentar uma política de segurança única; não descrever como incompatibilidade de login, pois Normal aceita 4 no login.

## 5. AUTH-04 — senha persistida em texto puro no cliente

**CODE INSPECTION; risco local, sem exploração runtime.**

- Normal client, blob 2e6d6de8c38be02f3d5463dffe3de81c9cb7769a: carrega senha com GM_getValue(passwordKey(...)) e salva com GM_setValue(passwordKey(name), password). Não encontrei remoção correspondente no arquivo.
- Team Lite client, blob ca6644c4f58b2b48f83d3c2783195f82c901e384: carrega e salva senha com sessionStorage.getItem/setItem(passwordKey(...)); não encontrei removeItem correspondente.
- O token de primeiro acesso não é persistido.

A senha fica em texto puro no armazenamento persistente do Tampermonkey no Normal e no sessionStorage de origem no Team Lite. O segundo é acessível a scripts da mesma origem; ambos ampliam impacto de comprometimento local/XSS. Remover a persistência automática, manter apenas o token de sessão necessário e planejar limpeza compatível dos valores legados. A mudança afeta o auto-preenchimento e deve ser registrada como decisão de produto.

## 6. Falta de ambiente oficial TEST e risco no build TEST

**BLOCKED — isolamento de ambiente insuficiente.**

A listagem Supabase retornou somente dois projetos:
- UpStatus produção: dlfvkawaiqduhlazsszm, us-west-2, ACTIVE_HEALTHY.
- upstatus-security-test: bfpjtfqlnypisxljoxkb, sa-east-1, ACTIVE_HEALTHY.

Não existe terceiro projeto oficial TEST.

O build atual (scripts/build.mjs, blob e68bc2ad3c1ada638a384f0c07f9a8c48bc87192) define PROJECT como o ID de produção e TEST_FUNCTION como upstatus-test. O artefato dist/upstatus-test.user.js, portanto, aponta para a função upstatus-test dentro do projeto de produção, não para o projeto isolado. A função upstatus-test v281 está ACTIVE no projeto de produção e compartilha o banco de produção. Não usar esse artefato como ambiente de QA.

O projeto upstatus-security-test contém apenas upstatus-signal-test v32 e upstatus-signal-e2e-once v3; não contém os endpoints completos de produto Normal/Team Lite. Os testes atuais exercitam o endpoint isolado e a RPC de enrollment, não o caminho HTTP completo dos templates candidatos.

## 7. Cutover do Normal: URL de API ainda aponta para backend legado

**BLOCKED — mismatch de build/cutover.**

No build Normal, blob e68bc2ad3c1ada638a384f0c07f9a8c48bc87192:
- a URL de API de produção é construída para /functions/v1/upstatus-screen-share-3-1-1-beta10;
- o updateURL vem de release.json e aponta para /functions/v1/upstatus/upstatus.user.js.

O Edge Function legado beta10 está ACTIVE em produção na versão v6 e seu código implantado ainda contém o setup público antigo e o fallback administrativo por nome. O Edge Function upstatus v480 também ainda contém o código antigo. Assim, publicar apenas o userscript servido por upstatus não garante que as chamadas API do cliente alcancem o novo template. O endpoint de API e o endpoint de atualização precisam ser alinhados e implantados de forma coordenada.

O workflow deploy-production.yml (blob f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce) é manual, exige master, checkout do SHA exato, project ID de produção e versão estável 3.4.7; seu passo de deploy publica somente a função upstatus. Nenhum deploy foi executado. Não foi confirmado um workflow equivalente de deploy Team Lite.

## 8. Produção: 38 Edge Functions ACTIVE

**CODE INSPECTION de inventário e fontes; autorização rota a rota ainda não aprovada.**

Projeto dlfvkawaiqduhlazsszm:
- PostgreSQL 17.11.0.002, 7 migrations; última 20261027155438.
- 38 Edge Functions ACTIVE; todas com verify_jwt=false no gateway.
- 37 entrypoints index.ts não vazios foram lidos. Todos os 37 contêm marcadores de sessão customizada, rotas públicas de login/setup, fallback de admin baseado nos nomes Ricardo/Lohan/Guilherme e nenhum setup-invite/auth rate limiter.
- Um entrypoint está vazio: upstatus-backup-327-pre328 v1; NOT VERIFIED.
- upstatus v480 SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- upstatus-test v281 SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a.
- upstatus-team-lite v15 SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- upstatus-screen-share-3-1-1-beta10 v6 SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.

verify_jwt=false não significa, isoladamente, ausência de autenticação: as fontes não vazias possuem autenticação customizada para rotas privadas. Porém, /api/setup é pública por desenho e nas versões implantadas ainda permite o primeiro cadastro sem convite e aplica fallback administrativo pelo nome. Os endpoints antigos/test/backup permanecem ACTIVE. Não basta atualizar apenas upstatus e upstatus-team-lite; inventariar consumidores e corrigir ou retirar, com plano autorizado, todos os endpoints legados.

Consulta agregada SELECT-only de public.users: 5 contas, 0 password_hash NULL/vazio, 0 roles NULL/vazios e 3 papéis implementation_admin. Nenhuma conta oficial estava reivindicável no instante da consulta; o risco é latente para contas futuras/reinicializadas.

## 9. Rate limit de signaling: teste isolado não prova proteção dos endpoints de produto

O projeto isolado possui RPC consume_upstatus_signal_rate_limit e endpoint upstatus-signal-test v32. O workflow validou 90 aceitas e uma 429 com Retry-After 60s.

Entretanto, buscas nos dois templates de servidor candidatos não encontraram referência a consume_upstatus_signal_rate_limit, upstatus_signal_rate_limits ou implementação de rate limit. Portanto, o teste 90+1 é evidência do endpoint de teste isolado, não prova de rate limiting nos endpoints de produto. O mesmo cuidado vale para a cobertura Retry-After: o adapter do cliente foi testado, mas a integração com os endpoints de produto permanece pendente.

## 10. Realtime, RLS, grants e SECURITY DEFINER

### Produção

Triggers ativos:
- upstatus_messages_broadcast em public.messages;
- upstatus_remote_state_broadcast em public.upstatus_state;
- upstatus_users_broadcast em public.users.

As funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users:
- SECURITY DEFINER;
- search_path=public;
- EXECUTE efetivo para anon e authenticated;
- chamam realtime.send(..., false), isto é, broadcast público;
- a função de mensagens serializa OLD/NEW completos com to_jsonb;
- remote-state envia metadados de comandos/resultados;
- user-status envia nome/status/reason/update metadata.

Security Advisor às 04:29:41Z: 6 WARN (3 funções executáveis por anon e as mesmas 3 por authenticated), 10 INFO de RLS sem policies; Performance e Health sem findings.

Nove tabelas backend-owned em public têm RLS ativo, zero policies e os oito privilégios efetivos para anon e authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. Isso não prova acesso às linhas sem policies permissivas, mas é superfície de privilégios excessiva. realtime.messages tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

Default ACLs de produção continuam amplos para postgres em public/storage e supabase_admin em public/graphql/graphql_public.

### Isolado

Projeto bfpjtfqlnypisxljoxkb:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 29 migrations; última 20261107020949_upstatus_setup_invites_isolated_test.
- upstatus-signal-test v32, SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712.
- upstatus-signal-e2e-once v3, SHA db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053.

As três funções de broadcast isoladas continuam SECURITY DEFINER, search_path=pg_catalog, public, mas EXECUTE está negado a anon/authenticated e permitido a service_role; payload de linha foi reduzido a hint {op}. Ainda usam private=false. realtime.messages continua RLS sem policies e SELECT/INSERT/UPDATE para anon/authenticated. Private Realtime authorization não está concluída.

Security Advisor isolado às 04:29:44Z: 0 WARN e 17 INFO de RLS sem policies. Performance: 4 INFO de índices unused. Health sem findings.

ACL-02 continua bloqueado nos dois projetos: sessão postgres, postgres não é superuser e não pertence a supabase_admin; supabase_admin é superuser. No isolado, defaults postgres/public estão reduzidos a postgres/service_role, mas postgres/storage e defaults supabase_admin em public/graphql/graphql_public continuam amplos.

## 11. Fixtures e segurança operacional

Após os workflows de engenharia terminarem, consulta SELECT-only no projeto isolado retornou zero registros em users, sessions, rooms, members, bindings, events, call_attempts, voice_attempts, rate_limits, chat_reads e messages.

Esta auditoria não executou scripts mutáveis, não criou/limpou fixtures e não iniciou ou repetiu workflows. Os logs existentes mostram que a engenharia usou a origem exata do projeto isolado, service_role e opt-in explícito; os logs registram limpeza. A contagem atual zero foi confirmada separadamente por SELECT.

## 12. Issues, manual acceptance e PR #82

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 24 comentários, 0/8 critérios físicos marcados. Queda real de internet, recuperação sem F5, navegador offline, microfone/display e Normal ↔ Team Lite instalados permanecem MANUAL PENDING.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 86 comentários. O corpo principal ainda mostra o snapshot de 2026-11-03 / HEAD antigo. O comentário [6701433511](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6701433511) diz que os workflows atuais estavam pendentes; essa informação ficou obsoleta após os runs 42336501535, 42336501795 e 42336506037 passarem.
- [PR #82 Validate 42334935903](https://github.com/Reekyi/UpStatus/actions/runs/42334935903): FAILURE em scripts/validate.mjs:26, “production updateURL mismatch”. O log reproduz a divergência herdada do builder/manifesto no master. Não enfraquecer o validador; corrigir a origem do mismatch em engenharia.

## 13. Próximos gates

1. Criar projeto oficial TEST separado ou reconfigurar o artefato TEST para uma origem isolada completa. Não usar upstatus-test do projeto de produção como QA.
2. Alinhar o CLOUD_SERVER do build Normal com a função que receberá o novo template; hoje aponta para beta10 enquanto updateURL aponta para upstatus.
3. Definir e executar plano autorizado para os 37 endpoints antigos ACTIVE com setup público/fallback por nome; investigar o backup de entrypoint vazio.
4. Adicionar testes HTTP reais de emissão por admin, negação de não-admin, conta-alvo inválida, token privado/no-store, consumo e não vazamento em logs.
5. Normalizar role NULL/empty/whitespace na RPC e cobrir os três estados.
6. Implementar rate limit distribuído para login/setup e demonstrar aplicação nos endpoints de produto.
7. Remover persistência automática de senha em texto puro e limpar valores legados com decisão de UX.
8. Completar cutover autenticado de signaling, private Realtime e migrações correspondentes; manter atenção ao flag default false.
9. Reduzir grants das nove tabelas e realtime.messages; resolver ACL-02 via caminho administrativo autorizado.
10. Confirmar estratégia de deploy Team Lite e rollback; testar em projeto oficial TEST.
11. Completar testes físicos #78, reconciliar #79, obter reviews humanas e corrigir o mismatch do validator #82 sem enfraquecê-lo.

## Registro de segurança desta auditoria

- Todas as consultas SQL emitidas pela auditoria foram SELECT-only.
- Nenhuma migration ou Edge Function foi alterada/deployada.
- Nenhuma escrita em produção ou no projeto isolado.
- Nenhum secret, flag, role ou privilégio foi alterado.
- Nenhum userscript publicado; nenhuma PR merged; nenhum release.
- Nenhum workflow iniciado, cancelado ou repetido pela auditoria.
- Nenhuma fixture criada, alterada ou removida pela auditoria.
- O único artefato produzido é este novo relatório na branch QA dedicada. O arquivo principal docs/RELEASE_READINESS.md e os relatórios anteriores foram preservados.
- Nenhum percentual de conclusão foi calculado.


## Confirmação pós-commit documental

- O relatório foi criado em 2026-11-07 no commit 71159892496c3eeea7b62238acf8e04bae45761f; blob inicial 6e30aa85926fd826d357e741d62a84a061cc8e55.
- A criação foi feita como arquivo novo, sem sobrescrever o relatório anterior.
- O arquivo principal docs/RELEASE_READINESS.md permaneceu no blob 1ae48aab678a06b4ff75d061d2355a6449cbe1e0.
- O relatório anterior docs/audits/2026-11-07-upstatus-qa-audit.md permaneceu no blob bed7e52070d8151ebd641516aa0daa84f0026d21.
- PR #82 passou a apontar para o commit documental novo e continuou OPEN/Draft/unmerged. A comparação com master mostrou 82 commits ahead / 0 behind antes desta confirmação final.
- Não havia workflow associado ao commit documental no momento da consulta. A falha anterior do Validate 42334935903 continua sendo a última evidência disponível para o validador.
- Esta confirmação também é somente documental; nenhum código, workflow, migration, função ou banco foi alterado.
