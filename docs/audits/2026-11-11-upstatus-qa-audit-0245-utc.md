# Auditoria independente QA — 2026-11-11 02:45 UTC

**Veredito: NOT READY.** Esta rodada confirmou que a PR #142 corrige a geração do runtime API beta10 a partir do template revisado, mas ainda não fecha a publicação: o workflow Normal continua implantando somente `upstatus`. Também comparei o código implantado com o candidato de chat, revalidei o catálogo Supabase e revisei os guardas Team Lite.

## Escopo e método

- GitHub `Reekyi/UpStatus`: heads reais, PRs #74, #75, #76, #82, #89, #101, #125, #128, #129, #133, #134, #140, #141 e #142; workflows, checks, reviews, arquivos e histórico.
- Supabase produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`: somente SELECT, catálogos, inventário de Edge Functions, advisors e logs agregados.
- `docs/RELEASE_READINESS.md` foi lido integralmente na branch QA: 8.410 linhas, 1.045.105 caracteres, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint histórico dentro do documento continua em 08/11/2026 18:30 UTC.
- Nenhum teste local, navegador, HTTP de aplicação ou teste físico foi executado nesta rodada. Os resultados de CI abaixo são workflows existentes consultados, não execuções iniciadas pela QA.

## Heads e relações entre branches

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `d71f290c6624313ff73f478043bdf5a39041c4c3` |
| PR #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` |
| PR #82 | `d71f290c6624313ff73f478043bdf5a39041c4c3` |
| PR #89 | `5c46eea3` |
| PR #101 | `2ef7c332` |
| PR #133 | `8d38036e` |
| PR #134 | `ee246aa2` |
| PR #140 | `8493ece` |
| PR #141 | `61d00fb8666f4ca91c5a3c52a415d877b31a10cf` |
| PR #142 | `6fa53bd8246862e6fd5613787e5fa9bea4cdaefa` |
| PR #125 | `35c9122d5a07a0890c1fafda86cadd3a842f96b1` |
| PR #128 | `69d9c166ca92bbc3dce195ea4d714345ea9c326a` |
| PR #129 | `886d364d0c43af0d8aed867bf04c407478af5e8f` |

QA está 207 commits à frente e 1 atrás de master. Não fiz rebase nem incorporei o commit de master automaticamente. #76 é continuação de #75: 319 commits à frente e zero atrás. #142 está empilhada sobre #141: 10 commits à frente e zero atrás. #128 está empilhada sobre #125: 7 commits à frente e zero atrás.

## CI e revisão humana

| PR / linha | Evidência atual | Classificação |
|---|---|---|
| #74 Normal | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS; smoke inclui 136 checks autenticados e 19 não autenticados |
| #75 Team Lite baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico limitado; não é a suíte completa atual |
| #76 Team Lite | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | PASS; 110 checks autenticados, 16 não autenticados e contratos HTTP offline |
| #82 QA | [Validate 42940487376](https://github.com/Reekyi/UpStatus/actions/runs/42940487376) | FAIL no job Validate; o log deste job não foi retornado nesta consulta. O mesmo contrato herdado de `production updateURL mismatch` já foi reproduzido em execuções anteriores |
| #133 Normal | [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | PASS, 136/136 autenticados |
| #134 Team Lite | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) | PASS, 110/110 autenticados |
| #140 Migration Parity | [Workflow 42928939793](https://github.com/Reekyi/UpStatus/actions/runs/42928939793) | PASS offline; workflow push-only |
| #141 Staged Chat | [Validate PR 42936993580](https://github.com/Reekyi/UpStatus/actions/runs/42936993580) | PASS |
| #142 API beta10 parity | [Validate push 42943564821](https://github.com/Reekyi/UpStatus/actions/runs/42943564821) | PASS offline; workflow push-only, sem check PR-triggered |

As PRs #74, #75, #76, #82, #140, #141 e #142 retornaram zero reviews humanas. #125, #128 e #129 permanecem Draft. CI não equivale a aprovação humana nem a teste físico.

## Achado principal — PR #142 gera beta10, mas não o publica

A #141 corrige o updateURL Normal e introduz anexos staged, nome de documento e autorização administrativa por papel no template. A auditoria anterior identificou que o cliente continua chamando `upstatus-screen-share-3-1-1-beta10`, enquanto o build só gerava `upstatus` e `upstatus-test`.

A #142 corrige a geração:
- `scripts/build.mjs` gera também `supabase/functions/upstatus-screen-share-3-1-1-beta10/index.ts` a partir do mesmo template.
- `scripts/validate.mjs` compara o userscript embutido, o marcador de rota, `file_name`, autorização por papel e rotas de upload.
- `.github/workflows/normal-beta10-api-candidate.yml` roda apenas em `push` na branch candidata.
- A PR segue Draft, sem review e sem workflow PR-triggered no HEAD.

