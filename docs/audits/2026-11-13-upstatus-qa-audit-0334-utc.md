# UpStatus — Auditoria independente de qualidade
**Data:** 2026-11-13 03:34 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`

## 1. Escopo e método

Foram revalidados os heads reais, `docs/RELEASE_READINESS.md`, PRs #74, #75, #76, #82, #157 e #158, issues #78 e #79, workflows, artefatos de userscript servidos pelas Edge Functions, fontes implantadas, catálogos PostgreSQL, migrations e Security/Performance Advisors.

Classificação usada:
- **CI PASS/FAIL:** somente resultado de workflow no commit identificado.
- **INSPEÇÃO DE CÓDIGO:** leitura estática de fonte, artefato ou configuração; não equivale a execução.
- **SELECT-ONLY:** consulta de catálogo/dados sem escrita.
- **MANUAL PENDENTE:** requer navegador/dispositivo/instalação real.
- **BLOQUEADO:** dependência técnica ou operacional ainda aberta.

Não havia ambiente controlado de navegador/Tampermonkey e Storage para testes físicos ou upload real. Não foram executados requests de exploração, PUTs reais, chamadas HTTP de voz, testes manuais, reruns ou workflows de publicação.

## 2. Heads e integridade da branch QA

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA antes deste relatório | `b92e5d689c96b410e9e7b40267411203c350591a` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

Comparação QA ↔ master: 268 commits à frente, 1 atrás, 127 arquivos divergentes e nenhum arquivo fora de `docs/`. O commit master-only é documental. Não houve rebase nem incorporação automática.

O arquivo `docs/RELEASE_READINESS.md` foi lido integralmente: 8.410 linhas, 1.045.105 caracteres. O último checkpoint interno ainda é 2026-11-08 18:30 UTC. O arquivo principal não foi sobrescrito.

## 3. PRs e workflows

| PR | HEAD | Base | Estado | Evidência |
|---|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | master | Open/Draft, sem review | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) PASS; Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | Open/Draft, sem review | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | team-lite-official | Open/Draft, sem review | [43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) PASS |
| #82 QA | `b92e5d689c96b410e9e7b40267411203c350591a` | master | Open/Draft, sem review | [43354285520](https://github.com/Reekyi/UpStatus/actions/runs/43354285520) FAIL |
| #157 avatar | `b7baf3a98e22b8a9555d667878e49e121d7bcf8c` | branch da #156 | Open/Draft, sem review | [43333821827](https://github.com/Reekyi/UpStatus/actions/runs/43333821827) e [43333849082](https://github.com/Reekyi/UpStatus/actions/runs/43333849082) PASS, escopo limitado ao contrato de avatar |
| #158 updater/TEST | `d04b770f74c4bb367f5404d9c022485ad7add5cb` | master | Open/Draft, sem review | [43356754693](https://github.com/Reekyi/UpStatus/actions/runs/43356754693) FAIL |

### #74 e #76

O Smoke Normal #74 concluiu 136/136 verificações autenticadas e passou pelos testes de WebRTC de chamada, voz, tela, mesh de três participantes e rate limit distribuído. Duas etapas de setup-invite ficaram explicitamente **SKIPPED**: syntax-check do harness de rate limit de emissão e verificação distribuída de emissão de convite. Isso não invalida o PASS do workflow, mas deixa uma lacuna de cobertura Normal.

O Candidate Checks Team Lite #76 passou pelo Playwright full-IIFE, recuperação de voz/tela, rate limit de sinalização, recibos atômicos, consumo e rate limit de convites, guard de migrações e validação dos gatilhos de release. É CI automatizado; não é aceitação física.

A #75 é baseline histórico e não substitui a candidata #76.

### #82

O Validate no HEAD QA falhou em `scripts/validate.mjs:26`:

`VALIDATION FAILED: production updateURL mismatch`

A QA continua um commit atrás de master, mas a diferença é documental. Não houve rerun nem remoção de assertion.

### #158 — updater e identidade TEST

A candidata alinha o `@updateURL`/`@downloadURL` Normal a `release.json.scriptUrl`, exige correspondência exata e remove o feed de release Normal do TEST. Também separa, para builds futuros, o namespace TEST (`upseller-test`) e o prefixo de armazenamento local (`upstatus_test_`).

O log confirma que o build e as assertions de updater/feed passam. O Validate completo falha depois em:

`CHAT REGRESSION FAILED: admin UI uses stored role`

A asserção está em `scripts/chat-regression.test.mjs:104`. O template e os bundles instalados ainda usam `member==='Ricardo'` como condição adicional para exibir a ação de excluir mensagem; o botão de limpar chat também é condicionado pelo nome. Não se deve remover ou enfraquecer a assertion para fabricar PASS.

**Nuance de autorização:** o endpoint de exclusão individual consulta `admin(name)` e usa a role persistida para excluir mensagens de terceiros. Porém o endpoint `POST /api/chat/clear` no template e nos runtimes Normal/Team Lite verifica apenas `name !== "Ricardo"`; não chama `admin(name)`. Portanto, a observação da Engenharia sobre role persistida é válida para delete individual, mas não para limpeza total. A regra de limpeza é atualmente uma capacidade baseada em nome, não em role/ID estável. Não foi reproduzida exploração; a política precisa ser explicitada e coberta por teste próprio.

O `release.json` atual permanece em 3.4.7, igual à versão Normal instalada. A #158 não escolhe uma nova versão de release.

### #157 — avatar

A #157 usa `users.id` para derivar o prefixo de avatar e falha fechado se a busca por nome retornar zero ou múltiplos usuários. O teste avalia o helper e o contrato estático, não faz upload real.

A sessão continua persistindo apenas `user_name`; `userFromToken()` continua devolvendo nome, e `avatarUserId(name)` resolve o ID novamente por nome. `upstatus_profiles` continua chaveada por `user_name`. Assim, a identidade ainda não é imutável de ponta a ponta: rename/reuso de nome e sessões antigas continuam sem vínculo persistido a `users.id`. A PR é empilhada sobre a branch da #156, Draft e sem review.

## 4. Identidade TEST e runtimes implantados

A Management API confirma 38 Edge Functions ACTIVE no projeto de produção; todas reportam `verify_jwt=false`, portanto a autenticação depende dos handlers próprios. Doze funções têm prefixo `upstatus-test`.

| Função | Versão | Estado |
|---|---:|---|
| `upstatus` | v480 | ACTIVE |
| `upstatus-test` | v281 | ACTIVE |
| `upstatus-screen-share-3-1-1-beta10` | v6 | ACTIVE |
| `upstatus-team-lite` | v15 | ACTIVE |
| Laboratório `upstatus-signal-test` | v32 | ACTIVE |
| Laboratório `upstatus-signal-e2e-once` | v3 | ACTIVE |

O userscript TEST v281 foi decodificado diretamente da Edge Function. Ele ainda contém:
- `@name UpStatus - Sale Smartly`;
- `@namespace upseller`;
- versão 3.3.28;
- `@updateURL` e `@downloadURL` apontando para o projeto de produção em `/upstatus-test/upstatus.user.js`;
- chave GM `upstatus_screen_share_beta8_`, igual ao Normal;
- `CLOUD_SERVER` no mesmo projeto Supabase de produção;
- tópico Realtime beta10 compartilhado com Normal/Team Lite.

A candidata #158 separa namespace/prefixo de futuros builds, mas o build ainda usa o project ref de produção e o slug `upstatus-test`. O runtime v281 permanece instalado e não foi substituído. Não existe terceiro projeto full-product TEST; o segundo projeto é laboratório de sinalização/autenticação, sem o produto completo.

**Conclusão:** TEST-ISOLATION segue bloqueado. A correção de build não isola o runtime implantado nem cria um backend/Storage/Reatime independentes.

## 5. Realtime, SECURITY DEFINER e PostgreSQL

### Produção

Snapshot SELECT-only de `realtime.messages`: 125 mensagens, todas `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 67 `user_status`;
- 46 `db_change`;
- 6 `remote_command`;
- 6 `remote_result`.

