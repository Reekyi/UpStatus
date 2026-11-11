# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-11 21:38 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## 1. Método e limites

- GitHub e Supabase foram usados somente para leitura: metadados, diffs, workflows, fontes implantadas e consultas SQL `SELECT`/catálogo.
- Não houve teste manual em navegador físico, execução local de scripts, publicação de broadcast, upload, alteração de fixtures ou mutação SQL.
- CI existente foi inspecionado nos seus HEADs; nenhum workflow foi repetido manualmente.
- A única escrita desta execução é este relatório novo na branch QA dedicada. `docs/RELEASE_READINESS.md` não foi alterado.
- O teste de navegador que aparece nos logs de CI é automação em navegador, não aceitação manual de Ricardo.

## 2. Heads e integridade documental

| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `9d5e7293e0af1fabbe274b26e62ae2bfbda09458` |
| outra branch QA `qa/release-readiness-2026-11-04` | `8f8b5fb3f01750907fb3e78f425ace4ffb45afab` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| #76 | `4edfbf25476c7c751741b2e14c2c88fdc554f618` |
| #82 | `9d5e7293e0af1fabbe274b26e62ae2bfbda09458` |
| #131 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| #141 | `4dba48196a1a605557ac7a853f6ae4adff0ea555` |
| #142 | `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4` |
| #143 | `c4a04fa755b877bc76b1372170a26e7b974264e6` |
| #145 | `bbfda9dfe53f25535c697586fce63917ee674e1f` |

A comparação QA vs master retornou **230 commits à frente e 1 atrás**, com diferenças documentais no conjunto comparado. Não fiz rebase. A branch QA permaneceu em `9d5e729` antes da criação deste arquivo. A outra branch QA não foi tocada.

A API de branches retornou `protected=false` para `master`, QA dedicada e `team-lite-official`. A conexão não expôs leitura administrativa completa dos rulesets; portanto, não afirmo detalhes de regras além do indicador de proteção retornado.

`docs/RELEASE_READINESS.md` foi obtido integralmente: **8.410 linhas**, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint dentro do documento é de **2026-11-08 18:30 UTC**. O documento foi preservado.

## 3. PRs e CI

| PR | Estado | Evidência no HEAD observado |
|---|---|---|
| #74 Normal | Open / Draft | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336): SUCCESS |
| #75 Team Lite baseline | Open / Draft | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico; não substitui #76 |
| #76 Team Lite | Open / Draft | [42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169): SUCCESS |
| #82 QA | Open / Draft | HEAD atual tem Validate [43097347099](https://github.com/Reekyi/UpStatus/actions/runs/43097347099) **QUEUED**, sem job iniciado |
| #131 AUTH-03 Normal | Open / Draft | [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798): SUCCESS |
| #141 updater/chat | Open / Draft | [43085700956](https://github.com/Reekyi/UpStatus/actions/runs/43085700956): SUCCESS |
| #142 API Normal | Open / Draft | [43085494740](https://github.com/Reekyi/UpStatus/actions/runs/43085494740): SUCCESS |
| #143 dispatcher | Open / Draft | Validate PR [43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347): SUCCESS |
| #145 remote-command hint | Open / Draft | [43100913884](https://github.com/Reekyi/UpStatus/actions/runs/43100913884): SUCCESS em `pull_request` |
| #140 parity AUTH-03 | Open / Draft | [42928939793](https://github.com/Reekyi/UpStatus/actions/runs/42928939793): SUCCESS em `push`, não PR |

### Detalhes de CI