**Bloqueador de integração:** o `.github/workflows/deploy-production.yml` herdado continua publicando somente `upstatus`. Não há comando para implantar `upstatus-screen-share-3-1-1-beta10`. O workflow também exige `release.json.version === 3.4.7` e usa Supabase CLI `latest`. Portanto, mesmo que a distribuição Normal seja atualizada, a API beta10 que recebe o tráfego continuaria antiga. O artefato permanece em 3.4.7, sem incremento que identifique a nova entrega ao gerenciador de userscripts.

A arquitetura escolhida pela candidata é dual-runtime, coerente com produção atual, mas ainda falta um workflow de cutover coordenado e versionado que publique beta10 antes de `upstatus`, com SHA exato, projeto fixo, CLI pinada, preflight e rollback.

## Chat e anexos — comparação do código candidato com produção

Uma correção de precisão em relação ao checkpoint anterior: os runtimes implantados **já possuem** rotas de upload assinado. Inspecionei Normal `upstatus` v480, API beta10 v6 e Team Lite v15; todos contêm `signedUploadRoute` e `createSignedUploadUrl`. Os userscripts embutidos também possuem `uploadFileDirect`.

A lacuna real é a paridade do contrato:
- A coluna `public.messages.file_name` existe em produção, mas uma consulta agregada encontrou 279 mensagens e **zero** com `file_name` preenchido.
- Os runtimes implantados não persistem/retornam `file_name`; a fonte da #142 passa a persistir o nome de documento.
- Os clientes instalados ainda exibem a ação global de limpar chat apenas para `member === 'Ricardo'`; o backend implantado também verifica o nome Ricardo. A candidata #141 muda UI e servidor para `implementation_admin`, mas essa autorização só chega ao backend quando beta10 for efetivamente implantada.
- O teste `scripts/chat-regression.test.mjs` usa VM para notificações e várias asserções estáticas `source.includes`. Não é teste de navegador/Storage real.
- `signedUploadRoute` valida MIME e tamanho declarados pelo cliente e emite URL assinada; não inspeciona os bytes do arquivo. O bucket impõe allowlist de Content-Type e limite, mas isso não é detecção de formato por magic bytes.
- O fluxo faz upload antes de criar a mensagem. Não encontrei compensação que remova o objeto se a criação da mensagem falhar; risco de objeto órfão por inspeção estática, sem reprodução.

## Team Lite — publicação candidata e legado

A branch oficial `team-lite-official` ainda contém o workflow legado `.github/workflows/deploy-production.yml`, que instala Supabase CLI `latest` e executa `supabase functions deploy upstatus`, o slug Normal. Não despachar.

