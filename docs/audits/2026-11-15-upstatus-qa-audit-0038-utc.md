# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-15T00:38:53.757Z  
**Repositório:** Reekyi/UpStatus  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Supabase laboratório:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**HEAD QA antes deste relatório:** 5866a97bbdd123423d6b4d683769cdc7d3599b58

## Escopo e método

Revalidei heads reais, PRs #74, #75, #76 e #82, PRs auxiliares ligadas às correções, issues #78 e #79, workflows e logs exatos de CI. Li o blob completo de docs/RELEASE_READINESS.md: 1.045.105 bytes e 8.410 linhas, blob SHA 7cfbd70886df42ce790c078c224b19284a632595. O último checkpoint interno desse documento continua datado de 08/11/2026 às 18:30 UTC; portanto está desatualizado em relação às evidências de 14–15/11.

Também inspecionei código das Edge Functions implantadas, artefatos userscript embutidos, catálogos PostgreSQL, RLS, grants, Default ACL, Storage, Realtime e Security Advisor. Todas as consultas SQL desta execução foram SELECT-only. Não executei chamadas RPC de risco, não publiquei eventos e não fiz testes manuais.

Vocabulário: **CI PASS/FAIL** significa somente resultado do workflow no SHA indicado; **inspeção de código** é evidência estática; **manual pendente** exige navegador/usuário real; **bloqueado** indica dependência objetiva.

## 1. Heads e governança do GitHub

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA antes deste relatório | 5866a97bbdd123423d6b4d683769cdc7d3599b58 |

Comparação QA contra master: **322 commits à frente e 1 atrás**, merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. A PR #82 contém 172 arquivos divergentes e todos estão em docs/; não encontrei arquivo de runtime fora de docs.

As quatro branches consultadas retornam protected=false. O endpoint de rulesets do repositório retorna lista vazia. Não há proteção efetiva retornada para master, develop, team-lite-official ou QA. Recomendo exigir checks e review humana em master e team-lite-official e proteger a branch QA contra atualização concorrente.

## 2. PRs e CI no HEAD exato

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | Aberta, Draft | Validate PASS e Smoke PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Aberta, Draft | Candidate Checks PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | Aberta, Draft | Candidate Checks PASS |
| #82 QA | 5866a97bbdd123423d6b4d683769cdc7d3599b58 | Aberta, Draft | Validate FAIL |
| #167 Builder/Chat | d100b0820dd7f98e2b78a98e6b6f8c09f13b1867 | Aberta, Draft | Validate PASS |

Reviews submetidas: zero em #74, #75, #76, #82 e #167.

- #74: [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) passaram no HEAD exato. Logs confirmam 19/19 checks não autenticados, 136/136 autenticados, WebRTC de chamada/voz/tela, malha de três membros, rate limit de 90 aceitos e o seguinte rejeitado com HTTP 429/Retry-After 60s e limpeza das fixtures. A etapa de rate limit distribuído de emissão de setup-invite foi SKIPPED; não considerar essa cobertura aprovada.
- #75: [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é PASS histórico, não substitui #76. A comparação confirma que #76 descende de #75 e está 327 commits à frente, zero atrás. São uma pilha, não duas entregas independentes.
- #76: [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) passou: 16/16 não autenticados, 110/110 autenticados, 11/11 contratos HTTP offline, Full-IIFE/Playwright com APIs e permissões simuladas, WebRTC call/voice/screen, rate limit 90+1/429 e limpeza das fixtures.
- #82: [Validate 43654228990](https://github.com/Reekyi/UpStatus/actions/runs/43654228990) falhou no SHA 5866a97bbdd123423d6b4d683769cdc7d3599b58. Checkout passou; Validate falhou em scripts/validate.mjs:26 com production updateURL mismatch.
- #167: [Validate 43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) passou no SHA d100b08. O log confirma regressões de composer, link cards, screen sharing, mute, cores, notificações e unread indicators. Não houve Smoke Supabase nem teste manual.

Evidências auxiliares:
- #165: o guard HTTP de contrato [43619801133](https://github.com/Reekyi/UpStatus/actions/runs/43619801133) passou, mas o [Smoke 43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) foi bloqueado pelo Supabase com HTTP 402, exceed_edge_functions_invocations_quota. Foram 0/19 checks não autenticados aprovados; checks autenticados foram SKIPPED.
- #166: [Guard 43624572780](https://github.com/Reekyi/UpStatus/actions/runs/43624572780) passou offline. Não é Smoke integrado.