- #74 e #131: os logs mostram 136/136 verificações autenticadas; automação de navegador negociou áudio em chamada, voz em sala e vídeo de tela, além de malha com três participantes. Também passaram rate limit e limpeza das fixtures isoladas.
- #76: o log mostra rate limit distribuído (90 aceitas, 1 rejeitada com HTTP 429 e Retry-After), testes concorrentes de signaling e convite, isolamento de buckets, enrollment, updater, recuperação/saída de voz e cenários offline/online.
- #145: o log confirma build PROD/TEST 3.4.7, chat regression PASS e contrato estático: `remote_command/remote_result` são hints e comandos/resultados são consultados por rotas autenticadas. Não é teste manual nem prova de transporte de voz/tela.
- #140: o Validate de paridade é offline e push-only. O próprio PR documenta que não executa SQL no banco e não comprova estado de produção.
- #82: a execução atual no HEAD `9d5e729` está queued desde 20:39:30 UTC; a consulta de jobs retornou lista vazia. A falha anterior [43079031009](https://github.com/Reekyi/UpStatus/actions/runs/43079031009) pertence ao HEAD antigo `cb89a30`, não ao HEAD atual. Não atribuir essa falha ao commit atual enquanto o novo run não terminar.
- Reviews: as listas de reviews consultadas para #74, #75, #76, #82 e #145 estavam vazias. As PRs permanecem Draft e não foram aprovadas para release.

## 4. Comandos remotos: avanço real, mas não integrado ao release

### Candidatas

- #74 Normal trata `remote_command` como wake-up e consulta `/api/remote-status`; `remote_result` não resolve resultado a partir do payload.
- #76 Team Lite faz o mesmo, com checagem de sessão/generation antes de agendar o polling autenticado.
- #145 aplica esse padrão novamente na linha Normal #142: handler de `remote_command` ignora o payload e chama `pollRemoteStatus()`; `remote_result` ignora o payload e o resultado é obtido por `/api/remote-status/result?id=...`. O teste `scripts/test-remote-command-broadcast.mjs` é um contrato estático integrado ao Validate.
- A descrição da #145 diz que a paridade Team Lite ainda precisa de follow-up. A inspeção do código atual da #76 mostra que a candidata Team Lite já possui o comportamento hint-only para esses dois eventos. Essa parte da descrição da #145 está desatualizada.

### Produção e stack de publicação

Os bundles efetivamente implantados ainda diferem das candidatas:

- Normal `upstatus` v480 / userscript 3.4.7: o listener lê `payload.command` e executa `executeRemoteCommand(c)`.
- Team Lite `upstatus-team-lite` v15 / userscript 3.4.30: verifica a sessão local, mas ainda lê e executa o comando recebido no payload público. A sessão do destinatário não autentica o emissor do broadcast.
- O HEAD #143 também ainda contém o handler antigo que executa `payload.command`.
- #143 e #145 estão divergentes: comparação retornou #145 **6 commits à frente e 15 atrás** de #143. O dispatcher #143 não contém a correção #145. O Validate verde da #143 não cobre a mitigação de comandos remotos.

**Bloqueio:** integrar e revisar #145 no stack de release; manter paridade com #76; não publicar o HEAD #143 como está.

## 5. Voz, tela e Realtime

### Sinalização autenticada ainda não é o padrão

Na candidata Team Lite #76:

- `signaling_transport_enabled` inicia em `false`.
- O endpoint de transporte autenticado começa vazio.
- Com a flag desligada, `call_signal`, voice-room e screen-share continuam recebendo payloads do Realtime público.
- A automação pode testar o caminho autenticado quando habilita/configura o transporte; isso não prova que o default de release é seguro.

Na candidata Normal #145, os listeners de `call_signal`, voice-room e screen-share continuam passando payloads recebidos diretamente aos handlers. #145 corrige apenas `remote_command` e `remote_result`.

### Tópicos incompatíveis

- Triggers SQL implantados publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Builds de produção Normal v480 e Team Lite v15 assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Build Team Lite #76 define `PROD_TOPIC` como o tópico legado dos triggers.
- Build Normal #142/#145 define `PROD_TOPIC` como o tópico beta10, diferente do tópico SQL.

A divergência precisa ser resolvida como uma mudança coordenada de produtor e consumidores, não apenas alterando um lado.

### Snapshot SQL de produção

A consulta em `realtime.messages` retornou **109 registros**, todos `private=false`, no tópico legado:

| Evento | Registros |
|---|---:|
| user_status | 57 |
| db_change | 40 |
| remote_command | 6 |
| remote_result | 6 |

`realtime.messages` está com RLS habilitado, FORCE RLS desabilitado, zero policies e privilégios SELECT/INSERT/UPDATE para anon e authenticated.