Os clientes instalados usam o tópico beta10 `upstatus-screen-share-live-3-1-1-beta10`, que não coincide com o tópico dos triggers. Normal, Team Lite e TEST não usam `private:true` nem `realtime.setAuth()`. Normal e TEST encaminham `remote_command` ao executor; Team Lite faz checagem da própria sessão, mas isso não autentica o emissor do broadcast.

`realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies e SELECT/INSERT/UPDATE para anon e authenticated.

Três funções de broadcast são SECURITY DEFINER, owner postgres, `search_path=public`, e têm ACL para PUBLIC, anon e authenticated:
- `upstatus_broadcast_messages`: transmite `to_jsonb(OLD/NEW)` completo;
- `upstatus_broadcast_remote_state`: transmite campos de comando/resultado;
- `upstatus_broadcast_users`: transmite nome/status/reason/sync.

O Security Advisor conta 6 WARN (3 anon + 3 authenticated) e 10 INFO em produção. As funções são trigger-returning; não foi demonstrada chamada RPC direta. O risco concreto confirmado é o broadcast público dos triggers, payloads e configuração de privilégio/search_path.

### Laboratório

Os três triggers estão endurecidos com `search_path=""` e EXECUTE restrito a postgres/service_role. Não há mensagens Realtime no laboratório, e os triggers ainda usam `private=false`. `realtime.messages` também tem RLS, zero policies, FORCE RLS false e os seis grants SELECT/INSERT/UPDATE para anon/authenticated.

Security Advisor do laboratório: 0 WARN e 18 INFO. Performance Advisor: 5 INFO de índices não utilizados.

**RT-01 segue bloqueado:** não há transporte privado/autorizado comprovado nos bundles instalados nem entrega real validada no laboratório.

## 6. RLS, grants, Default ACL e Storage

### Produção

- 10 tabelas public com RLS habilitado e zero policies.
- 9 tabelas public com 72 entradas de privilégio para anon e 72 para authenticated (144 no total).
- Os grants incluem TRUNCATE: 18 entradas no total (9 por role). RLS não protege TRUNCATE.
- 120 entradas de Default ACL para anon/authenticated distribuídas por schemas: public 48, graphql 24, graphql_public 24 e storage 24.
- Dois buckets públicos: `chat-images` (168 objetos) e `profile-images` (20 objetos), limite de 20 MiB cada.
- Zero policies próprias em `storage.objects`.

### Laboratório

- 18 tabelas public com RLS habilitado e zero policies.
- Zero grants diretos de anon/authenticated nas tabelas public consultadas.
- 96 entradas de Default ACL para anon/authenticated em public/GraphQL/Storage; os defaults postgres em public estão restritos, mas os de supabase_admin/GraphQL e storage ainda precisam de revisão.
- Sem buckets e sem objetos Storage.

### Upload

As rotas assinadas de chat/avatar existem atualmente nos runtimes implantados Normal v480, Team Lite v15 e TEST v281. A inspeção estática encontrou:
- limite declarado de 20 MiB tanto para avatar quanto para chat;
- MIME e tamanho informados pelo cliente, sem inspeção dos bytes efetivos;
- `createSignedUploadUrl(path,{upsert:true})`;
- caminho aleatório, sem prefixo de ownership;
- `profileRoute` aceita URL canônica de qualquer objeto no bucket público `profile-images`, sem comprovar que pertence ao usuário autenticado;
- sem rate limit específico de emissão de tickets.

A #157 reduz avatar a 2 MiB e adiciona prefixo baseado em `users.id`, mas ainda resolve o ID pelo nome da sessão e não grava `user_id` na sessão/perfil. A correção ainda não está implantada.

## 7. AUTH-03, migrations e Edge Functions

Produção tem 7 migrations e não possui colunas `setup_token_*`, tabelas de rate limit de convite ou RPC de consumo de convite.

O laboratório tem 39 migrations, quatro colunas `setup_token_*`, tabelas `upstatus_setup_invite_rate_limits` e `upstatus_signal_rate_limits`, e as RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` como SECURITY INVOKER.