Os candidatos melhoram a governança:
- [#125](https://github.com/Reekyi/UpStatus/pull/125) cria dispatcher default-branch com SHA exato, PR mergeado, versão, confirmação explícita e preflights read-only.
- [#128](https://github.com/Reekyi/UpStatus/pull/128) adiciona aprovação humana vinculada ao HEAD exato e allowlist `UPSTATUS_RELEASE_REVIEWERS`; o workflow offline [42680126402](https://github.com/Reekyi/UpStatus/actions/runs/42680126402) passou.
- [#129](https://github.com/Reekyi/UpStatus/pull/129) substitui o dispatcher legado por um guard que falha fechado.

As três PRs continuam Draft e não foram incorporadas às branches oficiais. A configuração real da variável de allowlist não foi consultada. Nenhum deploy foi iniciado.

## Supabase — fotografia read-only

### Projetos e migrations

Só existem dois projetos na organização consultada:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations.

Não existe projeto full-product TEST independente. A função `upstatus-test` v281 está dentro do projeto de produção. O branch gerenciado `main` da produção permanece `MIGRATIONS_FAILED`, embora o preview esteja ACTIVE_HEALTHY.

AUTH-03 continua ausente em produção:
- `upstatus_setup_invite_rate_limits`: tabela ausente.
- `consume_upstatus_setup_invite`: RPC ausente.
- Colunas `setup_token_*` na tabela users: zero.
- Os handlers implantados ainda contêm `login(req,true)` e fallback de papel por nomes conhecidos.

No laboratório, a tabela de rate limit de convites e a RPC existem; há duas colunas de setup token. Isso comprova apenas o estado isolado, não o cutover.

### Edge Functions

- Produção: 38/38 ACTIVE. Runtimes relevantes: `upstatus` v480, `upstatus-screen-share-3-1-1-beta10` v6, `upstatus-team-lite` v15 e `upstatus-test` v281.
- Laboratório: duas funções ACTIVE: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Todas reportam `verify_jwt=false` no metadata. Isso não prova ausência de autenticação: os handlers implementam validação customizada de sessão.

### Realtime e confiança

Produção tem 67 linhas em `realtime.messages`, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

Os userscripts decodificados de Normal v480 e Team Lite v15 assinam `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` ou `realtime.setAuth()`. O tópico dos registros/triggers não coincide com o tópico dos clientes.

### RLS, grants, SECURITY DEFINER e Storage

Produção:
- 10 tabelas públicas com RLS e sem policies.
- 9 tabelas concedem privilégios diretos a `anon` e `authenticated`: 126 linhas de grants no catálogo, incluindo TRUNCATE, REFERENCES e TRIGGER.
- Default ACLs: 120 entradas destinadas a papéis clientes.
- Dois buckets públicos: `chat-images` e `profile-images`, ambos com limite de 20 MiB.
- Zero policies em `storage.objects`.

As três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, retornam `trigger`, estão anexadas a um trigger cada e têm EXECUTE para anon/authenticated. O Advisor retorna seis WARNs de SECURITY DEFINER. Como o retorno é `trigger`, não há evidência nesta inspeção de RPC direta invocável; os grants continuam desnecessários e o broadcast público é o risco concreto.

Laboratório:
- 18 tabelas públicas com RLS e sem policies.
- Zero grants diretos para anon/authenticated nas tabelas públicas atuais.
- 96 entradas Default ACL destinadas a clientes para objetos futuros.
- Zero mensagens Realtime e zero buckets Storage.
- As três funções de broadcast continuam SECURITY DEFINER, mas com search_path vazio e sem EXECUTE para anon/authenticated.

### Logs e cobertura

A consulta de 24 horas encontrou 62.883 registros em `function_edge_logs`, mas a janela disponível terminava em 21:00 UTC; a consulta não cobriu as últimas horas até 02:40 UTC. Os campos de atribuição por função/status retornaram vazios. Não usei essa ausência como prova de ausência de tráfego nem como validação de comportamento.

## Issue #78 — aceitação física

A issue permanece OPEN, com os oito critérios desmarcados. Nenhum teste físico foi executado:
- queda real de internet durante voz;
- retorno sem F5;
- reentrada em sala;
- novas chamadas após reconexão;
- ausência de áudio/peers/polling duplicados;
- interoperabilidade instalada Normal ↔ Team Lite.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | clientes ainda usam tópico público sem autenticação Realtime; 67 registros private=false |
| TEST-ISOLATION | in_progress | laboratório isolado e sem fixtures, mas não é full-product TEST e mantém Default ACLs amplas |
| MIGRATION-PROVENANCE | blocked | quatro SQLs históricos não recuperados byte a byte; #140 é guard estático |
| AUTH-03 | blocked | estrutura e RPC ausentes em produção; onboarding legado continua implantado |
| ACL-STORAGE | blocked | grants/Default ACLs amplos e buckets públicos sem policies |
| RECONNECT | pending | 0/8 critérios físicos; nenhum teste manual nesta rodada |
| HUMAN-REVIEW | pending | PRs examinadas sem reviews; nenhuma autorização de release |

## Próximos passos recomendados

1. Atualizar o workflow Normal para implantar beta10 e depois upstatus, com versão estável nova, SHA exato, CLI pinada, preflight e rollback.
2. Exigir check PR-triggered para #142 e teste de contrato HTTP/API com runtime isolado.
3. Validar nome de documento após reload e autorização por papel no backend efetivamente implantado.
4. Inspecionar bytes reais dos anexos, alinhar MIME/limites e definir limpeza de uploads órfãos.
5. Corrigir Team Lite oficial: incorporar guard de desativação legado e dispatcher revisado, após configurar/validar a allowlist humana.
6. Planejar RT-01, grants/Default ACLs e Storage com migrations revisadas e testes isolados.
7. Recuperar os quatro SQLs originais de uma fonte de backup confiável; não reconstruir por suposição.
8. Executar os oito critérios físicos de #78 e obter aprovação humana.

## Segurança e limites

Nenhuma escrita SQL, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva foi realizada. Todas as consultas Supabase foram SELECT-only. A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79; nenhum arquivo da Engenharia foi alterado.

A API de branch protection retornou 403 (não verificado); a consulta de rulesets retornou lista vazia. Não concluo que as branches estejam protegidas ou desprotegidas com base nisso.
