# UpStatus — auditoria independente de QA

**Data:** 2026-11-12 00:33:51 UTC  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório isolado:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**Veredito:** NOT READY

## Escopo e método

Revalidação read-only dos heads, PRs #74, #75, #76, #82 e linhas relacionadas (#89, #131, #142, #143, #145 e #146), workflows, fontes candidatas, inventário de migrations, Edge Functions, catálogo PostgreSQL, grants, RLS, Default ACL, Realtime, Storage e Security Advisor.

Classificação da evidência:
- **CI PASS/FAIL:** resultado de workflow no commit exato indicado.
- **CODE INSPECTION:** leitura estática de fonte, workflow ou catálogo; não é teste de runtime.
- **AUTOMATED LAB:** teste automatizado executado pela Engenharia no projeto isolado; a QA apenas inspecionou o resultado e confirmou a limpeza por SELECT.
- **MANUAL PENDING:** navegador/dispositivo/aceitação física não executados pela QA.
- **BLOCKED:** dependência ou risco não resolvido.

Nenhum workflow foi iniciado ou repetido pela QA. Não houve chamada HTTP de exploração, teste físico, escrita SQL, migration, deploy, merge, release ou publicação de userscript.

## Heads e governança

| Referência | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA | 58754cd7a12cfe120ef06fde5567f111fd713d7e |
| #74 | fb878537d95db9097cce6d29a14260b9fd8d2e3d |
| #75 | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| #76 | c4dee8d2c502499de5f95932ac14a90cffb56196 |
| #82 | 58754cd7a12cfe120ef06fde5567f111fd713d7e |
| #89 | 5c46eea3e4c9f909d3e0992bacfbd2263c2d8024 |
| #131 | 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b |
| #142 | 2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4 |
| #143 | c4a04fa755b877bc76b1372170a26e7b974264e6 |
| #146 | 71c5ce2f730ade8ee3e8b090498202933809ce5c |

QA está 233 commits à frente e 1 atrás de master. Não fiz rebase. O arquivo docs/RELEASE_READINESS.md permanece no blob 7cfbd70886df42ce790c078c224b19284a632595, com 8.410 linhas; o último checkpoint interno é 2026-11-08 18:30 UTC. O documento foi preservado e este relatório é separado.

**Governança:** master, team-lite-official e QA retornam protected=false; a API de rulesets retornou lista vazia. Não há reviews humanas nas PRs #74, #75, #76, #82, #89, #143 e #146. A proteção de publicação do dispatcher não substitui branch protection.

## PRs e CI

| PR | Estado | Evidência e avaliação |
|---|---|---|
| #74 Normal | Open / Draft | Validate e Smoke PASS no HEAD fb878537: [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42753434336). A branch está 883 commits à frente e 1 atrás de master; exige revisão de integração, não merge isolado. |
| #75 Team Lite | Open / Draft | HEAD 7bbf9b9. PASS histórico [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127); não substitui a candidata atual #76. |
| #76 Team Lite | Open / Draft | HEAD c4dee8d. Candidate Checks [43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) SUCCESS. 110/110 verificações autenticadas; WebRTC de chamada, voz e vídeo de tela no Chromium; rate limit distribuído com 90 aceitas e 1 rejeitada (HTTP 429); consumo atômico de convite e rate limit de emissão; smoke do IIFE completo. Todos os 20 passos listados do job concluíram success. |
| #82 QA | Open / Draft | HEAD 58754cd. Validate [43121644742](https://github.com/Reekyi/UpStatus/actions/runs/43121644742) FAILURE: production updateURL mismatch em scripts/validate.mjs. Não houve rerun. |
| #89 Normal AUTH-03 | Open / Draft | Guard de PR [42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) SUCCESS. Implementa convite de primeiro acesso e preflight de cutover, mas não contém rate limit de emissão. |
| #131 Normal invite rate limit | Open / Draft | A fonte chama consume_upstatus_setup_invite_rate_limit com limite 5/900s. Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) SUCCESS, 136/136 no relatório de execução anterior. Não implementa rate limit de tentativas de login. |
| #143 Dispatcher | Open / Draft | Validate [43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347) SUCCESS. A branch diverge de #142 e ainda não incorpora a correção de comandos da #146. |
| #146 Remote hints/reconnect | Open / Draft | Validate [43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) SUCCESS. Corrige o tratamento de remote_command e remote_result como hints para polling autenticado. |

