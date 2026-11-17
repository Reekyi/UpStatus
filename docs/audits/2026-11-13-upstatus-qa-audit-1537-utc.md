# Auditoria independente UpStatus QA — 2026-11-13 15:37 UTC

## Escopo e método

Auditoria read-only do GitHub `Reekyi/UpStatus` e dos projetos Supabase `dlfvkawaiqduhlazsszm` (produção) e `bfpjtfqlnypisxljoxkb` (laboratório de sinalização/auth). Foram revisados os heads, PRs #74, #75, #76 e #82, as candidatas empilhadas #161/#162, workflows e resultados existentes, Issues #78/#79, bundles realmente implantados, Edge Functions, catálogos PostgreSQL, RLS, grants, Default ACL, SECURITY DEFINER, Realtime, Storage, migrations e advisors.

`docs/RELEASE_READINESS.md` foi lido integralmente: 8.410 linhas, blob `7cfbd70886df42ce790c078c224b19284a632595`, tamanho de 1.055.655 bytes no Git tree. O último checkpoint técnico registrado no arquivo continua sendo **2026-11-08 18:30 UTC**. O arquivo foi preservado, sem edição.

**Limites:** não executei testes novos, reruns, chamadas HTTP, testes de navegador/Tampermonkey, microfone, display capture ou interrupção física de rede. Os resultados CI abaixo são runs existentes, não execução desta auditoria. Todas as consultas SQL foram SELECT-only. A única escrita no repositório é este relatório novo na branch QA; a Issue #79 recebeu atualização apenas no comentário QA existente.

## 1. Heads e integridade dos branches

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `31838c877e2a1deae6a8a1675c369d0465ba2acc` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 | `31838c877e2a1deae6a8a1675c369d0465ba2acc` |
| PR #161 | `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e` |
| PR #162 | `8dc23905180494feded76f10e9fbdd59ac85feb5` |

- QA está **282 commits à frente e 1 atrás** de master. A PR #82 contém 139 arquivos, todos documentais.
- #74 está 887 commits à frente e 1 atrás de master. O diff contém 90 arquivos.
- #76 está 386 commits à frente e 0 atrás de `team-lite-official`; tem 57 arquivos.
- #75 tem 59 commits. #76 é descendente de #75 por 327 commits; tratar #75 como baseline histórico, não como segunda linha para integração independente.
- #161 tem 11 commits sobre `chore/continuity-foundation`, que aponta para o HEAD atual da #74.
- A base atual da #162 é o branch da #161 em `ae6a5f3`. A #162 está **6 commits à frente e 1 atrás**, divergente, com merge-base em `a1d8dc8`. Seu CI passou sobre um stack que não contém o último commit da base atual.
- Branch protection está desabilitada (`protected=false`, required checks off) em master, team-lite-official, QA e nos branches de trabalho consultados.
- Não há reviews humanas registradas nas PRs #74, #75, #76, #82, #161 e #162.

## 2. CI: resultado existente por candidato

| PR / linha | Evidência | Resultado e limite |
|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | Ambos SUCCESS no HEAD exato `dcaf6a0`. |
| #75 Team Lite | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico do baseline; não é a validação atual da #76. |
| #76 Team Lite | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | SUCCESS no HEAD exato `83a6cc4`; etapas de guard TEST, adapter, enrollment, recuperação de voz/tela, endpoint, Chromium IIFE, integração autenticada, rate limits, recibos, migrations de teste e triggers concluídas. |
| #82 QA | [Validate 43445076211](https://github.com/Reekyi/UpStatus/actions/runs/43445076211) | FAILURE no HEAD exato `31838c8`; step `Validate build`, erro `production updateURL mismatch`. A PR é documental. |
| #161 Normal | [Smoke 43430030814](https://github.com/Reekyi/UpStatus/actions/runs/43430030814) | SUCCESS no HEAD exato `ae6a5f3`; o Smoke executou a etapa `Validate complete Normal and TEST build` e depois os testes isolados. |
| #162 Voz | [Validate 43430131864](https://github.com/Reekyi/UpStatus/actions/runs/43430131864) | SUCCESS no HEAD `8dc2390`; contrato testado offline e Validate completo, mas sem Smoke no HEAD exato. A branch está 1 commit atrás da base atual. |

