# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-12 15:06 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`

## Escopo e classificação

Foram revalidados os heads de `master`, QA e `team-lite-official`; PRs #74, #75, #76 e #82; PRs auxiliares relevantes #133, #143, #147, #149 e #151; Issues #78 e #79; workflows, commits e checks; fontes de Edge Functions implantadas; migrations e catálogos PostgreSQL dos projetos de produção e laboratório.

- **CI:** resultado de workflow associado ao SHA exato, com log inspecionado.
- **Inspeção de código/catálogo:** leitura estática de fonte, configuração ou catálogo SQL; não equivale a execução funcional.
- **Teste manual:** navegador instalado, dispositivo, microfone/tela reais ou aceite humano.
- **Pendente:** evidência ainda não produzida.
- **Bloqueado:** dependência ou defeito confirmado impede fechar o gate.

Nesta execução não foram iniciados testes, reruns ou chamadas HTTP de sinalização. Foram inspecionados logs de CI já concluídos e executadas somente consultas SQL SELECT.

## 1. Heads e governança

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `2cf26af3ecd73464d8d1a5cf17181b42c43f3b8d` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

A comparação exata retorna QA **252 commits à frente e 1 atrás** de master. O commit de master que falta na QA é `9d40461`, cujo pai é `a9288cc`.

A metadata das três branches informa `protected=false`. A API de rulesets retorna lista vazia. A leitura do endpoint clássico de branch protection retornou 403 para a integração; portanto, não foi possível inspecionar regras clássicas além do indicador `protected=false`.

As PRs principais examinadas continuam abertas, Draft e não mescladas. Não há reviews registradas nas PRs #74, #75, #76, #82, #133, #149 e #151.

A PR #74 aponta para `master`, mas seu base SHA registrado é `a9288cc`, um commit atrás do HEAD atual de master. Revalidar o candidato depois de sincronizar essa diferença.

## 2. PRs obrigatórias e CI

| PR | HEAD | Estado | Evidência atual |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Draft | Validate e Smoke PASS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft | Candidate Checks histórico PASS |
| #76 Team Lite signaling | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Draft | Candidate Checks PASS |
| #82 QA | `2cf26af3ecd73464d8d1a5cf17181b42c43f3b8d` | Draft | Validate FAIL |

### #74 Normal

- Validate: [run 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), PASS.
- Signaling Smoke: [run 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336), PASS.
- Log do Smoke: 136/136 verificações autenticadas; negociação WebRTC de chamada, voz e tela com faixas remotas; mesh de três participantes; rate limit com 90 aceitas e uma rejeitada em HTTP 429; setup enrollment, concorrência e limpeza de fixtures.
- O Smoke usou o projeto isolado e habilitou explicitamente mutações de fixtures. Isso é CI em laboratório, não teste de produção nem aceitação física.

O workflow candidato de #74 melhora o deploy Normal: checkout do SHA exato, exige `refs/heads/master`, valida project ref `dlfvkawaiqduhlazsszm` e fixa Supabase CLI 2.122.1. Entretanto, publica somente `upstatus`; não coordena a função auxiliar beta10. O workflow atualmente em master ainda usa CLI `latest` e não contém essas mesmas verificações.

### #75 Team Lite baseline

- Candidate Checks: [run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), PASS histórico.
- Log confirma versão candidata 3.4.31, sintaxe, isolamento dos portais Lucca/Ycaro e cenários do updater.
- É baseline; não deve ser contado como um segundo payload independente da linha ativa #76.

### #76 Team Lite

- Candidate Checks: [run 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080), PASS no HEAD atual.
- Log confirma 110/110 verificações autenticadas; WebRTC de chamada, voz e compartilhamento de tela; mesh de três membros; rate limit 90+1/429; concorrência de convites e recibos; recuperação de leave/logout; polling autenticado de comandos e cleanup.
- O transporte autenticado continua opt-in/desativado por padrão. O CI não comprova que o bundle instalado ou a configuração de produção já utiliza esse caminho.

### #82 QA