### #76: falha anterior do contrato textual resolvida

O commit c4dee8d altera somente a asserção em scripts/team-lite-candidate-check.mjs. O teste agora acompanha a implementação real: sessão autenticada, geração, membro e token esperados; timer coalescido e descarte de sessão obsoleta. A mudança não enfraquece a validação do produto.

O log confirma 110/110 testes autenticados e os testes adicionais de navegador/contratos. A execução usou o projeto isolado bfpjtfqlnypisxljoxkb, não produção.

Após a execução, a QA consultou exatamente 18 tabelas públicas do laboratório e realtime.messages. Todas retornaram zero linhas. O log também confirma cleanup de usuários, sessões, salas, memberships e eventos. Isso é evidência de isolamento/cleanup, não de aceitação física.

### AUTH-03 Normal: duas linhas candidatas ainda separadas

A PR #89 implementa:
- token aleatório de 256 bits, persistindo somente o hash;
- expiração de 15 minutos;
- consumo atômico por RPC SECURITY INVOKER, search_path vazio e EXECUTE para service_role;
- ocultação do estado de setup em /api/account;
- autorização administrativa pelo papel persistido;
- limpeza do chat exigindo Ricardo e papel de administrador.

A função issueSetupInvite da #89 não chama rate limit e não contém consume_upstatus_setup_invite_rate_limit. Seu manifesto exige somente três migrations de enrollment. A migration 20261109230000_setup_invite_rate_limit e a chamada de rate limit estão na linha #131, separada e divergente. Não há rate limit de tentativas de login identificado.

A release.json da #89 continua 3.4.7, igual à versão estável implantada. verify-production-cutover.mjs exige versão estável superior a 3.4.7. O deploy permanece fechado até uma versão nova ser explicitamente escolhida. O run #42840853509 foi somente o guard de PR; não executou deploy.

## Compatibilidade Normal / Team Lite e Realtime

### Comandos remotos

**CODE INSPECTION:**
- A fonte Normal #142 ainda executa executeRemoteCommand(c) diretamente a partir do payload de remote_command.
- Normal #146 substitui isso por broadcast vazio como aviso e chama scheduleRemoteStatusPoll(); comando e resultado são obtidos por endpoints autenticados, com verificação de token/membro.
- Team Lite #76 também usa o broadcast como aviso e polling autenticado, com guarda de geração, membro e token.
- A branch do dispatcher #143 é divergente de #142 e não contém a alteração da #146. Portanto, o dispatcher atual não pode ser considerado portador dessa correção.

### Voz e compartilhamento de tela

A correção de remote-command não fecha call_signal, voice-room e screen-share:
- Normal #146 ainda encaminha payloads de call_signal, VOICE_ROOM_EVENT e SCREEN_ROOM_EVENT aos respectivos handlers.
- Team Lite #76 ainda recebe esses eventos públicos; o transporte autenticado é opt-in, com signaling_transport_enabled default false e endpoint vazio.
- Nenhum dos dois arquivos candidatos inspecionados configura private:true ou realtime.setAuth().
- O projeto de produção não tem Edge Function server-mediated upstatus-signal. As funções upstatus-signal-test v32 e upstatus-signal-e2e-once v3 existem somente no laboratório.

RT-01 permanece bloqueado. Os testes de WebRTC autenticado no laboratório não demonstram que a distribuição de produção use transporte privado por padrão.

## Supabase produção — snapshot read-only

Projeto dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002. A organização possui somente dois projetos: produção e upstatus-security-test.

### Realtime

- 109 registros observados em realtime.messages; todos private=false.
- Todos no tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- Clientes Normal/Team Lite continuam usando o tópico screen-share beta10, divergente do tópico dos triggers.
- realtime.messages: RLS true, FORCE RLS false, zero policies; anon/authenticated têm SELECT e INSERT efetivos.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public e têm EXECUTE efetivo para anon e authenticated.
- Security Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS habilitado sem policies.

Não foi feita exploração nem chamada HTTP de RPC. O risco registrado é a configuração e o payload público confirmados pelo catálogo/código.

### RLS, grants e ACL

- 10 tabelas públicas com RLS habilitado e sem policies.
- 126 grants diretos para anon/authenticated, distribuídos em 9 tabelas.
- 18 grants TRUNCATE efetivos no conjunto consultado; RLS não protege TRUNCATE.
- A consulta atual encontrou 24 entradas Default ACL contendo 75 ACL items. Isso corrige a contagem anterior de 120 itens, que não foi reproduzida nesta consulta.