### Lacuna de trigger na #161

O `.github/workflows/validate.yml` da #161 filtra PRs com bases `master`, `develop` e `fix/normal-api-target-aligned-rate-limit-20261113`. A base real da PR #161 é `chore/continuity-foundation`, portanto o workflow dedicado Validate não dispara para essa PR. O workflow Signaling Smoke inclui a base `chore/continuity-foundation` e executou Validate dentro do Smoke, que passou. Não é ausência total de validação de build, mas é uma lacuna no check dedicado e no nome do check esperado.

Evidência: [workflow Validate da candidata](https://github.com/Reekyi/UpStatus/blob/fix/normal-api-target-aligned-rate-limit-20261113/.github/workflows/validate.yml).

### Contrato HTTP 409 da #162

A #162 mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409 em `voice-status.mjs`. O teste `voice-open-status.test.mjs` cria objetos `Response` localmente e verifica o mapper; não faz requisição HTTP real à Edge Function implantada. A função de laboratório `upstatus-signal-test` v32 ainda não contém esse mapper. A #162 deve ser atualizada sobre o HEAD atual da #161 e revalidada com Validate + Smoke antes de integrar.

Evidências: [PR #162](https://github.com/Reekyi/UpStatus/pull/162), [teste de contrato](https://github.com/Reekyi/UpStatus/blob/fix/voice-open-http-409-contract-20261113/scripts/voice-open-status.test.mjs), [função de laboratório](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb/functions/upstatus-signal-test).

## 3. Candidatas e compatibilidade Normal / Team Lite

### #161 Normal

A candidata alinha API e distribuição Normal na função `upstatus`, preserva o rate limit distribuído de convites (5 por administrador / 900 segundos), consumo atômico do convite e primeiro acesso por token de 256 bits com validade de 15 minutos. A validação exige que `release.json.scriptUrl`, `@updateURL`, `@downloadURL` e o alvo do cliente concordem.

O `release.json` continua em **3.4.7**, igual à versão Normal instalada. O guard de release exige incremento deliberado; a candidata não é publicável como atualização com a mesma versão.

O build TEST usa `UPSTATUS_TEST_PROJECT_ID`, rejeita produção e o projeto isolado de signaling/auth. Sem um projeto full-product dedicado, o build usa sentinel inerte e não representa um TEST implantável.

### Runtime efetivamente instalado

Os bundles foram extraídos das Edge Functions implantadas, não inferidos de manifests:

| Produto | Edge Function / versão | Userscript | Namespace | API efetiva | Tópico Realtime | Prefixo GM |
|---|---|---|---|---|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` | `upstatus-screen-share-3-1-1-beta10` | `upstatus-screen-share-live-3-1-1-beta10` | `upstatus_screen_share_beta8_` |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` | `upstatus-team-lite` | `upstatus-screen-share-live-3-1-1-beta10` | `upstatus_team_lite_` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` | `upstatus-screen-share-3-1-1-beta10` | `upstatus-screen-share-live-3-1-1-beta10` | `upstatus_screen_share_beta8_` |

O TEST compartilha namespace e prefixo GM com Normal, e seu `CLOUD_SERVER` aponta para beta10 de produção apesar de possuir updater próprio em `upstatus-test`. Há risco de colisão de instalação/armazenamento e o runtime TEST continua falando com a API Normal.

### Política de senha divergente

- Normal instalado: mínimo de 6 caracteres em login e setup.
- Team Lite e TEST instalados: mínimo de 4 caracteres em login e setup.
- Normal #161 e Team Lite #76 candidatos: política alinhada, setup mínimo 6 e login mínimo 4.

Uma conta configurada com senha de 4–5 caracteres pelo Team Lite instalado pode não autenticar pelo Normal instalado. A correção está nos candidatos, não nos runtimes atuais.

### AUTH-03 instalado

Os handlers Normal, Team Lite e TEST implantados ainda aceitam setup sem `setupToken` e mantêm fallback de role administrativa por nomes (`Ricardo`, `Lohan`, `Guilherme`) quando a role está vazia. A limpeza total do chat ainda tem caminho legado de autorização por nome.

Consulta read-only em produção:
- 5 usuários;
- 0 hashes de senha vazios;
- 0 roles vazias;
- 5 nomes distintos no snapshot;
- `users.name` não possui UNIQUE (somente `users_pkey(id)`).

A ausência de duplicatas no snapshot atual não substitui constraint de unicidade nem identidade imutável.

AUTH-03 está ausente no schema implantado: 0 colunas `setup_token_*`, tabela de rate limit de convite inexistente, RPC `consume_upstatus_setup_invite` inexistente e RPC de rate limit inexistente. A #161/#76 corrigem o fluxo candidato, mas não alteram o runtime instalado.

## 4. Realtime, voz, tela e mensagens

### Snapshot de produção

Nos últimos 14 dias, `realtime.messages` continha 94 mensagens observadas, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:

| Evento | Quantidade |
|---|---:|
| user_status | 62 |
| db_change | 26 |
| remote_command | 3 |
| remote_result | 3 |

Os triggers PostgreSQL publicam nesse tópico `upstatus-live-...`; os três bundles instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. O tópico de trigger e o tópico de cliente não coincidem no runtime atual. Os builds candidatos Normal #161 e Team Lite #76 usam `upstatus-live-...`, alinhando a configuração futura com os triggers.

### RLS e partições de Realtime

A tabela particionada pai `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado e zero policies. As partições diárias consultadas estão com RLS desabilitado, mas não possuem ACL direta para anon/authenticated. Não interpretar isso como prova de acesso SQL direto às partições.

O risco de canal é distinto: as mensagens observadas são `private=false`, ou seja, o transporte usado pelos clientes continua público. A configuração “Allow public access” do Dashboard não foi inspecionada; nenhum ataque ou publicação externa foi tentado.

### Triggers e SECURITY DEFINER

As três funções `public.upstatus_broadcast_*`:
- são SECURITY DEFINER;
- usam `search_path=public`;
- têm EXECUTE concedido a anon e authenticated;
- retornam `trigger`, portanto não são RPCs PostgreSQL comuns invocáveis diretamente por PostgREST;
- publicam com `private=false`.

`upstatus_broadcast_messages` envia o registro OLD/NEW completo em `db_change`. `upstatus_broadcast_remote_state` envia campos de comando/resultado selecionados. `upstatus_broadcast_users` envia campos de status selecionados.

O Security Advisor registra três WARN para anon e três para authenticated (seis no total), além de dez INFO por RLS sem policies.

### Comportamento dos clientes

Nos três bundles instalados:
- não há `private:true`;
- não há `realtime.setAuth()`;
- Normal e TEST executam `remote_command` quando `command.target===member`;
- Team Lite verifica a própria sessão antes de executar o comando, mas não autentica a identidade do emissor do broadcast;
- os handlers de `call_signal`/voice-room recebem payloads do broadcast público.

Nos candidatos #161 e #76, `remote_command` virou wake-up-only, acionando consulta autenticada ao backend. Isso é avanço real. Porém `signaling_transport_enabled` permanece default-off; com a flag desligada, voice-room e screen-share continuam usando o caminho público de fallback. O transporte privado/autenticado ainda não é padrão e não está implantado.

Nenhum ataque, áudio ou captura de tela foi reproduzido.

## 5. RLS, grants, Default ACL e Storage

### Produção

- 10 tabelas em `public` com RLS habilitado e zero policies.
- Nove dessas tabelas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER: 126 grants no total (9 tabelas × 7 privilégios × 2 papéis).
- `upstatus_visual_config` não concede esses privilégios aos papéis clientes.
- RLS sem policies bloqueia acesso por linha para esses papéis; TRUNCATE não é protegido por RLS. Não foi tentado TRUNCATE nem demonstrada execução externa por REST.
- Default ACL mantém 120 entradas anon/authenticated em `graphql`, `graphql_public`, `public` e `storage`.
- Security Advisor: 6 WARN / 10 INFO. Performance e Health Advisors sem findings.

### Storage

| Bucket | Público | Limite implantado | Objetos |
|---|---|---:|---:|
| chat-images | Sim | 20 MiB | 168 |
| profile-images | Sim | 20 MiB | 20 |

Não existem policies próprias em `storage.objects`. O bucket `chat-images` aceita imagens, áudio, vídeo e documentos (PDF, Word, Excel, CSV, PowerPoint, texto/RTF). `profile-images` aceita imagens.

O `supabase/config.toml` versionado declara `chat-images=25MB` e `profile-images=2MB`; produção está em 20 MiB para ambos. A allowlist de chat versionada também não contém os tipos de documentos permitidos na configuração implantada. Há drift de configuração que precisa ser reconciliado antes de sincronização de infraestrutura.

### Laboratório

- 18 tabelas public com RLS e zero policies.
- Nenhum grant direto de tabela public para anon/authenticated nas tabelas consultadas.
- Default ACL mantém 96 entradas anon/authenticated em graphql, graphql_public, public e storage.
- As três funções SECURITY DEFINER de broadcast usam `search_path=""` e não concedem EXECUTE a anon/authenticated.
- Zero buckets e zero objetos Storage.
- Security Advisor: 18 INFO por RLS sem policies e zero WARN.

O laboratório está melhor nos grants diretos e nas funções, mas ainda não é um ambiente full-product e mantém Default ACL ampla.

## 6. Edge Functions, projetos e migrations

A lista de projetos Supabase contém somente:
1. Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
2. Laboratório `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe terceiro projeto full-product TEST.

Produção tem 38 Edge Functions ACTIVE, todas com `verify_jwt=false` (o produto usa autenticação própria por token; isso exige autorização consistente nos handlers). Entre elas:
- `upstatus` v480;
- `upstatus-team-lite` v15;
- `upstatus-test` v281;
- 12 funções com prefixo `upstatus-test`;
- `upstatus-screen-share-3-1-1-beta10` v6;
- não existe `upstatus-signal` em produção.

O laboratório possui `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. A função v32 não contém o mapeamento `VOICE_ATTEMPT_ALREADY_ACTIVE => 409` da #162.

### Migrations

- Produção: 7 migrations no ledger.
- Laboratório: 39 migrations.
- Master: apenas três SQLs canônicos em `supabase/migrations`.
- Quatro fontes SQL históricas do ledger de produção continuam ausentes do diretório canônico.
- Branch gerenciada Supabase `main`: `MIGRATIONS_FAILED`; preview project status `ACTIVE_HEALTHY`.

Não foi aplicada migration nem alterado o histórico.

## 7. Workflows de publicação

### Team Lite oficial

O `.github/workflows/deploy-production.yml` em `team-lite-official`:
- executa `supabase functions deploy upstatus`, não `upstatus-team-lite`;
- usa Supabase CLI `latest`;
- usa o secret genérico `SUPABASE_PROJECT_ID`;
- valida o `release.json` raiz e não executa a cadeia de proveniência SHA/projeto/revisão do dispatcher candidato.

Não despachar esse workflow. A PR #76 executa Candidate Checks, mas não corrige por si só o workflow oficial. A linha de dispatcher mais segura precisa ser integrada e testada antes de qualquer publicação.

### TEST

O workflow de TEST em master é manual-only, mas usa `SUPABASE_PROJECT_ID` e CLI `latest`. A candidata Normal #161/#74 troca para `vars.SUPABASE_TEST_PROJECT_ID`, exige projeto de 20 caracteres, rejeita produção e o projeto de signaling/auth, fixa CLI 2.122.1 e faz fail-closed. Como o projeto full-product não existe, não há deploy TEST seguro disponível.

## 8. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): **0/8** critérios físicos marcados. Nenhum teste real de reconexão sem F5, Tampermonkey, microfone, display capture ou interoperabilidade instalada foi executado.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): **16/35** itens marcados e 19 pendentes no corpo atual.

O CI Chromium usa ambiente offline com stubs de Tampermonkey/GM e projeto isolado. Não substitui aceitação física no navegador e dispositivos reais.

## 9. Gates e decisão

| Gate | Estado QA | Evidência / dependência |
|---|---|---|
| RT-01 | BLOCKED | Broadcasts `private=false`; tópico atual não coincide com os clientes instalados; flag autenticada default-off. |
| TEST-ISOLATION | BLOCKED | Só dois projetos Supabase; TEST instalado usa namespace/prefixo GM e API do Normal. |
| MIGRATION-PROVENANCE | BLOCKED | Ledger produção 7, master 3 SQLs canônicos; quatro fontes históricas ausentes; branch main MIGRATIONS_FAILED. |
| AUTH-03 | BLOCKED | Produção sem setup token/rate limit; handlers legados aceitam setup sem token e fallback de role por nome. |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, SECURITY DEFINER expostas, buckets públicos e drift de configuração. |
| RECONNECT | PENDING | Issue #78 permanece 0/8; depende de testes físicos Normal e Team Lite sem F5. |
| HUMAN-REVIEW | PENDING | PRs principais Draft e sem reviews; aprovação/autorização explícita de Ricardo ainda ausente. |

### Próximas ações recomendadas

1. Atualizar a #162 sobre o HEAD atual da #161; executar Validate + Smoke no novo stack.
2. Corrigir o filtro de base do workflow Validate da #161 para incluir `chore/continuity-foundation` ou alinhar a base da PR.
3. Incrementar a versão Normal acima de 3.4.7 antes de qualquer release.
4. Provisionar, após decisão e confirmação de custo, um terceiro projeto full-product TEST. Não reutilizar o laboratório de signaling/auth.
5. Tornar signaling privado/autenticado por padrão em Normal e Team Lite; retirar fallback público de call/voice/screen e validar sessão/membership no servidor.
6. Aplicar AUTH-03 somente após plano, revisão e autorização separados; migrar sessões/perfis para `users.id` e remover fallback administrativo por nome.
7. Corrigir o workflow Team Lite para `upstatus-team-lite`, CLI fixa, SHA exato, projeto esperado e aprovação humana.
8. Endurecer RLS, grants, Default ACL, SECURITY DEFINER e Storage; reconciliar limites e MIME types.
9. Recuperar/provar a proveniência dos quatro SQLs e diagnosticar MIGRATIONS_FAILED.
10. Executar os oito critérios físicos da #78 e obter aprovação humana do SHA final.

## Veredito

**NOT READY.** A #161 é a melhor linha Normal observada e a #76 é a melhor linha Team Lite observada, mas os runtimes instalados ainda não têm as proteções candidatas. O principal risco continua sendo a diferença entre o código aprovado no CI e o produto efetivamente executado: bootstrap sem convite, identidade por nome, broadcasts públicos, TEST acoplado à API Normal e workflow Team Lite apontando para a função Normal.

Nenhuma produção foi modificada. Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag, grant, policy, ACL ou fixture foi realizada. As consultas Supabase foram SELECT-only. Nenhum teste físico foi simulado ou declarado como executado.