A branch gerenciada Supabase `main` permanece `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

Os quatro caminhos canônicos seguintes retornam 404 em master:
- `20261023154754_create_upstatus_visual_config.sql`;
- `20261026195855_add_chat_message_file_name.sql`;
- `20261027154329_allow_chat_document_mime_types.sql`;
- `20261027155438_set_upstatus_upload_limits_20mb.sql`.

A #135 está aberta/Draft e arquiva statements recuperados de `supabase_migrations.schema_migrations.statements` em documentação. A própria PR declara que isso não recupera os arquivos originais byte a byte e não os coloca em `supabase/migrations/`. MIGRATION-PROVENANCE permanece bloqueado.

A Edge Function de laboratório v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`; o fallback previsto é 500. Isso é inspeção de código, não request HTTP reproduzido.

## 8. Workflows de publicação

Na branch oficial `team-lite-official`:
- `deploy-production.yml` é manual, usa secrets de produção, instala CLI `latest` e executa `supabase functions deploy upstatus`; o slug correto é `upstatus-team-lite`.
- `deploy-test.yml` é manual e também dispara em push para `develop`; usa o mesmo `SUPABASE_PROJECT_ID`, CLI `latest` e publica `upstatus-test` dentro do projeto de produção.
- O workflow Normal em master também usa CLI `latest` e secret compartilhado de project ref; a validação de versão atual exige 3.4.7.