### Builder e workflows

A #167 corrige o builder Normal para usar release.scriptUrl como URL de distribuição, mantendo o endpoint beta10 separado como API. O validator candidato compara updateURL, downloadURL e o updater manual com o manifesto. O candidato passou, mas master e #82 continuam vermelhos até integrar a correção e validar o novo SHA da QA.

O workflow master ainda faz checkout sem ref explícito, não verifica projeto/SHA e usa Supabase CLI latest. O workflow candidato da #74 adiciona verificação de branch, SHA, projeto e token, e fixa CLI 2.122.1; porém ainda fixa release 3.4.7 e publica somente upstatus, sem coordenar a função beta10.

O workflow oficial Team Lite em team-lite-official continua publicando o slug upstatus, em vez de upstatus-team-lite, usa CLI latest e não valida projeto/SHA. **Não despachar esse workflow.**

## 3. Artefatos instalados e compatibilidade Normal/Team Lite

A Management API confirma produção ACTIVE_HEALTHY com 38 Edge Functions ACTIVE. Versões operacionais:
- Normal: upstatus v480, userscript embutido 3.4.7.
- API Normal: upstatus-screen-share-3-1-1-beta10 v6.
- Team Lite: upstatus-team-lite v15, userscript embutido 3.4.30.
- TEST legado: upstatus-test v281.

Decodifiquei os userscripts embutidos em produção:
- Normal 3.4.7 tem updateURL/downloadURL estáveis apontando para /functions/v1/upstatus/upstatus.user.js.
- Team Lite 3.4.30 aponta updateURL/downloadURL para o userscript em team-lite-official no GitHub.
- Ambos não contêm private:true, realtime.setAuth(), signalTransportFlag ou signalTransportEndpoint.
- Ambos assinam o tópico Realtime legado e escutam call_signal, voice_room_signal, screen-share e remote_command.
- Normal passa o payload recebido de call_signal diretamente para receiveCallSignal e executa remote_command quando o target coincide com o membro local.
- Team Lite também executa remote_command e entrega call_signal ao handler; a checagem de sessão local não autentica a identidade do publicador.

Os candidatos #74/#76 contêm helper server-mediated e proteções de proveniência, mas o transporte continua opt-in/default false e o endpoint vazio. Com a flag desligada, o fallback público de voz/tela permanece. Os templates candidatos Normal e Team Lite têm setup-invite e proteção por papel para limpeza do chat, mas não implementam as rotas server-mediated de sinalização. Nenhum backend de sinalização equivalente existe nos runtimes de produção.

## 4. Realtime e funções PostgreSQL

Produção:
- Três triggers usam funções SECURITY DEFINER: upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users.
- As três usam search_path=public e têm EXECUTE efetivo para anon e authenticated. O Security Advisor reporta 3 WARN para cada papel.
- As funções retornam trigger; não tentei invocação RPC. Os grants continuam desnecessários e o search_path deve ser endurecido.
- upstatus_broadcast_messages serializa OLD/NEW integralmente com to_jsonb e chama realtime.send(..., false), incluindo potencialmente texto, URLs e metadados de mensagens.
- remote_state publica campos de comando/resultado; users publica nome, status, reason, updated_at e sync.
- Snapshot dos últimos 14 dias em realtime.messages: 106 eventos, todos private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0: 72 user_status, 26 db_change, 4 remote_command e 4 remote_result.
- Clientes instalados usam upstatus-screen-share-live-3-1-1-beta10; o tópico não coincide com o tópico dos triggers.
- realtime.messages tem RLS=true, FORCE RLS=false, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.

Laboratório:
- As três funções de broadcast usam search_path vazio e não concedem EXECUTE a anon/authenticated.
- Payloads foram minimizados para somente {op: TG_OP}; os três broadcasts continuam private=false.
- realtime.messages não tem eventos/policies e ainda tem grants SELECT/INSERT/UPDATE para anon/authenticated.

Não confirmei o setting Allow public access do Dashboard e não reproduzi acesso externo. A classificação é risco de exposição/confiança não autenticada confirmado estaticamente, não vazamento externo comprovado.

