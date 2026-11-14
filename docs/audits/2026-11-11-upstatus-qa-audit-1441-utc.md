# UpStatus — auditoria independente de qualidade
**Data:** 11/11/2026, 14:41 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** `not_ready`

## Escopo e método

Revalidação read-only de branches, PRs, workflows e logs existentes; inspeção estática dos runtimes Edge Function implantados e dos candidatos; consultas SQL exclusivamente SELECT; comparação dos quatro statements recuperados em #135 com o ledger de produção.

Não foram executados testes manuais de navegador, HTTP, dispositivo ou reconexão física. Não foram iniciados reruns. Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag, role, grant, policy, ACL ou fixture foi realizada.

## Heads e integridade documental

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `4c44031e01ba8a1fc4a4c03eb77412fb48f35083` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| PR #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 Team Lite | `4edfbf25476c7c751741b2e14c2c88fdc554f618` |
| PR #82 QA | `4c44031e01ba8a1fc4a4c03eb77412fb48f35083` |
| PR #131 AUTH-03 Normal | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| PR #135 migration recovery | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` |
| PR #141 updater/chat | `61d00fb8666f4ca91c5a3c52a415d877b31a10cf` |
| PR #142 Normal API | `f4b1a6dbccecf63152bf353fcaaadfcd41357e11` |
| PR #143 dispatcher | `34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa` |

QA está **221 commits à frente e 1 atrás** de master; a comparação não foi rebased. O commit master-only é `9d40461`, documental. PR #76 está 380 commits à frente de `team-lite-official`; PR #75 está 59 à frente. #76 está 321 commits à frente de #75 e não está atrás dela. PR #131 é um commit à frente do HEAD #74. #142 está 11 commits à frente de #141. #143 está 13 à frente e 1 atrás da branch atual de #142.

`docs/RELEASE_READINESS.md` foi lido integralmente pelo blob `7cfbd70886df42ce790c078c224b19284a632595`: 8.410 linhas. O último checkpoint dentro do documento principal é 08/11/2026, 18:30 UTC. Os relatórios de 11/11 continuam separados; o documento principal não foi sobrescrito.

## CI e PRs

