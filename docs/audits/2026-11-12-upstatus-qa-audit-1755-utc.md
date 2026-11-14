# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-12 17:55 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Projeto Supabase de produção:** `dlfvkawaiqduhlazsszm`  
**Projeto isolado:** `bfpjtfqlnypisxljoxkb`  
**Resultado:** **NOT READY**

## Método e limites

- Inspeção read-only de refs, PRs, comentários, arquivos, diffs e logs do GitHub Actions.
- Leitura integral do blob de `docs/RELEASE_READINESS.md`: 1.045.105 caracteres, 8.409 linhas. O último checkpoint interno do documento é 2026-11-08 18:30 UTC.
- Consultas SQL exclusivamente SELECT e leitura de catálogos/Advisors/Edge Function sources no Supabase.
- Nenhuma suíte foi executada localmente; não havia checkout local disponível. Foram inspecionados resultados existentes de CI.
- Nenhum teste físico de navegador/dispositivo, chamada HTTP real ou deploy foi executado.
- Nenhuma migration, alteração de produção, flag, secret, role, grant, policy, ACL, merge ou publicação foi realizada.

## Heads e divergência

| Ref | SHA |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `4c591e87aa29dd4f2616a9266f7edb954f8d9bdc` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #152 candidata | `ed43e2336a54c4fc4b4c1b75db580ae06d1ebf8d` |

Comparação QA → master: QA está 258 commits à frente e 1 atrás; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. A diferença de master é documental e não foi incorporada automaticamente.

A PR #152 foi criada sobre `3255712e2cee2badf9d5d8085c3d1a2ac13f4c0c`. Comparada à QA atual, está 12 commits à frente e 2 atrás. Os dois commits da QA após o merge-base são documentais. Não fiz rebase ou merge.

A branch Team Lite é historicamente divergente de master; não deve ser sincronizada por fast-forward presumido.

## CI e PRs

| PR | Head/evidência mais recente inspecionada | Resultado |
|---|---|---|
| #74 Normal | PR head documental `3c2e87a751476b83721893eb610fe4ad348a276b`; Validate #42354944089 e Smoke #42354944038 | Ambos os jobs concluíram SUCCESS. O Smoke executou endpoint checks, integração autenticada, browser/WebRTC, rate limit, receipts, convite e cleanup. |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`; Candidate Checks #41674353127 | PASS histórico. Não é a candidata de signaling atual. |
| #76 Team Lite | `4edfbf25476c7c751741b2e14c2c88fdc554f618`; Candidate Checks #42993916169 | SUCCESS. O job executou checks de adapter, setup invite/rate limit, recuperação de voz/tela, HTTP helper, browser, integração autenticada e cleanup; a descrição do candidato registra 110/110 verificações autenticadas. |
| #82 QA | HEAD QA `4c591e87`; Validate #43260855895 | FAILURE no passo Validate build. Erro herdado: `production updateURL mismatch`. |
| #152 reconciliação QA | `ed43e233`; push #43264733860 e pull_request #43265009470 | Ambos SUCCESS no mesmo código candidato. |

As reviews de #74, #75, #76, #82 e #152 estão vazias na consulta de reviews. A #152 permanece Draft, sem aprovação humana.

### PR #152 — correção de updater aprovada em CI, mas não pronta para integração

O commit `ed43e233` corrige o guard do updater: `release.json.scriptUrl` precisa corresponder exatamente ao origin/projeto Supabase configurado e à função Normal. Os workflows push e pull_request passaram em sintaxe, contrato de release, build offline e regressões de chat. Os logs terminam com:

- `QA release target, updater-channel and chat-role contracts PASS`
- `Chat regression tests passed`
- `Validation OK: PROD 3.4.7 / TEST 3.4.7`

O guard de origin exato é uma correção real. Entretanto, a candidata tem um bloqueador novo e concreto.

#### P1 — regressão de upload assinado por divergência client/server

O userscript candidato em `src/userscript/upstatus.user.template.js` chama:

- `POST /api/chat/upload-url`
- `POST /api/profile/avatar-upload-url`