## 5. RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas públicas com RLS e zero policies.
- Nove tabelas concedem a anon e authenticated INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER; 126 linhas de grants diretos. upstatus_visual_config não concede esses privilégios.
- RLS sem policies bloqueia DML por linha, mas não protege TRUNCATE.
- 24 registros Default ACL, 75 entradas ACL expandidas.
- storage.objects tem zero policies e grants INSERT/SELECT/UPDATE/DELETE a anon/authenticated.
- Buckets chat-images e profile-images são públicos, limite 20 MiB cada; 168 objetos em chat-images e 20 em profile-images.

Laboratório:
- 18 tabelas públicas com RLS e zero policies, sem grants diretos de tabela para anon/authenticated.
- 25 registros Default ACL e 70 entradas ACL expandidas; ainda há defaults amplos em storage e em schemas administrados por supabase_admin.
- storage.objects tem zero policies e grants INSERT/SELECT/UPDATE/DELETE a anon/authenticated.
- Não há buckets nem objetos de Storage.

Security Advisor atual:
- Produção: 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated referentes às três funções SECURITY DEFINER.
- Laboratório: 18 INFO de RLS sem policy, sem WARN.

## 6. AUTH-03, Edge Functions e migrations

Produção:
- 5 usuários e 319 sessões.
- public.users não tem colunas setup_token_*.
- consume_upstatus_setup_invite não existe.
- Não há tabelas de rate limit.
- Runtimes implantados ainda expõem POST /api/setup legado e atribuem papel administrativo por fallback nominal quando o papel está vazio. /api/chat/clear ainda verifica apenas o nome Ricardo.
- As candidatas Normal e Team Lite já têm token de convite e papel persistido no template; a #167 também exige papel de administrador na limpeza do chat. Nada disso foi implantado em produção.

Laboratório:
- Zero usuários e zero sessões.
- Quatro colunas setup_token_*.
- RPC consume_upstatus_setup_invite presente.
- Tabelas upstatus_setup_invite_rate_limits e upstatus_signal_rate_limits presentes.
- Duas Edge Functions ACTIVE: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- O laboratório tem schema de sinalização, mas não é Full-Product TEST e não possui fixtures.

A função isolada upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE, que o helper candidato espera mapear para 409. O contrato HTTP real continua não comprovado.

Migrations listadas: produção 7; laboratório 39. A proveniência dos SQLs originais não foi revalidada byte a byte nesta execução; não atualizar o gate MIGRATION-PROVENANCE.

Todas as 38 Edge Functions de produção e as duas de laboratório reportam verify_jwt=false na plataforma. Os handlers principais usam autenticação customizada de sessão; esse campo isolado não prova ausência de autenticação.

## 7. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos marcados, última atualização 08/11. Não houve teste Tampermonkey instalado, perda real de rede, reconexão sem F5, permissões reais de microfone/tela ou interoperabilidade física.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16/35 itens marcados e 19 pendentes no corpo atual.

Nenhum teste manual foi executado nesta auditoria. Não havia checkout local/browser com Tampermonkey para testar. CI Chromium/API foi classificado somente como automatizado.

## 8. Veredito e próximos passos

**NÃO LIBERAR.** Bloqueadores:
1. Remover payloads completos de mensagens dos broadcasts de produção e migrar para Realtime privado/autorizado ou transporte server-mediated.
2. Implementar backend server-mediated nas duas linhas de produção, validar sessão, membership, destinatário, replay/expiry e rate limit; tornar o modo seguro default e remover fallback público sensível.
3. Restringir EXECUTE das funções SECURITY DEFINER, endurecer search_path, revisar grants/Default ACL e criar política coerente de RLS.
4. Decidir Storage privado e alinhar policies, limites e ownership.
5. Completar AUTH-03 em produção por plano revisado e autorização explícita.
6. Corrigir o workflow oficial Team Lite e fortalecer proteção das branches.
7. Integrar a correção do builder, corrigir #82 e executar Validate no novo HEAD.
8. Provisionar Full-Product TEST, restaurar quota do laboratório, concluir os testes físicos da #78 e obter reviews humanas.

Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva. A única escrita desta execução é este novo relatório documental na branch QA.
