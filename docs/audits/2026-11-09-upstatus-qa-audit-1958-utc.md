# Auditoria independente de QA do UpStatus
**Data:** 09/11/2026, 19:58 UTC (16:58 BRT)  
**Escopo:** GitHub Reekyi/UpStatus e Supabase de produção dlfvkawaiqduhlazsszm, com laboratório bfpjtfqlnypisxljoxkb.  
**Resultado:** NÃO LIBERAR.

## 1. Integridade documental e branches

Li integralmente docs/RELEASE_READINESS.md na branch qa/release-readiness-2026-11-04-master. O blob lido foi 7cfbd70886df42ce790c078c224b19284a632595, com 1.045.105 caracteres e 8.410 linhas. O endpoint fetch_file retornou conteúdo vazio, mas a leitura integral pelo blob foi concluída.

Heads conferidos:
- QA: a61339ba653398f535dea62184b0a6968fd21d22
- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281

QA está 168 commits à frente e 1 atrás de master; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. O único commit exclusivo de master nesta comparação é documental: docs: record read-only AUTH-03 migration preflight. Não fiz rebase. O relatório foi criado como arquivo novo, sem substituir documentos existentes.

## 2. PRs, CI e workflows

Todos os PRs abaixo permanecem abertos e Draft, sem merge.

| PR | HEAD | Evidência de CI | Resultado |
|---|---|---|---|
| #74 Normal | 9c0133e8cf6bd85ac8993888718a408db2f24a3e | Validate 42451736696; Smoke 42451736729 | PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks 41674353127 | PASS histórico |
| #76 Team Lite | eb28e88325d7e8a6236d9050bebabf794d64a8c4 | Candidate Checks 42450476433 | PASS |
| #82 QA | a61339ba653398f535dea62184b0a6968fd21d22 | Validate 42675458041 | FAIL |
| #127 Proveniência | 4ddd703287d8b17f29e3b28880cf0b1ef533f5fb | 42615130073 | PASS offline |
| #128 Review guard | 69d9c166ca92bbc3dce195ea4d714345ea9c326a | 42680119822 e 42680126402 | PASS offline |
| #129 Desativação do dispatcher | 886d364d0c43af0d8aed867bf04c407478af5e8f | 42670881277 e 42670892535 | PASS offline |

Detalhes dos candidatos:
- #74 Smoke: 19/19 verificações não autenticadas e 136/136 autenticadas. Logs confirmam WebRTC de chamada, voz e tela em navegador automatizado, mesh de três membros, rate limit com 90 aceitas e 1 rejeitada por HTTP 429, e limpeza das fixtures.
- #76 Candidate Checks: 16/16 não autenticadas e 110/110 autenticadas. Inclui Playwright Full-IIFE com endpoints inertes, WebRTC automatizado, mesh, rate limit e cleanup.
- #76 está 305 commits à frente e zero atrás de #75; #75 é baseline histórica, não candidato independente atual.
- Esses resultados são CI e integração automatizada. Não são aceitação física em Tampermonkey nem prova de funcionamento em navegadores instalados dos usuários.
- #82 falha em scripts/validate.mjs:26 com production updateURL mismatch. A PR #85 contém correção candidata e Validate 42475230911 passou no HEAD b75707b6eaf678d87863144748b9aed8e2866455, mas #85 continua Draft e não foi integrada. A falha da #82 permanece.
- #128 exige PR mesclado na branch Team Lite, aprovação humana autorizada no SHA exato, allowlist UPSTATUS_RELEASE_REVIEWERS, checks completos, confirmação explícita e revalidação do HEAD imediatamente antes do deploy. O guard offline passou, mas não há review humana registrada, a variável e os required reviewers do environment não foram verificados e a PR continua Draft.
- #129 substitui o workflow legado por um bloqueio fail-closed e passou nos guards offline. A PR continua Draft; o workflow perigoso permanece em team-lite-official.
- A branch protection API retornou protected=false para master e team-lite-official; a consulta de rulesets retornou lista vazia. Isso deixa os controles de review/checks dependentes dos guards e da governança ainda não configurada.

Links:
- #74: https://github.com/Reekyi/UpStatus/pull/74
- #75: https://github.com/Reekyi/UpStatus/pull/75
- #76: https://github.com/Reekyi/UpStatus/pull/76
- #82: https://github.com/Reekyi/UpStatus/pull/82
- #85: https://github.com/Reekyi/UpStatus/pull/85
- #127: https://github.com/Reekyi/UpStatus/pull/127
- #128: https://github.com/Reekyi/UpStatus/pull/128
- #129: https://github.com/Reekyi/UpStatus/pull/129
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42675458041