O helper envia `mime`, `size` e `name`, espera um ticket com URL assinada/token/path/publicUrl e depois faz PUT do arquivo.

O build da #152 lê `src/server/index.template.ts`. Esse arquivo **não** implementa nenhuma das duas rotas; ele mantém o caminho antigo `uploadFile(bucket, dataUrl, ...)` e as rotas `/api/chat/image`, `/api/chat/document` e `/api/profile/avatar`. O blob do server template é o mesmo na QA e na candidata: `8c0deac870a28d53a5608548adc9b5486ee2de55`.

A lista de arquivos alterados da #152 contém seis arquivos e não inclui `src/server/index.template.ts`. Em contraste, as Edge Functions implantadas atualmente (`upstatus` v480 e `upstatus-team-lite` v15) contêm as rotas `upload-url` e a função `signedUploadRoute`.

Consequência: o build candidato pode substituir um backend implantado que aceita upload assinado por um template que não reconhece os endpoints chamados pelo cliente. Anexos e avatar podem falhar após a integração.

O workflow verde não detecta isso: `scripts/validate.mjs` não contém assertion de `uploadFileDirect`, `upload-url` ou `signedUploadRoute`; `scripts/chat-regression.test.mjs` verifica staging de anexos, mas não a paridade das rotas client/server.

**Não integrar a #152 antes de portar a implementação signedUploadRoute para o template e adicionar testes de contrato que validem rota, método, payload, resposta e PUT.**

Outro ponto de release: a candidata ainda constrói PROD/TEST como 3.4.7, igual à versão Normal instalada. Não é uma versão de atualização distribuível; a versão estável precisa ser escolhida e incrementada após a reconciliação.

## Supabase — produção

Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.

Snapshot SELECT/catalog:

| Indicador | Resultado |
|---|---:|
| Mensagens Realtime no tópico UpStatus consultado | 119 |
| Mensagens com `private=false` | 119 |
| Tabelas public com RLS e sem policies | 10 |
| Grants diretos anon/authenticated em public/realtime/storage | 166 |
| Privilégios expandidos em Default ACL para papéis clientes | 120 |
| Buckets públicos | 2 |
| Objetos Storage | 188 |
| Colunas `setup_token_*` | 0 |
| Tabelas de rate limit | 0 |

Grants por schema: public 126, realtime 8, storage 32.

Buckets:
- `chat-images`: público, limite 20 MiB, 168 objetos.
- `profile-images`: público, limite 20 MiB, 20 objetos.
- `storage.objects`: zero policies próprias.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` continuam SECURITY DEFINER, `search_path=public`, com EXECUTE para anon e authenticated. O Security Advisor retornou 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. Não foi demonstrada invocação direta por RPC das funções trigger; o risco confirmado é a configuração de privilégios e o broadcast público.

O tópico consultado continua público. Não foram publicados eventos artificiais nem tentada exploração.

### AUTH-03 e Edge Functions

Produção ainda não possui colunas de convite, RPC de consumo ou tabela de rate limit. O ledger tem 7 migrations.

Inventário relevante:
- `upstatus` v480.
- `upstatus-team-lite` v15.
- `upstatus-test` v281.
- `upstatus-screen-share-3-1-1-beta10` v6.

As funções principais reportam `verify_jwt=false`, mas os handlers usam autenticação própria por token de sessão em parte das rotas. Isso não prova que todos os endpoints estejam abertos; a revisão de autenticação precisa ser por rota.

O runtime `upstatus-test` v281 está dentro do projeto de produção. Portanto, o nome TEST não representa isolamento de projeto.

## Supabase — laboratório

Projeto `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.

| Indicador | Resultado |
|---|---:|
| Mensagens Realtime | 0 |
| Tabelas public RLS sem policies | 18 |
| Privilégios expandidos em Default ACL para clientes | 96 |
| Buckets públicos | 0 |
| Objetos Storage | 0 |
| Colunas setup_token | 4 |
| Tabelas de rate limit | 2 |
| Migrations | 39 |