As três funções `public.upstatus_broadcast_*` continuam SECURITY DEFINER, com `search_path=public` e `realtime.send(..., false)`. A função de mensagens transmite OLD/NEW; a de estado remoto emite metadados de comando/resultado; a de usuários emite status. O Advisor retorna três WARN para anon e três para authenticated, relacionados a essas funções. Como retornam `trigger`, não afirmei que sejam RPC PostgreSQL comum invocável; os grants continuam desnecessários e os broadcasts continuam públicos.

**RT-01 bloqueado:** #145 não altera triggers SQL, privacidade dos canais ou sinalização de voz/tela.

## 6. AUTH-03

### Paridade de arquivos candidatos

A migration `20261109230000_setup_invite_rate_limit.sql` e seu teste têm blobs idênticos:

- Migration #131 e #76: `ab73b5cd8200147a449327d21798eef588834d50`.
- Teste #131 e #76: `bd12f37dc464c3b1ab322494914d0763fa733d49`.

#131 passou 136/136 verificações autenticadas. #76 passou os testes de concorrência, isolamento de buckets e limpeza do rate limit de convites.

### Lacuna de integração

- #131 implementa setup com token de 256 bits, consumo único e rate limit de emissão (5 por administrador / 900 segundos).
- A função `login()` em #131 não aplica rate limit às tentativas de login normal; o rate limit examinado é de emissão de convites.
- O template da API #142 não contém `setup_token`, `consume_upstatus_setup_invite` ou `consume_upstatus_setup_invite_rate_limit`. `POST /api/setup` continua chamando `login(req,true)` sem token; `GET /api/account?name=` revela `needsSetup`.
- Produção não possui tabela de rate limit, RPC de consumo ou colunas `setup_token_*`.

Consulta read-only em produção retornou:
- `upstatus_setup_invite_rate_limits`: ausente.
- `consume_upstatus_setup_invite`: ausente.
- `consume_upstatus_setup_invite_rate_limit`: ausente.
- Colunas `setup_token_*`: 0.

**AUTH-03 em andamento:** reconciliar #131 com #141/#142 e Team Lite, adicionar rate limit de login e planejar migration separada, com aprovação explícita, antes de qualquer aplicação.

## 7. PostgreSQL, ACL e Storage

### Produção

- 10 tabelas do schema public com RLS e zero policies.
- Nove dessas tabelas concedem a anon e authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE: 126 grants diretos no total. RLS não protege TRUNCATE.
- Snapshot de Default ACL: 24 linhas de ACL, 75 itens ACL, três owners e sete schemas. Há defaults amplos para anon/authenticated em objetos de postgres nos schemas public/storage e de supabase_admin em public/graphql/graphql_public.
- Corrigindo a contagem resumida anterior: a consulta atual encontrou 75 itens ACL, não 120.
- Storage: `chat-images` e `profile-images` são públicos, 20 MiB cada; 168 objetos no primeiro e 20 no segundo; zero policies em `storage.objects`.
- Mensagens: 296 registros (241 text, 22 system, 17 image, 7 audio, 5 document, 4 video). Os cinco registros do tipo document têm `file_name` nulo. Há 33 registros com `image_url`.

### Edge Functions e projetos

- Produção: 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso, isoladamente, não prova ausência de autenticação: os handlers principais usam sessão/token customizado. Não foi feita revisão individual de todas as 38 rotas.
- Runtime Normal `upstatus` v480; Team Lite `upstatus-team-lite` v15; API beta10 v6; `upstatus-test` v281 dentro do próprio projeto de produção.
- Não existe função server-mediated `upstatus-signal` em produção.
- Laboratório: duas funções (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3), 39 migrations e zero users/messages/sessions/signal events/call attempts/Realtime messages nas tabelas consultadas.
- Organização: somente dois projetos, produção e laboratório. Não existe terceiro projeto full-product TEST. O workflow TEST rejeita explicitamente produção e o laboratório de signaling.
- Branch Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