- Validate: [run 43229157040](https://github.com/Reekyi/UpStatus/actions/runs/43229157040), FAIL no HEAD atual.
- Log confirma `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`.
- `release.json` aponta para `/upstatus/upstatus.user.js`; `scripts/build.mjs` constrói o update URL usando o runtime beta10; `scripts/validate.mjs` exige o caminho `/upstatus/upstatus.user.js`.
- A candidata #147 corrige o contrato em sua própria branch e passou Full Validate, mas não está integrada à QA.

## 3. Candidatas auxiliares relevantes

- **#149 Team Lite call-source:** [Candidate Checks 43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232) e guard offline [43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) passaram. O helper HTTP tem 10 casos e uma verificação de ligação da rota, totalizando 11/11. O helper mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409.
- **#151 admin/chat:** [Full Validate 43196245858](https://github.com/Reekyi/UpStatus/actions/runs/43196245858) passou, incluindo regressões de chat. Isso não incorpora AUTH-03 completo nem substitui a candidata #133.
- **#133 Normal call-source/AUTH-03:** continua Draft; não foi integrada a uma única candidata final com todos os controles de release.
- **#143 dispatcher:** continua Draft e não resolve sozinho a divergência entre as arquiteturas Normal single-runtime e dual-runtime.

## 4. Divergência entre helper HTTP e Edge Function do laboratório

**Achado P1 — paridade de artefato não comprovada.**

A fonte candidata da #149 importa `mapOpenVoiceRoomResult` e a rota de abertura utiliza esse mapper. O teste offline verifica que `VOICE_ATTEMPT_ALREADY_ACTIVE` resulte em HTTP 409.

A Edge Function efetivamente listada no laboratório, `upstatus-signal-test` v32, tem source SHA:

`f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`

A fonte implantada mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas não inclui `VOICE_ATTEMPT_ALREADY_ACTIVE` nesse mapper. Esse código cai no caminho 500. A RPC PostgreSQL pode produzir `VOICE_ATTEMPT_ALREADY_ACTIVE`.

Não foi feita chamada HTTP ao endpoint nesta execução. A conclusão é de inspeção de fonte: a função implantada não possui o mapeamento presente no helper candidato. O CI offline não comprova paridade com a função implantada.

**Próximo passo:** atualizar a função somente no laboratório por fluxo de Engenharia autorizado e adicionar teste que verifique status e corpo HTTP do endpoint implantado, não apenas o helper. Nenhuma atualização foi realizada nesta auditoria.

## 5. Bundles efetivamente instalados

As Edge Functions de produção foram lidas diretamente e seus userscripts embutidos foram decodificados.

| Runtime | Versão | Source SHA da Edge Function |
|---|---:|---|
| `upstatus` | v480 / userscript 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | v15 / userscript 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

Inspeção dos dois userscripts instalados:

- Normal recebe `remote_command` e executa `executeRemoteCommand(c)` diretamente a partir do payload broadcast.
- Team Lite também executa o comando do payload; sua checagem de sessão local não autentica o emissor.
- Ambos recebem `call_signal` pelo canal broadcast.
- Nenhum dos dois contém `private:true` ou `setAuth()` no transporte Realtime.

As candidatas #146/#76/#149 melhoram a recuperação/autorização de comandos, mas não estão nesses bundles instalados. A função server-mediated de sinalização existe apenas no laboratório; não foi encontrada como função de produção.

As 38 Edge Functions de produção estão ACTIVE e reportam `verify_jwt=false`. Isso não prova, isoladamente, ausência de autenticação: os handlers podem implementar sessão própria. Cada endpoint precisa ser revisado individualmente.

## 6. Realtime, RLS, grants e SECURITY DEFINER

Consulta SELECT-only em produção:

- `realtime.messages`: 115 linhas observadas; 115/115 com `private=false`; todas no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- RLS habilitado, FORCE RLS desabilitado e zero policies em `realtime.messages`.
- `anon` e `authenticated` possuem SELECT, INSERT e UPDATE em `realtime.messages`.
- Triggers SQL publicam no tópico legado; os bundles instalados assinam o tópico beta10. As candidatas #133/#149 usam o tópico legado; a candidata dual-runtime #142 usa beta10. A compatibilidade entre os produtos ainda não está fechada.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, pertencem a postgres, têm `search_path=public`, retornam `trigger` e possuem EXECUTE para anon/authenticated. O Security Advisor apresenta três WARN para cada papel (seis no total). Não foi tentada invocação RPC direta; o risco concreto observado é a concessão desnecessária e a publicação de payloads em broadcast público.

### Grants e policies

- 10 tabelas de `public` estão com RLS habilitado e sem policies.
- Nove dessas tabelas concedem a anon e authenticated sete privilégios cada: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- São 18 grants TRUNCATE para clientes (nove por papel). RLS não protege contra TRUNCATE.
- Total observado: 166 grants diretos para anon/authenticated em public, storage e realtime.
- Default ACL: 120 entradas expandidas para anon/authenticated, abrangendo defaults de postgres e supabase_admin em public/storage e schemas GraphQL.

### Storage e mensagens

- Buckets `chat-images` e `profile-images` são públicos, com limite de 20 MiB cada.
- 168 objetos em chat-images e 20 em profile-images.
- Zero policies próprias em `storage.objects`.
- 296 mensagens em `public.messages`, todas com `file_name IS NULL`.

## 7. Laboratório e migrations

O laboratório `bfpjtfqlnypisxljoxkb` está separado da produção:

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Migrations no ledger | 7 | 39 |
| Edge Functions ativas | 38 | 2 |
| Colunas setup_token_* | 0 | 4 |
| Buckets Storage | 2 | 0 |
| Linhas Realtime | 115 | 0 |

O laboratório possui 18 tabelas public com RLS e sem policies; não há grants diretos de tabela para anon/authenticated em public. Há 40 grants de cliente em storage/realtime, zero grants TRUNCATE de cliente e Default ACLs ainda amplas de supabase_admin. O Security Advisor apresenta 18 INFO de RLS sem policies e nenhum WARN de SECURITY DEFINER para as três funções de broadcast.

AUTH-03 continua ausente em produção: não existem colunas `setup_token_*`, tabela/RPC de rate limit ou RPC de consumo de convite. O laboratório tem as quatro colunas e as estruturas de teste, mas o ledger termina em `20261110000612_setup_invite_rate_limit_contract_test_20261109`; isso não demonstra aplicação da migration de produção pelo fluxo normal.

Quatro arquivos SQL originais continuam ausentes em master (404):
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #135 recuperou statements do ledger, não os arquivos originais byte a byte. Não sintetizar fontes originais a partir do schema atual.

O laboratório é um ambiente isolado de signaling/auth, não um terceiro ambiente full-product TEST. O runtime `upstatus-test` v281 permanece dentro do projeto de produção.

## 8. Workflow oficial Team Lite

O arquivo em `team-lite-official` continua:
- executando `supabase functions deploy upstatus`, em vez de `upstatus-team-lite`;
- usando Supabase CLI `latest`;
- sem validação de project ref e SHA exato.

A PR #129 propõe bloquear o dispatcher legado, mas permanece Draft. Não executar o workflow atual.

A candidata de workflow da PR #74 tem proteções de SHA/projeto e CLI pinada, porém publica somente o runtime Normal `upstatus`; ela não corrige o workflow oficial Team Lite.

## 9. Issues e aceitação manual

- Issue #78 permanece OPEN com **0/8** critérios marcados. Nenhum teste físico de perda real de internet, reconexão sem F5, microfone/tela com permissões reais ou interoperabilidade instalada foi realizado nesta execução.
- Issue #79 tem 16 itens marcados e 19 pendentes no corpo. O comentário dedicado QA foi atualizado no mesmo ID; o comentário da Engenharia foi preservado.
- Não há aprovação humana registrada nas PRs principais.

## 10. Gates e recomendação

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | blocked | 115 broadcasts públicos, sem autorização privada padrão |
| TEST-ISOLATION | done | laboratório separado e sem fixtures/linhas Realtime no snapshot |
| MIGRATION-PROVENANCE | blocked | quatro arquivos originais ausentes |
| AUTH-03 | in_progress | candidatos e estruturas de laboratório existem; produção não recebeu a migration |
| ACL-STORAGE | blocked | grants, Default ACL, RLS e buckets públicos pendentes |
| RECONNECT | pending | 0/8 critérios físicos na Issue #78 |
| HUMAN-REVIEW | pending | sem review/aprovação humana e sem autorização de release |

**Recomendação: NOT READY.**

Prioridades:
1. Escolher e reconciliar uma única arquitetura Normal, preservando AUTH-03, chat staged, signed uploads e updater correto.
2. Fazer Normal e Team Lite convergirem no transporte autenticado e no tópico Realtime, com transporte seguro ativado por padrão.
3. Corrigir a paridade do endpoint HTTP de voz entre helper, source e função de laboratório implantada.
4. Corrigir o workflow Team Lite para o slug correto, SHA/projeto exatos e CLI pinada.
5. Endurecer grants, Default ACL, SECURITY DEFINER, RLS e Storage.
6. Recuperar os quatro arquivos SQL originais e validar a migration de produção no fluxo de laboratório.
7. Corrigir o Validate da QA sem remover assertions.
8. Executar os oito testes físicos e obter aprovação humana vinculada ao SHA final.

## Limites e segurança

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/grants/policies/ACL ou mutação de fixtures. Nenhum teste foi executado ou rerun nesta rodada; os resultados de CI acima são logs existentes inspecionados.

A única escrita documental é este arquivo novo na branch QA e a atualização do comentário QA existente na Issue #79. O documento principal `docs/RELEASE_READINESS.md` foi preservado.