### Storage e mensagens

- chat-images e profile-images são públicos, com limite de 20 MiB cada.
- 168 objetos em chat-images e 20 em profile-images: 188 objetos.
- Zero policies próprias em storage.objects.
- public.messages: 296 linhas. Distribuição: 7 audio, 5 document, 17 image, 22 system, 241 text e 4 video.
- file_name está NULL nas 296 linhas, incluindo os cinco registros do tipo document. A coluna existe, mas não está populada nos registros consultados.

### Migrations, Edge Functions e AUTH-03

- Produção: 7 migrations e 38 Edge Functions ativas.
- Laboratório: 39 migrations e 2 Edge Functions de sinalização.
- As únicas três migrations SQL presentes em master são as versões 20261005160000, 20261005173000 e 20261005180000.
- O ledger de produção também contém quatro migrations cujos arquivos originais não estão em master: 20261023154754 create_upstatus_visual_config; 20261026195855 add_chat_message_file_name; 20261027154329 allow_chat_document_mime_types; 20261027155438 set_upstatus_upload_limits_20mb.
- Produção não possui colunas setup_token_*, tabela de rate limit de convite ou RPC consume_upstatus_setup_invite.
- O laboratório possui as quatro colunas setup_token_*, as RPCs de consumo e rate limit, e terminou sem fixtures.
- Runtimes principais: upstatus v480, upstatus-team-lite v15, upstatus-screen-share-3-1-1-beta10 v6 e upstatus-test v281. Todas as funções de produção reportam verify_jwt=false; isso, isoladamente, não prova ausência de autenticação, pois os handlers centrais usam sessão customizada.

## Issues, teste manual e gates

- Issue #78 permanece sem os oito critérios físicos aprovados. A QA não executou queda real de rede, reconexão sem F5, chamada instalada, microfone ou compartilhamento de tela.
- Issue #79: comentário QA dedicado atualizado; comentário da Engenharia preservado.
- O laboratório isolado está funcionando e foi limpo após a execução #76. Não existe, porém, um terceiro projeto full-product TEST para aceitação integrada de toda a distribuição Normal/Team Lite.

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, tópicos divergentes e sinalização de voz/tela sem transporte privado por padrão. |
| TEST-ISOLATION | DONE | Laboratório separado, guard explícito, workflow concluído e cleanup confirmado por SELECT. A ausência de full-product TEST continua como limitação distinta. |
| MIGRATION-PROVENANCE | BLOCKED | Quatro arquivos SQL originais continuam ausentes de master. |
| AUTH-03 | IN PROGRESS | #76 e #131 têm rate limit; #89 tem enrollment Normal; as linhas não estão integradas e produção não tem o schema. |
| ACL-STORAGE | BLOCKED | Grants, Default ACL e buckets públicos sem policies próprias continuam. |
| RECONNECT | PENDING | CI de recuperação não substitui teste físico Normal/Team Lite sem F5. |
| HUMAN-REVIEW | PENDING | Nenhuma aprovação humana nas PRs auditadas e nenhuma autorização explícita de release. |

## Próximas ações recomendadas

1. Reconciliar #89 e #131 no stack Normal, incluindo rate limit de emissão e um controle separado de tentativas de login.
2. Integrar #146 ao dispatcher #143 e validar a publicação no SHA exato.
3. Implementar transporte server-mediated para call_signal, voz e tela, privado/autenticado por padrão em Normal e Team Lite.
4. Alinhar tópicos e reduzir payloads Realtime; remover EXECUTE cliente desnecessário das funções trigger-only.
5. Corrigir grants e Default ACL com owner autorizado; decidir Storage privado e alinhar limites.
6. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
7. Corrigir updateURL da QA sem enfraquecer o validator.
8. Criar ambiente full-product TEST e executar os oito critérios físicos; obter aprovação humana antes de qualquer release.

**Recomendação de release: NOT READY.**

## Registro de segurança

A QA executou somente leituras no GitHub e Supabase, além de escrita documental nesta branch QA e atualização do comentário QA existente na Issue #79. Nenhuma produção foi alterada. Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/grant/policy/ACL ou operação destrutiva foi realizada. O workflow #43124413080 foi iniciado pela Engenharia no laboratório isolado; a QA apenas inspecionou seus logs e confirmou a limpeza por SELECT.