**TEST-ISOLATION bloqueado:** o laboratório é limpo e útil para contratos/fixtures, mas não substitui um ambiente full-product TEST.

## 8. Migrations e dispatcher #143

PR #135 arquiva quatro statements recuperados do ledger de produção, em `docs/migration-recovery/`. Os quatro arquivos originais continuam 404 em master:

1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

A recuperação do ledger não é recuperação byte a byte dos originais.

O preflight #143:
- Registra três migrations com Git blob verificado e quatro como `ledger-recovered-only`.
- Exige proveniência `git-blob-verified` para todos os arquivos e falha fechado enquanto os quatro originais não forem recuperados.
- Confere histórico remoto e arquivos no diretório exato do release.
- **Não inclui** `20261109230000_setup_invite_rate_limit` na lista requerida; se AUTH-03 for integrado ao runtime, o preflight também precisa exigir essa migration.

O workflow #143 é manual-only e exige SHA exato, PR merged, review autorizado, checks no SHA, reconhecimento dos gates e aceitação física vinculada ao SHA. É um controle útil, mas o branch #143 está divergente de #142 e não inclui #145. Nenhum deploy foi executado.

PR #140 adiciona comparação estática entre o bloco SQL compartilhado de produção/laboratório e rejeita SQL inesperado. O Validate push-only passou no HEAD exato, mas o guard não executa SQL no banco e não recupera os quatro originais.

Versões observadas: Normal `release.json` 3.4.7; Team Lite oficial 3.4.30; candidata #76 3.4.31; runtime Team Lite implantado ainda serve 3.4.30.

O workflow oficial Team Lite continua usando CLI `latest` e `supabase functions deploy upstatus`, em vez do slug `upstatus-team-lite`. Não despachar esse workflow.

## 9. Issues, aceitação manual e gates

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, **0/8** critérios físicos marcados. Nenhuma queda real de internet, retorno sem F5, reentrada, nova chamada ou interoperabilidade instalada foi testada manualmente.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16 itens marcados e 19 pendentes no corpo.

| Gate | Estado QA | Evidência |
|---|---|---|
| RT-01 | blocked | [#145](https://github.com/Reekyi/UpStatus/pull/145), [#76](https://github.com/Reekyi/UpStatus/pull/76), snapshot Realtime de produção |
| TEST-ISOLATION | blocked | [laboratório Supabase](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb) e produção |
| MIGRATION-PROVENANCE | blocked | [#135](https://github.com/Reekyi/UpStatus/pull/135), [#143](https://github.com/Reekyi/UpStatus/pull/143) |
| AUTH-03 | in_progress | [#131](https://github.com/Reekyi/UpStatus/pull/131), [#76](https://github.com/Reekyi/UpStatus/pull/76), [#142](https://github.com/Reekyi/UpStatus/pull/142) |
| ACL-STORAGE | blocked | [produção Supabase](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm) |
| RECONNECT | pending | [#78](https://github.com/Reekyi/UpStatus/issues/78) |
| HUMAN-REVIEW | pending | [#145](https://github.com/Reekyi/UpStatus/pull/145); sem review humana consultada |

## 10. Veredito e próximos passos

**NOT READY.** Ordem recomendada:

1. Integrar a correção de comandos remotos #145 no stack de release; manter a mesma proteção no Team Lite.
2. Remover o transporte público de call_signal, voz e tela; tornar server-mediated autenticado o padrão, com endpoint e membership reais.
3. Alinhar tópico Realtime dos clientes e triggers e reduzir payloads; tornar canais privados/autorizados.
4. Reconciliar AUTH-03 entre #131/#76/#142 e adicionar rate limit de tentativas de login.
5. Atualizar preflight #143 para exigir a migration AUTH-03 e recuperar a proveniência original dos quatro SQLs.
6. Corrigir grants, Default ACL e política de Storage.
7. Criar ambiente full-product TEST independente e corrigir o workflow Team Lite.
8. Corrigir Validate QA, executar aceitação física sem F5 e obter review/aprovação humana no SHA exato.

Nenhuma produção foi modificada. Todas as consultas SQL foram somente leitura. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, operação destrutiva ou teste manual.
