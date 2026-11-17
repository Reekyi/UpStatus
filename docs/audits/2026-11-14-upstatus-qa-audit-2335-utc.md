# Auditoria independente de qualidade — UpStatus

**Execução:** 2026-11-14T23:37:54.253Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** \`qa/release-readiness-2026-11-04-master\`  
**Projeto Supabase de produção:** \`dlfvkawaiqduhlazsszm\`  
**Projeto Supabase de laboratório:** \`bfpjtfqlnypisxljoxkb\`

## 1. Escopo e método

Foram feitas inspeções read-only do GitHub e do Supabase: heads e ancestry, metadados de PRs/issues, reviews, check-runs e logs, arquivos de workflow/build/validação, templates candidatos, fontes das Edge Functions implantadas, catálogo PostgreSQL, RLS, grants, Default ACL, triggers, Realtime, Storage, Security Advisor e migrations.

O arquivo \`docs/RELEASE_READINESS.md\` foi lido integralmente: 8.410 linhas, aproximadamente 1,045 MB. Seu último checkpoint datado continua em **2026-11-08 18:30 UTC**. O documento central não reflete as evidências de 14/11.

Não existe checkout local disponível nesta execução e não foi realizado teste manual em navegador/Tampermonkey. Os resultados automatizados abaixo são classificados como CI ou inspeção de código, nunca como aceitação física.

## 2. Heads reais e governança do repositório

| Ref | HEAD |
|---|---|
| master | \`9d40461babcec8eb8686c2a04be9c675df7da381\` |
| develop | \`6b33e1e\` |
| team-lite-official | \`9065bc1536fde64f437f6f12b7abb9b072cb8281\` |
| QA | \`8dbcbccfa33d7f7507c121e8f2b460a89375d158\` |

Comparação QA → master: **321 commits à frente, 1 atrás**. Os 171 arquivos divergentes são exclusivamente Markdown em \`docs/\`; não há arquivos de runtime na diferença da QA. O HEAD da PR #82 coincide com o HEAD da branch QA.

**Achado de governança:** a API do GitHub retornou \`protected=false\` para master, develop, team-lite-official e QA. A lista de repository rulesets retornou vazia. Portanto, não há branch protection clássica nem rulesets retornados para essas quatro branches. Isso deixa checks/reviews sem enforcement de branch no nível consultado.

Links: [QA](https://github.com/Reekyi/UpStatus/tree/qa/release-readiness-2026-11-04-master) · [master](https://github.com/Reekyi/UpStatus/tree/master) · [team-lite-official](https://github.com/Reekyi/UpStatus/tree/team-lite-official) · [rulesets API](https://api.github.com/repos/Reekyi/UpStatus/rulesets).

## 3. PRs obrigatórias e evidência de CI

| PR | HEAD | Situação | Evidência |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | \`dcaf6a072546eda0089e0cee4018c3047011f600\` | Open/Draft, 887 commits, 90 arquivos; Validate e Smoke SUCCESS | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) · [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | \`7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309\` | Open/Draft, 59 commits, 10 arquivos; PASS histórico | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | \`83a6cc4503ddc01254f6a2abbcc7af5c6803eb94\` | Open/Draft, 386 commits, 57 arquivos; Candidate Checks SUCCESS | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | \`8dbcbccfa33d7f7507c121e8f2b460a89375d158\` | Open/Draft, 321 commits, 171 arquivos Markdown; Validate FAILURE | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43649512678) |
| [#165 Normal provenance](https://github.com/Reekyi/UpStatus/pull/165) | \`434478771dca54505d3ec8b0cea0ada57d8d6dca\` | Guard e contract SUCCESS; Smoke FAILURE por quota | [Guard](https://github.com/Reekyi/UpStatus/actions/runs/43619663713) · [Contract](https://github.com/Reekyi/UpStatus/actions/runs/43619801133) · [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) |
| [#166 Team Lite provenance](https://github.com/Reekyi/UpStatus/pull/166) | \`e90e0dbbc0c6d89d77ea359dff0f1e82b4428413\` | Guard offline SUCCESS; sem Smoke integrado | [Guard](https://github.com/Reekyi/UpStatus/actions/runs/43624572780) |
| [#167 builder/chat](https://github.com/Reekyi/UpStatus/pull/167) | \`d100b0820dd7f98e2b78a98e6b6f8c09f13b1867\` | Open/Draft, 15 commits, 5 arquivos; Validate SUCCESS | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) |

Nenhuma das PRs #74, #75, #76, #82, #165, #166 ou #167 possui review submetida. Todas permanecem abertas e Draft.

A #76 é continuação da #75: comparação direta mostra 327 commits à frente e zero atrás. Não são dois payloads independentes. A #166 é seis commits à frente da base #76.

### Falha exata da #82

O run 43649512678 executou no SHA exato da QA. O job fez build de PROD/TEST 3.4.7 e falhou em \`scripts/validate.mjs:26\`:

\`VALIDATION FAILED: production updateURL mismatch\`

O log confirma que o erro é a assertion do endereço de atualização, não uma falha de Markdown.

### #167: correção candidata, não integrada

A #167 separa URL de distribuição e endpoint de API. O builder usa \`release.scriptUrl\` para o updateURL estável, valida que ele corresponde ao endpoint de distribuição e mantém o endpoint beta10 como API até um cutover coordenado. O Validate passou e as regressões estáticas do chat passaram.

A mesma PR remove a exclusão recursiva do diretório da função antes de gravar o artefato, evitando apagar arquivos preexistentes. No chat, altera anexos para ficarem staged no composer até o envio e adiciona verificação do papel persistido \`implementation_admin\` à limpeza global. Isso é CI/inspeção de patch; não houve teste manual do fluxo de anexos nem Smoke Supabase.

### #165: bloqueio de infraestrutura

O Smoke recebeu HTTP 402 com \`exceed_edge_functions_invocations_quota\`. O log registra 0/19 checks não autenticados aprovados porque a função foi bloqueada antes de processar as rotas; os checks autenticados não foram iniciados. Não classificar como regressão funcional do código.

## 4. Builder e workflows

No master atual, \`scripts/build.mjs\` deriva o updateURL de produção do endpoint beta10, enquanto \`scripts/validate.mjs\` exige o caminho estável \`/functions/v1/upstatus/upstatus.user.js\`. Essa divergência explica o Validate vermelho da #82. A correção está na #167, ainda Draft e não integrada.

O workflow atual de master usa Supabase CLI \`latest\`, mantém release 3.4.7 travado e publica somente a função \`upstatus\`. O workflow oficial de Team Lite também usa CLI \`latest\` e executa \`supabase functions deploy upstatus\`, em vez de \`upstatus-team-lite\`; não contém a mesma validação rigorosa de projeto/SHA/preflight. **Não despachar o workflow Team Lite atual.**

O workflow TEST em develop também usa \`SUPABASE_PROJECT_ID\` compartilhado e CLI \`latest\`. Não foi disparado nenhum workflow nesta execução.

## 5. Artefatos instalados e compatibilidade Normal/Team Lite

Fontes lidas diretamente das Edge Functions implantadas:

| Componente | Versão | SHA da fonte |
|---|---:|---|
| Normal \`upstatus\` | v480; userscript embutido 3.4.7 | \`bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd\` |
| API beta10 | v6 | \`f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29\` |
| Team Lite \`upstatus-team-lite\` | v15; userscript embutido 3.4.30 | \`2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb\` |
| TEST legado dentro do projeto de produção | v281 | \`7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a\` |

Os dois userscripts instalados foram decodificados a partir dos bundles implantados. Ambos assinam o tópico público \`upstatus-screen-share-live-3-1-1-beta10\`, sem \`private:true\` e sem \`realtime.setAuth()\`. Normal encaminha \`remote_command\` recebido diretamente para a execução do comando. Team Lite também exige sessão local e geração atual, mas isso não autentica o publicador.

Nos candidatos #74/#76, o transporte server-mediated continua opt-in: \`signaling_transport_enabled\` default false e endpoint vazio. O caminho público legado permanece ativo enquanto a flag está desligada. Os templates candidatos de servidor inspecionados não implementam as rotas server-mediated correspondentes. Em produção não existe função \`upstatus-signal\`; o endpoint \`upstatus-signal-test\` v32 e \`upstatus-signal-e2e-once\` v3 existem somente no laboratório.

As PRs #165/#166 removem a confiança no marcador \`_authenticatedTransport\` dentro do payload, passando a origem confiável separadamente. Seus guards offline passaram, mas não estão integradas aos candidatos oficiais e não houve Smoke autenticado por quota.

## 6. Realtime e payloads

Produção: snapshot atual de \`realtime.messages\` contém 106 eventos, todos \`private=false\`:

| Evento | Quantidade |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_command | 4 |
| remote_result | 4 |

O trigger \`upstatus_broadcast_messages()\` serializa OLD/NEW completos com \`to_jsonb\` e publica a linha em \`db_change\`. Isso pode incluir texto de conversas, URLs de anexos e metadados. O trigger de estado remoto publica campos de comando/resultado; o trigger de usuários publica metadados de status. O tópico dos triggers é \`upstatus-live-6f5e7b31-...\`, diferente do tópico que os clientes instalados assinam. A diferença impede afirmar que esses 106 registros foram entregues aos clientes.

**Não foi confirmada a configuração Allow public access do Dashboard e não foi reproduzido acesso externo.** O achado é um caminho potencial de exposição confirmado no código/catálogo, não um vazamento externo comprovado.

Laboratório: os três triggers foram minimizados para publicar somente \`{op: TG_OP}\`, sem linha completa nem campos de comando/status. Porém continuam usando \`private=false\`; não representam ainda Realtime privado/autorizado. As três funções de broadcast do laboratório têm \`search_path\` vazio e EXECUTE restrito a service_role, sem EXECUTE para anon/authenticated.

## 7. RLS, grants, SECURITY DEFINER e Storage

### Produção

- Dez tabelas de produto em public têm RLS habilitado e zero policies.
- Nove dessas tabelas concedem diretamente a anon e authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. São 126 linhas de grants no catálogo para os dois papéis. RLS não protege TRUNCATE.
- \`realtime.messages\` é particionada, RLS habilitado, FORCE RLS desabilitado e zero policies; anon/authenticated têm SELECT, INSERT e UPDATE.
- As três funções SECURITY DEFINER de broadcast têm \`search_path=public\` e EXECUTE para anon/authenticated/service_role. O Security Advisor reporta 3 WARN para anon e 3 WARN para authenticated, citando os endpoints RPC correspondentes. Não foi feita chamada RPC.
- Default ACLs de postgres permanecem amplas em public e storage; supabase_admin mantém defaults amplos em public, graphql e graphql_public.
- Storage: buckets públicos \`chat-images\` (168 objetos) e \`profile-images\` (20 objetos), limite 20 MiB cada; zero policies próprias em \`storage.objects\`.

### Laboratório

- 18 tabelas public em RLS sem policies, incluindo as tabelas de sinalização. Não há grants diretos de tabela public para anon/authenticated.
- Realtime sem dados; parent RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE ainda presentes.
- O Default ACL de postgres em public foi restringido, mas postgres ainda mantém defaults amplos em storage e supabase_admin mantém defaults amplos em public/graphql/graphql_public.
- Security Advisor: 18 INFO de RLS sem policy e zero WARN.

O Advisor identifica ausência de policies; o uso esperado via service_role precisa continuar explícito e testado. Não foram executadas operações destrutivas nem alterados grants/policies.

## 8. AUTH-03 e Edge Functions

Produção:
- 5 usuários: 3 implementation_admin e 2 implementation_user; nenhum sem password_hash e nenhum sem role.
- 319 sessões; tabela de sessão ainda usa token_hash/user_name, sem user_id.
- Zero colunas setup_token_* e nenhuma tabela de rate limit de setup/sinalização.
- O runtime ainda expõe POST /api/setup para contas sem password_hash e usa fallback nominal para atribuir implementation_admin a Ricardo, Lohan e Guilherme. No snapshot atual todos os cinco usuários já têm password_hash, mas o caminho legado permanece no código.
- POST /api/chat/clear ainda autoriza somente pelo nome Ricardo no runtime implantado. A #167 adiciona verificação do papel persistido, mas não está implantada.

Laboratório:
- Zero usuários e zero sessões.
- Quatro colunas setup_token_*.
- Tabelas upstatus_setup_invite_rate_limits e upstatus_signal_rate_limits.
- RPCs de convite/rate limit executáveis somente por service_role.
- Zero buckets/objetos/fixtures de produto.

A lista de produção contém 38 Edge Functions ACTIVE e todas reportam \`verify_jwt=false\` no nível da plataforma. Os handlers core usam token de sessão próprio; isso não significa que todas as funções estejam automaticamente sem autenticação, mas exige revisão individual dos handlers. O laboratório contém duas funções de teste ACTIVE.

Produção tem 7 migrations; laboratório tem 39. A branch Supabase gerenciada \`main\` permanece \`MIGRATIONS_FAILED\`, embora o preview esteja \`ACTIVE_HEALTHY\`. A proveniência dos quatro SQLs recuperados não foi revalidada nesta execução.

## 9. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN e 0/8 critérios físicos. O último update do issue é 08/11. Os critérios incluem reconexão Normal e Team Lite sem F5, reentrada em sala, novas chamadas, ausência de áudio/peers/pollers duplicados, interoperabilidade e teste manual.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) permanece OPEN; corpo marca 16/35 e contém snapshots históricos de 07/11. O comentário mais recente da Engenharia registra checkpoint em 14/11 23:09 UTC. O comentário dedicado QA foi atualizado separadamente; o comentário da Engenharia e o corpo do issue não foram alterados.

Nenhum teste manual foi realizado. Não houve navegador com Tampermonkey, microfone/display reais, queda física de internet ou teste de interoperabilidade instalada.

## 10. Gates e recomendação

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | blocked | Produção continua com broadcasts públicos e transporte autenticado não default |
| TEST-ISOLATION | blocked | Laboratório vazio, sem fixtures/buckets e sem Full-Product TEST |
| MIGRATION-PROVENANCE | não atualizado | Não foi repetida a busca/comparação dos SQLs originais |
| AUTH-03 | blocked | Produção sem setup tokens/rate limit e com fluxo legado de primeiro setup |
| ACL-STORAGE | blocked | Grants/Default ACL amplos, RLS sem policies e buckets públicos |
| RECONNECT | pending | Issue #78 permanece 0/8; sem teste físico |
| HUMAN-REVIEW | pending | PRs sem reviews; sem autorização de release |

**RECOMENDAÇÃO: NOT READY.**

Prioridades:
1. Minimizar os broadcasts públicos em produção e depois migrar para Realtime privado/autorizado.
2. Restringir EXECUTE das funções SECURITY DEFINER e revisar grants/Default ACL com plano de rollback.
3. Implementar backend server-mediated em Normal e Team Lite e tornar o transporte autenticado default seguro.
4. Integrar #165/#166 e restaurar quota do laboratório para executar Smoke autenticado.
5. Completar AUTH-03 em produção por migration revisada e autorização explícita.
6. Corrigir workflow Team Lite para o slug correto, CLI pinada, projeto/SHA verificados e preflight.
7. Provisionar Full-Product TEST e realizar os oito testes físicos.
8. Obter reviews humanas e autorização explícita antes de qualquer release.

**Limites e segurança:** não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, grants, policies, ACL, roles ou fixtures. Todas as consultas SQL foram SELECT/catalog-only. A única escrita desta execução é este relatório documental na branch QA.