## 3. Runtime implantado, compatibilidade e Realtime

Inventário read-only do projeto de produção:
- 38/38 Edge Functions ACTIVE; todas reportam verify_jwt=false. Isso não significa ausência automática de autenticação: os endpoints UpStatus usam sessão própria, mas cada rota deve ser revisada.
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd. Artefato userscript embutido 3.4.7.
- API Normal upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb. Userscript embutido 3.4.30.
- upstatus-test v281 está no próprio projeto de produção. Não existe um terceiro projeto Supabase dedicado ao produto completo de TEST.
- Não existe Edge Function upstatus-signal em produção.

Os artefatos implantados Normal e Team Lite foram decodificados e inspecionados:
- Ambos usam a publishable key e assinam o tópico público upstatus-screen-share-live-3-1-1-beta10, sem private:true e sem realtime.setAuth().
- Os handlers recebem call_signal, voice_room_signal e o evento de compartilhamento de tela. O cliente verifica sua própria sessão local e geração de login, mas não valida criptograficamente quem publicou o broadcast nem prova membership emitida pelo servidor.
- O payload contém identificadores declarados pelo cliente, como from, to, roomId, SDP e ICE. Os checks estruturais não substituem identidade/autorização do remetente.
- O risco de spoofing/injeção de sinalização é confirmado por inspeção estática. Não publiquei broadcasts nem tentei explorar o canal externamente; a exploração não foi reproduzida.
- Os triggers PostgreSQL publicam no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Os clientes implantados escutam o tópico legado diferente. Há divergência concreta entre o tópico dos triggers e o dos clientes, com risco de perda dos eventos originados pelo banco.
- Nos candidatos #74/#76, signaling_transport_enabled permanece false por padrão. Com a flag desligada, o caminho público legado continua. O transporte server-mediated é opt-in e o endpoint de produção correspondente não existe. Não é seguro considerar RT-01 resolvido.
- O workflow de deploy Normal na #74 publica somente a função upstatus, enquanto o userscript usa a API separada beta10. A publicação isolada de upstatus não atualizaria o backend de API usado pelo cliente. O workflow também mantém release.json em 3.4.7.

O laboratório bfpjtfqlnypisxljoxkb tem duas funções de teste: upstatus-signal-test v32 e upstatus-signal-e2e-once v3. A função upstatus-signal-test v32 retorna VOICE_ATTEMPT_CONFLICT para HTTP 409, enquanto o adapter candidato especializa VOICE_ATTEMPT_ALREADY_ACTIVE. Esse contrato não coincide e o caso específico recebe mensagem genérica. É uma divergência de integração candidata; não foi executado teste HTTP novo nesta auditoria.

## 4. Supabase: RLS, grants, SECURITY DEFINER e Storage

Consultas somente SELECT e inventário read-only:
- 10 tabelas public com RLS habilitado e sem policies.
- 9 tabelas public com grants diretos para anon/authenticated, incluindo TRUNCATE.
- 24 entradas em pg_default_acl.
- Três funções de broadcast SECURITY DEFINER com search_path=public e EXECUTE concedido a anon e authenticated: upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users.
- O Security Advisor reporta 10 INFO de RLS sem policy e 6 WARN de SECURITY DEFINER executável (3 para anon e 3 para authenticated). Não fiz chamada RPC de teste; a advertência do Advisor foi registrada como achado sem alegar exploração.
- upstatus_broadcast_messages envia to_jsonb(OLD/NEW), ou seja, a linha completa. As outras funções publicam estado de usuário e metadados de comando/resultado.
- Buckets chat-images e profile-images estão públicos, com limite de 20 MiB cada. storage.objects não tem policies; anon e authenticated têm SELECT, INSERT, UPDATE e DELETE.
- O código sniffMime retorna o MIME declarado quando a assinatura não é reconhecida. O signedUploadRoute valida MIME/tamanho/nome declarados e cria URL assinada, mas não recebe nem inspeciona os bytes enviados. Os testes de signed-upload do CI cobrem contrato e metadados, não validação de conteúdo real.

## 5. AUTH-03 e migrations