As correções propostas em #128/#129 ainda não foram integradas. Nenhum workflow de deploy foi executado.

## 9. Issues e aceitação física

- Issue #78 permanece OPEN, 0/8 critérios marcados. Os oito itens de reconexão sem F5, reentrada, chamadas, ausência de duplicação, participantes online, CI e teste manual seguem sem aprovação física.
- Issue #79 permanece OPEN, 16/35 itens marcados e 19 pendentes.
- Nenhum teste físico em Tampermonkey/navegador foi realizado nesta execução. CI/Playwright offline não substitui perda real de internet, microfone/display permission e interoperabilidade instalada.

## 10. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | **BLOCKED** | Clientes sem canal privado/autenticação do emissor; triggers publicam private=false |
| TEST-ISOLATION | **BLOCKED** | TEST v281 e workflow continuam no projeto de produção; não há full-product TEST independente |
| MIGRATION-PROVENANCE | **BLOCKED** | Quatro SQLs originais ausentes; #135 recupera statements, não arquivos originais |
| AUTH-03 | **BLOCKED** | Estruturas de convite/rate limit existem apenas no laboratório |
| ACL-STORAGE | **BLOCKED** | Grants/Default ACL amplos, buckets públicos e ausência de policies |
| RECONNECT | **PENDING** | 0/8 aceitação física; requer teste humano sem F5 |
| HUMAN-REVIEW | **PENDING** | PRs candidatas Draft e sem aprovação humana/SHA autorizado |

## 11. Próximas prioridades

1. Corrigir a política de autorização de `/api/chat/clear`: definir owner imutável ou role persistida e acrescentar teste; não enfraquecer a assertion de #158.
2. Provisionar ambiente full-product TEST independente e planejar retirada do runtime legado de produção por procedimento aprovado.
3. Implementar Realtime privado/server-mediated com token, membership, destinatário, replay/expiry e rate limit validados no servidor; remover listeners públicos sensíveis.
4. Persistir `user_id` na sessão e perfil; revisar rename/reuso de nomes e ownership de avatar.
5. Validar bytes reais, MIME, tamanho efetivo, rate limit/quota e privacidade de Storage nos dois produtos.
6. Corrigir workflow Team Lite para slug correto, projeto/SHA explícitos, CLI pinada e aprovação humana.
7. Aplicar AUTH-03 somente após revisão e autorização explícita; resolver grants/Default ACL/RLS.
8. Recuperar proveniência dos SQLs e diagnosticar `MIGRATIONS_FAILED`.
9. Corrigir e validar HTTP 409 da voz por request real no laboratório.
10. Executar os oito testes físicos e obter aprovação humana do SHA final.

## 12. Limites e alterações realizadas

Todas as consultas SQL foram SELECT-only. GitHub e Supabase foram usados para leitura, inspeção de fontes, logs e catálogos. Não houve exploração, upload real, teste HTTP de voz, teste manual, rerun, merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva.

A única escrita de repositório desta rodada é este novo relatório na branch QA. O `docs/RELEASE_READINESS.md` original foi preservado. A Issue #79 recebeu atualização no comentário QA existente; o comentário da Engenharia foi preservado.