| PR / execução | Resultado observado | Limite da evidência |
|---|---|---|
| [#74 Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) | SUCCESS no HEAD exato | CI |
| [#74 Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | SUCCESS no HEAD exato | As etapas de teste do rate limit de convite foram SKIPPED |
| [#75 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS | PASS histórico de 03/11; baseline antiga |
| [#76 Candidate Checks 42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) | SUCCESS, 110/110 checks autenticados | CI isolado, incluindo navegador Chromium/WebRTC e rate limit |
| [#82 Validate 43030938201](https://github.com/Reekyi/UpStatus/actions/runs/43030938201) | FAILURE no HEAD exato | `production updateURL mismatch` em `scripts/validate.mjs:26` |
| [#131 Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | SUCCESS, 136/136 checks autenticados | Teste concorrente de rate limit de convite passou no laboratório |
| [#135 Validate 42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) | FAILURE | Falha herdada `production updateURL mismatch`; não é falha de execução SQL |
| [#139 parity 42851899626](https://github.com/Reekyi/UpStatus/actions/runs/42851899626) | SUCCESS em PR | Contrato de paridade de signaling |
| [#128 review provenance 42994078899](https://github.com/Reekyi/UpStatus/actions/runs/42994078899) | SUCCESS em PR | Guard offline; não é aprovação real de release |
| [#129 legacy deploy guard 42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545) | SUCCESS em PR | Guard offline; nenhum deploy |
| [#141 Validate 42936993580](https://github.com/Reekyi/UpStatus/actions/runs/42936993580) | SUCCESS em PR | Corrige o contrato de updater no candidato |
| [#142 Validate 42977043722](https://github.com/Reekyi/UpStatus/actions/runs/42977043722) | SUCCESS por push | Não há execução pull_request no HEAD atual |
| [#143 offline_guard 42984657754](https://github.com/Reekyi/UpStatus/actions/runs/42984657754) | SUCCESS; deploy SKIPPED | Guard no HEAD exato |
| [#143 Validate 42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622) | SUCCESS em PR | Validação no HEAD exato |

### Achados nas PRs

- **#74:** Validate e Smoke passam, mas o smoke ainda pula o teste de rate limit de convite. #131 adiciona essa cobertura ao HEAD Normal.
- **#76:** 110/110 checks; browser smoke de voz WebRTC, áudio remoto, malha de três participantes, leave/rejoin, rate limit de signaling e rate limit de convite no laboratório. Não é teste físico.
- **#131:** o log confirma 136/136 checks, 24 chamadas concorrentes de emissão de convite (5 aceitas e 19 rejeitadas), isolamento entre administradores e limpeza de fixtures. A migration candidata usa SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role. A tabela/RPC ainda não existem em produção.
- **#141:** separa URL de distribuição e endpoint API; `release.json` mantém versão 3.4.7 e `scriptUrl` aponta para `/upstatus/upstatus.user.js`. O Validate passa. A PR é Draft.
- **#142:** gera o runtime API beta10 a partir do template revisado. O template candidato persiste `file_name`, usa o helper `admin(name)` na limpeza do chat e mantém signed upload. Não contém a chamada AUTH-03 de rate limit. O workflow tem `pull_request.branches` apontando para a própria branch candidata, enquanto a base da PR é `fix/master-staged-chat-attachments-20261111`; não há check PR no HEAD atual, somente o push Validate. O `supabase/config.toml` candidato declara `chat-images=25MB`, mas o handler limita a 20 MiB e o bucket de produção é 20 MiB; alinhar a configuração antes do cutover.
- **#143:** no HEAD exato, offline_guard e Validate passam, deploy fica SKIPPED. O manifesto continua em 3.4.7, igual à versão Normal servida; o helper exige uma versão estável maior que a versão atual 3.4.7. A PR permanece Draft.
- **#135:** os quatro SQLs recuperados estão em `docs/migration-recovery/`, fora de `supabase/migrations/`. A comparação read-only com o ledger está detalhada abaixo.
- **#140:** não foi encontrado workflow run no HEAD atual; a regressão de paridade AUTH-03 ainda não tem evidência de CI no HEAD consultado.
- **#128/#129:** os guards offline passam, mas as PRs continuam Draft e não substituem revisão humana nem publicação segura.
- Não foram encontradas reviews humanas registradas nas PRs prioritárias #74, #75, #76, #82, #131, #135, #139, #128, #129, #140, #141, #142 e #143.

### Workflow Team Lite

O workflow ainda presente em `team-lite-official` usa Supabase CLI `latest`, lê secrets de produção e executa `supabase functions deploy upstatus`, embora o alvo Team Lite seja `upstatus-team-lite`. Não verifica adequadamente o alvo/ref antes do deploy. **Não despachar.** A #129 propõe substituir esse caminho por guard manual fail-closed e passou no teste offline, mas ainda não foi incorporada.

O workflow Normal de master também é o legado manual, fixa a versão 3.4.7 e publica somente `upstatus`. O dispatcher #143 ainda não está em master.

A API de rulesets retornou lista vazia. A consulta de branch protection retornou HTTP 403 `Resource not accessible by integration`; portanto, o estado efetivo de proteção de branches não pôde ser confirmado e não deve ser declarado como desativado.

## Runtimes implantados e compatibilidade

Produção lista 38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Isso não prova ausência de autenticação: os handlers principais Normal e Team Lite inspecionados usam token customizado, hash de sessão, expiração e cache de validação de 30 segundos. Não foi feita revisão individual das 38 funções.

| Runtime | Versão Edge | Userscript embutido | API usada pelo cliente | Update URL |
|---|---:|---:|---|---|
| `upstatus` Normal | v480 | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` | `/upstatus/upstatus.user.js` |
| `upstatus-team-lite` | v15 | 3.4.30 | `upstatus-team-lite` | raw GitHub `team-lite-official` |
| beta10 legado | v6 | 3.1.1-beta8 | beta8 no bundle legado | endpoint beta8 |

Os userscripts efetivamente embutidos em Normal e Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`. Ambos usam publishable key, não configuram `private:true` e não chamam `realtime.setAuth()`. O bundle servido pelo endpoint legado chamado beta10 v6 contém um userscript beta8; os atuais update URLs Normal/Team Lite não apontam para esse endpoint como distribuição, mas a rota legada é inconsistente e pode confundir consumidores antigos.

Os runtimes implantados Normal e Team Lite:
- Não contêm `file_name` no código servidor.
- Não contêm `consume_upstatus_setup_invite_rate_limit`.
- Ainda usam `POST /api/setup -> login(req,true)`, sem consumo de convite; quando o papel está vazio, há fallback nominal para nomes allowlisted.
- Ainda restringem `/api/chat/clear` por `name === "Ricardo"`, em vez de usar o papel administrativo.
- Possuem rotas de signed upload para chat/avatar; isso não resolve a persistência de `file_name`.

O template candidato #142 corrige a persistência de `file_name` e a autorização de limpeza por papel, mas ainda não inclui AUTH-03. A linha #131 precisa ser reconciliada com #142; não basta transportar só a migration, pois o fluxo de convite também precisa existir no template/API.

## Supabase: Realtime, RLS, grants e Storage

Consultas SQL somente SELECT em produção:

- `realtime.messages`: **77 registros**, todos `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os clientes Normal/Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`; o tópico não coincide com o dos triggers.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies, sete partições diretas; anon e authenticated têm SELECT/INSERT/UPDATE.
- Três triggers de broadcast continuam ativos: mensagens, estado remoto e usuários. O trigger de mensagens envia `to_jsonb(OLD/NEW)`; os demais enviam metadados de comando/resultado/status.
- As três funções são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE para anon/authenticated. O Advisor registra seis WARN (três por papel); não foi demonstrada invocação RPC direta dessas funções trigger.
- **10 tabelas públicas** com RLS e sem policies.
- **9 tabelas** concedem privilégios diretos a anon/authenticated: **126 linhas de privilégios**, sete por combinação tabela/papel (`DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`). Correção importante: o snapshot atual é 126, não 144; MAINTAIN aparece nos Default ACL, não nesses grants diretos.
- **120 entradas Default ACL** para anon/authenticated em objetos/esquemas auditados.
- Storage: `chat-images` e `profile-images` públicos, 20 MiB cada; zero policies próprias em `storage.objects`.

O Security Advisor retornou seis WARN e dez INFO. RLS habilitado sem policy não concede acesso às linhas por si só, mas não protege operações de tabela como TRUNCATE.

## Laboratório, AUTH-03 e Edge Functions

O projeto isolado `bfpjtfqlnypisxljoxkb` está ACTIVE_HEALTHY, com 39 migrations e duas Edge Functions. Consulta agregada confirmou zero registros em users, sessions, messages, chat_reads, rooms, room_members, room_bindings, signal_events, call_attempts, voice_attempts, signal_rate_limits, invite_rate_limits, realtime.messages, storage.objects e storage.buckets.

No laboratório:
- 18 tabelas públicas com RLS e sem policies; zero grants diretos para clientes nas tabelas auditadas.
- 96 entradas Default ACL; não significa que o laboratório esteja completamente endurecido para objetos futuros.
- `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` são SECURITY INVOKER, `search_path=""`, sem EXECUTE para anon/authenticated e EXECUTE para service_role.
- `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 são as duas funções de teste.

Produção não tem a tabela/RPC de rate limit de convite, tabela/RPC de consumo de convite nem tabelas de rate limit/sinalização auditadas. Não existe função `upstatus-signal` em produção. A função de laboratório v32 não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409; o contrato HTTP real não foi executado.

## Migrations e proveniência

Produção tem sete versões no ledger; a branch gerenciada Supabase `main` permanece `MIGRATIONS_FAILED`, enquanto o preview está `ACTIVE_HEALTHY`.

A PR #135 recuperou quatro statements do campo `statements` em `supabase_migrations.schema_migrations`. A QA comparou os arquivos com o ledger por versão e confirmou igualdade exata após trim para os quatro:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Cada registro tem um statement, rollback NULL, created_by presente e idempotency_key ausente. Isso valida o texto do statement executado, mas **não recupera os arquivos originais byte-a-byte**, comentários, formatação ou blob/commit Git original. Os arquivos estão em `docs/migration-recovery/`, fora da pasta de migrations, e não devem ser aplicados.

**Lacuna nova no dispatcher #143:** `assertRequiredNormalProductionMigrations` compara somente versão/nome do histórico remoto com uma allowlist. O workflow chama o preflight remoto e não verifica a presença dos arquivos locais em `supabase/migrations`, nem o manifest/hash de proveniência. Assim, o preflight pode aceitar o ledger remoto sem comprovar a fonte SQL local. Hoje o deploy também seria bloqueado porque a branch Supabase `main` está `MIGRATIONS_FAILED` e porque a versão continua 3.4.7; a lacuna de proveniência, porém, precisa ser corrigida antes de liberar o dispatcher.

## Issues e gates

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, oito critérios físicos continuam desmarcados. Nenhum teste manual de queda/retorno sem F5 foi realizado nesta rodada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): corpo com 16 de 35 checkboxes marcados; comentário QA dedicado atualizado, sem duplicar e sem alterar o comentário da Engenharia.

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | blocked | 77 broadcasts públicos, tópico divergente, sem private/auth |
| TEST-ISOLATION | done | projeto separado, zero fixtures, RPCs restritas a service_role e CI isolado |
| MIGRATION-PROVENANCE | in_progress | statements do ledger conferem; originais e verificação local do dispatcher faltam |
| AUTH-03 | in_progress | candidato #131 passa no laboratório; estruturas/fluxo não estão em produção |
| ACL-STORAGE | blocked | grants, Default ACL e buckets públicos permanecem |
| RECONNECT | pending | nenhum teste físico sem F5 confirmado por Ricardo |
| HUMAN-REVIEW | pending | PRs prioritárias sem review humana e sem autorização explícita de release |

## Veredito

**NOT READY.** Prioridades:

1. Tornar Realtime privado/autorizado, alinhar tópicos e remover payloads sensíveis dos broadcasts públicos.
2. Corrigir o preflight #143 para exigir proveniência local dos SQLs e integrar a revisão de #135/#127.
3. Integrar #131 ao template/API Normal atual (#142) e completar AUTH-03.
4. Endurecer grants, Default ACL e Storage com plano revisado por owner.
5. Alinhar limites de Storage/config/handler.
6. Corrigir workflow oficial Team Lite e manter o guard fail-closed até a substituição.
7. Escolher versão Normal estável superior a 3.4.7, reconciliar #141/#142/#143 e validar checks no SHA exato.
8. Executar testes físicos Normal/Team Lite e obter aprovação humana.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve deploy, merge, migration, release, publicação de userscript, alteração de secrets/flags ou operação destrutiva.