AUTH-03:
- Os runtimes implantados Normal beta10 v6 e Team Lite v15 ainda roteiam POST /api/setup para login(req,true), sem token de convite e sem consumo atômico.
- O fallback de administrador por nome permanece no caminho antigo quando o papel está vazio.
- Normal exige senha mínima de 6 caracteres; Team Lite exige 4.
- Produção não tem colunas setup_token_* nem RPC consume_upstatus_setup_invite.
- Os candidatos #74/#76 exigem token hexadecimal de 64 caracteres e chamam a RPC de consumo atômico. No laboratório, a RPC existe como SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role.
- Não encontrei rate limit específico para login, setup ou emissão de convite nos templates candidatos. O rate limit 90+1/429 aprovado no CI é do endpoint de sinalização, não do onboarding.

Migrations:
- Produção tem 7 migrations remotas.
- A branch Supabase main continua MIGRATIONS_FAILED; o preview aparece ACTIVE_HEALTHY.
- Os quatro SQLs originais abaixo retornaram 404 em master:
  1. 20261023154754_create_upstatus_visual_config.sql
  2. 20261026195855_add_chat_message_file_name.sql
  3. 20261027154329_allow_chat_document_mime_types.sql
  4. 20261027155438_set_upstatus_upload_limits_20mb.sql
- O manifesto da PR #127 registra somente as três migrations originais presentes e declara explicitamente que as quatro ausentes não foram recuperadas. O guard offline passou, mas isso não resolve a proveniência nem o estado MIGRATIONS_FAILED.
- Não reconstruir os SQLs a partir do schema atual.

## 6. Isolamento e aceitação física

O laboratório está ativo, separado da produção, com 38 migrations, 17 tabelas public consultadas e todas com zero linhas, zero mensagens Realtime e sem buckets. A RPC de convite existe somente no laboratório. Isso comprova um laboratório isolado de sinalização/autenticação.

Limite: o laboratório não é um ambiente completo do produto. A função upstatus-test continua implantada dentro do projeto de produção e não existe um projeto independente para o produto completo de TEST. Por isso TEST-ISOLATION fica em andamento, não concluído.

Issue #78 continua com 0/8 critérios físicos aprovados. Nenhum teste real de Tampermonkey com queda de internet, recuperação sem F5, reentrada em sala, novas chamadas, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite foi executado nesta rodada. CI/Playwright não substitui essa aceitação.

## 7. Gates desta execução

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 39 mensagens Realtime observadas, todas private=false; canal público e tópico divergente nos clientes implantados |
| TEST-ISOLATION | in_progress | laboratório isolado e vazio, mas sem projeto separado para o produto completo |
| MIGRATION-PROVENANCE | blocked | quatro SQLs remotos ausentes de master e main MIGRATIONS_FAILED |
| AUTH-03 | blocked | setup antigo em produção; RPC só no laboratório; rate limit de onboarding ausente |
| ACL-STORAGE | blocked | grants amplos, 24 Default ACLs, buckets públicos e zero policies em storage.objects |
| RECONNECT | pending | 0/8 critérios físicos; depende de teste instalado e confirmação de Ricardo |
| HUMAN-REVIEW | pending | PRs de release continuam Draft, sem review humana registrada e sem autorização explícita de Ricardo |

## 8. Próximos passos

1. Fazer a sinalização autenticada ser o padrão seguro em Normal e Team Lite; desativar o recebimento público de call_signal, voz e tela e alinhar o tópico Realtime.
2. Recuperar os quatro SQLs originais e resolver MIGRATIONS_FAILED por processo revisado; não reconstruir migrations.
3. Aplicar AUTH-03 com convite de uso único, consumo atômico e rate limit próprio para login/setup/invite.
4. Remover grants excessivos e definir policies/privacidade de Storage e Realtime.
5. Corrigir o workflow Normal para coordenar a função de entrega e a API beta10; manter o dispatcher Team Lite legado bloqueado até integração e revisão.
6. Criar projeto isolado para o produto completo de TEST, separado do laboratório de sinalização e de produção.
7. Executar os oito critérios físicos da Issue #78 em Tampermonkey para Normal e Team Lite, incluindo queda de internet por aproximadamente 10 segundos e retorno sem F5.
8. Exigir revisão humana autorizada no SHA exato e autorização explícita de release antes de qualquer publicação.

## 9. Limites e alterações realizadas

Nenhuma alteração em produção. Nenhum SQL write, migration, deploy, workflow dispatch de produção, merge, release, publicação de userscript, alteração de secrets/flags, fixture ou operação destrutiva foi executada. Todas as consultas SQL foram SELECT-only. Não executei testes manuais nem testes de navegador nesta rodada; apenas revalidei logs de CI existentes e inspecionei código/configuração.

As únicas escritas desta execução são este relatório novo na branch QA e a atualização do comentário dedicado de QA na Issue #79. O comentário da Engenharia foi preservado.