Security Advisor: 18 INFO de RLS sem policy e nenhum WARN de SECURITY DEFINER. O laboratório está isolado para testes específicos, mas não é um ambiente full-product que substitua a implantação TEST atual.

Edge Functions:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.

### P1 — contrato HTTP de voz ainda diverge no artefato implantado

A RPC de voz pode retornar `VOICE_ATTEMPT_ALREADY_ACTIVE`; o helper candidato espera HTTP 409. A Edge Function v32 ainda mapeia apenas `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, caindo em 500 para o código acima.

Os 11/11 testes offline do helper não provam o comportamento da função implantada. Não foi feita chamada HTTP real nem deploy de laboratório nesta execução.

## Workflows de publicação

- `team-lite-official/.github/workflows/deploy-production.yml` executa `supabase functions deploy upstatus`; o slug Team Lite correto é `upstatus-team-lite`. Também usa CLI `latest` e não fixa o project ref/SHA aprovado. **Não despachar.**
- `master/.github/workflows/deploy-test.yml` executa `upstatus-test` com `SUPABASE_PROJECT_ID`, CLI `latest`, sem allowlist de projeto de laboratório ou validação de ref. A função TEST atual está no projeto de produção. O valor efetivo do secret não foi lido; não se presume seu conteúdo.
- O workflow Normal em master também usa CLI `latest`; a versão estável está travada em 3.4.7 e o YAML não fixa explicitamente um SHA de release.

Nenhum workflow de deploy foi iniciado.

## Issues e aceitação física

- Issue #78 continua aberta, com 0/8 critérios físicos aprovados. Não houve queda real de internet, reconexão sem F5, teste de microfone/permissões reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 permanece aberta. O comentário dedicado QA existente foi atualizado; o comentário da Engenharia foi preservado e não foi criado comentário duplicado.

## Gates desta rodada

| Gate | Estado | Evidência/resumo |
|---|---|---|
| RT-01 | blocked | 119 mensagens Realtime, todas private=false; funções broadcast SECURITY DEFINER ainda executáveis por papéis clientes. |
| TEST-ISOLATION | blocked | Projeto de laboratório isolado existe, mas o workflow TEST não fixa seu project ref e o runtime `upstatus-test` está no projeto de produção; falta full-product TEST separado. |
| MIGRATION-PROVENANCE | blocked | Produção tem 7 migrations; quatro arquivos SQL originais continuam ausentes em master. |
| AUTH-03 | blocked | Produção sem setup_token, RPC de convite e rate limit. |
| ACL-STORAGE | blocked | 166 grants, 120 Default ACL, dois buckets públicos e zero policies em storage.objects. |
| RECONNECT | pending | Issue #78 sem teste físico aprovado; não houve confirmação de Ricardo. |
| HUMAN-REVIEW | pending | #152 Draft e sem reviews; nenhuma autorização de release. |

## Próximos passos recomendados

1. Portar `signedUploadRoute` para `src/server/index.template.ts` e adicionar testes de paridade client/server; manter limites e validação de conteúdo consistentes.
2. Reexecutar a validação completa da #152 após a correção e reconciliar os dois commits documentais da QA sem rebase/overwrite cego.
3. Escolher versão estável superior a 3.4.7 antes de preparar qualquer update.
4. Corrigir o workflow Team Lite para o slug correto, projeto fixo, SHA aprovado e CLI pinada.
5. Separar o workflow TEST do projeto de produção e criar ambiente full-product isolado.
6. Corrigir o contrato HTTP `VOICE_ATTEMPT_ALREADY_ACTIVE → 409` na fonte implantada do laboratório e validar por HTTP real após autorização.
7. Fechar RT-01, grants, Default ACL, SECURITY DEFINER e Storage com plano coordenado de migração/rollback.
8. Recuperar as quatro fontes SQL originais, diagnosticar `MIGRATIONS_FAILED` e concluir a aceitação física da #78.

**Recomendação: NOT READY.** Nenhuma produção foi alterada; todas as consultas SQL foram SELECT-only. A única escrita de código nesta rodada é este relatório documental novo na branch QA e a atualização do comentário QA existente na Issue #79.
