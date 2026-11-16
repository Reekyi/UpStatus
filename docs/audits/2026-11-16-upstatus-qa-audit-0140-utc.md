# Auditoria independente de qualidade — UpStatus
**Execução:** 2026-11-16 01:40 UTC  
**Repositório:** Reekyi/UpStatus  
**Projetos Supabase:** produção \`dlfvkawaiqduhlazsszm\`; laboratório \`bfpjtfqlnypisxljoxkb\`  
**Recomendação:** **NOT READY**

## Resumo executivo

Esta execução revalidou os heads das branches, as PRs obrigatórias, os workflows e os logs de CI existentes, além de executar consultas SQL exclusivamente SELECT nos dois projetos Supabase.

Achados mais relevantes:

1. A candidata Normal #167 passou no Validate depois de receber os endpoints de upload assinado, mas não tem Smoke nem teste contra Storage real. O código valida MIME e tamanho declarados pelo cliente; não inspeciona os bytes nem usa quarentena privada.
2. A #170 continua falhando porque sua regressão de chat espera upload imediato, enquanto a #167 introduz anexos pendentes. É um conflito de contrato de teste que precisa ser reconciliado, não contornado removendo a assertion.
3. A #167 separa corretamente URL de atualização e endereço da API, mas mantém Normal/TEST em 3.4.7. A atualização de usuários já instalados em 3.4.7 continua sem bump de versão. O build de master ainda gera o updateURL legado beta10.
4. Os runtimes de produção continuam sem convite de primeiro acesso, sem RPC de rate limit e com limpeza global do chat autorizada pelo nome de exibição.
5. Produção continua com 106 registros Realtime públicos, permissões de cliente em tabelas e Storage, três funções SECURITY DEFINER de broadcast executáveis por anon/authenticated e buckets públicos.
6. A Engenharia confirmou que um fast-forward restrito à candidata #167 fez a PR auxiliar #172 aparecer como merged. Não houve integração em master, develop, team-lite-official ou produção. A decisão de manter ou reverter esse fast-forward depende de Ricardo.

Não foram executados testes físicos, não foi iniciado novo workflow e não houve alteração de produção.

## 1. Heads reais e divergência

| Ref | HEAD |
|---|---|
| master | \`9d40461babcec8eb8686c2a04be9c675df7da381\` |
| develop | \`6b33e1e26ad105143f00372ae6d0f2fa52df60d6\` |
| team-lite-official | \`9065bc1536fde64f437f6f12b7abb9b072cb8281\` |
| QA | \`465100b10220b239ac407069cd3dc38c7c9e660f\` |

QA está 353 commits à frente e 1 atrás de master. O único arquivo identificado no lado exclusivo de master é um checkpoint documental de 08/11: \`docs/checkpoints/2026-11-08-production-migration-history-preflight.md\`.

A branch QA continua sendo a base da PR #82. O arquivo \`docs/RELEASE_READINESS.md\` foi lido por inteiro via blob. Seu último snapshot interno é de **2026-11-15 06:30 UTC**, portanto está desatualizado em relação aos estados consultados nesta execução.

A leitura de branch protection/rulesets não pôde ser concluída: o endpoint do GitHub retornou HTTP 403, “Resource not accessible by integration”. Esta auditoria não afirma um estado atual de proteção de branches.

## 2. PRs e CI

| PR | HEAD | Relação com a base | Evidência observada |
|---|---|---:|---|
| #74 Normal | \`dcaf6a072546\` | 887 à frente, 1 atrás de master | Validate e Smoke históricos PASS |
| #75 Team Lite baseline | \`7bbf9b90b3a7\` | 59 à frente de team-lite-official | Candidate Checks histórico PASS |
| #76 Team Lite ativa | \`83a6cc4503dd\` | 386 à frente de team-lite-official; 327 commits além de #75 | Candidate Checks PASS |
| #82 QA | \`465100b10220\` | 353 à frente, 1 atrás de master | Validate FAIL |
| #161 Normal rate limit | \`557814dc31be\` | candidata baseada na linha #74 | Validate e Smoke PASS |
| #167 updater/chat/uploads | \`d25b3fbe1bd2\` | 21 à frente de master | Validate PASS; sem Smoke observado |
| #168 Retry-After | \`c6de3eb29bb4\` | 2 commits sobre #161 | Validate PASS; sem Smoke observado |
| #170 updater/chat | \`693039eddbd0\` | 12 à frente de master | Validate FAIL |

Evidências principais:

- #74 Validate: [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142)
- #74 Smoke: [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200)
- #75 Candidate Checks histórico: [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127)
- #76 Candidate Checks: [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881)
- #82 Validate: [43781245980](https://github.com/Reekyi/UpStatus/actions/runs/43781245980)
- #161 Validate: [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384)
- #161 Smoke: [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445)
- #167 Validate: [43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392)
- #168 Validate: [43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462)
- #170 Validate: [43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686)

### #74 e #76: o que o CI realmente cobriu

O Smoke da #74 registrou 136/136 verificações autenticadas, negociação WebRTC de chamada/voz/tela com entrega de remote tracks, mesh de três membros, teardown de peers e tracks, rate limit de sinalização com 90 aceitas e uma rejeitada por HTTP 429, concorrência de recibos e cleanup.

A #76 registrou 110/110 verificações autenticadas, abertura/entrada/saída de salas, concorrência de tentativas de voz, WebRTC de chamada/voz/tela, mesh de três membros, rate limit, setup enrollment e cleanup. A linha Team Lite candidata é 3.4.31. O transporte autenticado permanece opt-in e desabilitado por padrão.

Esses resultados são testes automatizados em ambiente isolado. Não simulam a perda física de internet no userscript instalado nem substituem a aceitação manual da Issue #78.

### #82: falha herdada de master

O log construiu Normal e TEST em 3.4.7 e falhou em \`scripts/validate.mjs:26\`:

\`VALIDATION FAILED: production updateURL mismatch\`

O manifesto master está correto em \`release.json\`, com URL estável em \`/functions/v1/upstatus/upstatus.user.js\`. O \`scripts/build.mjs\` de master ainda define o host de API Normal como beta10 e constrói o updateURL a partir desse host legado. O validator espera o endpoint estável.

A #82 não deve ser usada como atalho para integrar o código: é uma branch QA com 353 commits de divergência e histórico documental extenso, e seu Validate continua falhando.

### #167 e #170: contrato de anexos

A #167 agora contém:

- URL de atualização derivada de \`release.json.scriptUrl\`, separada do host de API.
- Verificação de consistência do updateURL/downloadURL.
- Endpoints de upload assinado para chat e avatar.
- Validação no cliente de rota, bucket, MIME, tamanho, origem, caminho, token de uso único e contrato PUT.
- Validação no servidor de bucket, caminho, token, MIME, tamanho e origem HTTPS.
- Autorização de limpeza do chat por conta responsável **e** papel persistido \`implementation_admin\`.
- Regressões de chat e anexos pendentes.

O Validate 43784897392 passou nos testes offline de cliente/servidor, regressão de chat e validação do build. O próprio log informa PROD 3.4.7 / TEST 3.4.7. Não foi observado Smoke para esse HEAD e os testes de upload usam mocks, não Storage real.

A #170 falha na assertion “files are staged instead of uploaded immediately”. A #167 mudou o contrato para anexos pendentes; a #170 ainda testa o fluxo antigo de upload imediato. A correção é reconciliar o teste com o novo contrato e rodar Validate + Smoke no HEAD integrado. Não remover a assertion para forçar verde.

A #167 ainda não resolve sozinha a troca da API Normal: seu build separa a URL de atualização, mas mantém o host beta10 para chamadas de API. A #161 é a candidata que troca esse destino para \`upstatus\`; #168 acrescenta \`Retry-After: 900\` e \`Access-Control-Expose-Headers\`. A integração #167 + #161 + #168 precisa ser feita e testada como uma unidade.

O bump de versão ainda falta. A #167 valida 3.4.7, igual à versão instalada. Um usuário já em 3.4.7 pode não receber uma atualização que também se anuncia como 3.4.7. O workflow de produção master ainda exige exatamente 3.4.7, então o guard também terá que acompanhar a versão aprovada.

## 3. Efeito colateral de branch que exige decisão

A PR auxiliar [#172](https://github.com/Reekyi/UpStatus/pull/172) aparece como **closed/merged** em 2026-11-16 01:10:13 UTC. A Engenharia registrou que o fast-forward da branch candidata #167, feito com expected SHA, fez o GitHub considerar os commits da #172 incorporados à base candidata.

A #167 continua aberta/Draft e sua base é master. A #172 não foi integrada a master, develop ou team-lite-official. A PR temporária [#173](https://github.com/Reekyi/UpStatus/pull/173) foi fechada sem merge.

**Ação necessária de Ricardo:** decidir se o fast-forward restrito à candidata #167 deve permanecer ou ser revertido. A QA não alterou refs e não fará rollback por conta própria.

## 4. Workflows de publicação

Foram lidos os workflows atuais das três branches:

- [master deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml): manual-only, fixa a versão 3.4.7, usa CLI \`latest\`, lê \`SUPABASE_PROJECT_ID\` de secret genérico e não valida explicitamente o project ref esperado nem fixa o ref aprovado no checkout.
- [team-lite-official deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml): também usa CLI \`latest\` e project secret genérico; valida o manifesto raiz e executa deploy de \`upstatus\`, não \`upstatus-team-lite\`. Não despachar este workflow.
- [develop deploy-test.yml](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml): dispara por push e workflow_dispatch, usa project secret genérico e CLI \`latest\`, sem allowlist explícita do ID do laboratório. O valor do secret não foi lido; não há evidência para afirmar que aponta para produção, mas o destino não está validado no próprio workflow.

## 5. Runtimes instalados e compatibilidade

Os bundles foram extraídos dos códigos implantados, sem publicar ou modificar nada:

| Runtime | Versão da função | Userscript embutido | Host de API do cliente | Tópico Realtime |
|---|---:|---|---|---|
| Normal \`upstatus\` | v480 | 3.4.7 | \`upstatus-screen-share-3-1-1-beta10\` | \`upstatus-screen-share-live-3-1-1-beta10\` |
| Team Lite \`upstatus-team-lite\` | v15 | 3.4.30 | \`upstatus-team-lite\` | \`upstatus-screen-share-live-3-1-1-beta10\` |
| Legacy beta10 | v6 | 3.1.1-beta8 | beta8 | tópico beta8 |

Normal já é distribuído pelo endpoint \`upstatus\`, mas continua chamando a API beta10. Team Lite tem API própria, porém compartilha o tópico público legado. As candidatas ainda não foram publicadas.

As Edge Functions de produção somam 38 ACTIVE, incluindo funções de teste, versões beta e backups históricos. Os slugs principais são \`upstatus\` v480, \`upstatus-test\` v281, beta10 v6 e \`upstatus-team-lite\` v15. O laboratório tem duas funções ACTIVE: \`upstatus-signal-test\` v32 e \`upstatus-signal-e2e-once\` v3.

Todas aparecem com \`verify_jwt=false\` na configuração da plataforma. Isso, isoladamente, não prova acesso anônimo: os handlers principais têm autenticação própria por sessão/token. A quantidade de funções históricas/teste ativas em produção merece inventário e decisão de retenção.

## 6. AUTH-03: setup e administração

A inspeção dos handlers implantados Normal v480 e Team Lite v15 encontrou:

- \`/api/account\` revela se uma conta precisa de setup.
- \`/api/setup\` chama o fluxo legado de login/setup.
- Nenhuma leitura de \`setupToken\`.
- Nenhuma chamada a \`consume_upstatus_setup_invite\` ou \`consume_upstatus_setup_invite_rate_limit\`.
- \`/api/chat/clear\` autoriza por comparação do nome “Ricardo”, sem exigir o papel persistido \`implementation_admin\`.

O catálogo de produção confirma que não existem colunas \`setup_token_*\`, tabela de rate limit ou RPCs de convite. O banco possui cinco usuários, nenhum com hash de senha vazio e nenhum com papel vazio. Não foi reproduzida tomada de conta; o achado é a permanência do fluxo legado sem convite obrigatório.

No laboratório, a tabela \`upstatus_setup_invite_rate_limits\`, as quatro colunas \`setup_token_*\` em \`public.users\` e as duas RPCs de convite/rate limit existem. Não há usuários de teste. Isso comprova preparação isolada, não implantação em produção.

## 7. Realtime

Consulta SELECT em produção encontrou **106 linhas**, todas com \`private=false\` e no tópico:

\`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0\`

Distribuição: 72 user_status, 26 db_change, 4 remote_result e 4 remote_command.

Os dois clientes instalados assinam \`upstatus-screen-share-live-3-1-1-beta10\`, sem configuração \`private:true\` e sem \`realtime.setAuth()\`. O tópico dos clientes não coincide com o tópico usado pelos triggers. Isso é uma divergência de contrato; não foi reproduzida entrega ou falha de entrega em navegador nesta auditoria.

O trigger de mensagens em produção envia \`to_jsonb(OLD/NEW)\` como campo \`record\`, usando \`private=false\`. Os triggers do laboratório reduziram o payload de mensagens/estado para \`{op: TG_OP}\`, mas continuam chamando \`realtime.send(..., false)\`. O laboratório tem zero linhas Realtime.

Em ambos os projetos, anon/authenticated possuem privilégios efetivos SELECT, INSERT e UPDATE em \`realtime.messages\`, com zero policies na tabela. RT-01 permanece bloqueado.

## 8. RLS, grants, SECURITY DEFINER e Storage

### Tabelas public

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Tabelas public | 10 | 18 |
| RLS habilitado sem policy | 10 | 18 |
| Tabelas com grants efetivos para anon/authenticated | 9 | 0 |
| Tabelas com TRUNCATE efetivo para anon/authenticated | 9 | 0 |
| FORCE RLS | 0 | 0 |

Na produção, os mesmos nove objetos têm SELECT/INSERT/UPDATE/DELETE e TRUNCATE para anon e authenticated. RLS não protege TRUNCATE. Isso é uma exposição de privilégio confirmada no catálogo, não uma exploração REST reproduzida.

No laboratório, os grants diretos nas tabelas public foram removidos, mas isso não fecha os privilégios em outros schemas.

### SECURITY DEFINER e default ACL

As três funções de broadcast em produção são SECURITY DEFINER, usam \`search_path=public\` e permitem EXECUTE a anon/authenticated/service_role. O Security Advisor reporta três WARN para anon e três WARN para authenticated.

No laboratório, as mesmas funções continuam SECURITY DEFINER, mas usam \`search_path=''\` e EXECUTE apenas para service_role. O Advisor retorna zero WARN, porém ainda há privilégios padrão amplos.

Privilégios expandidos em default ACLs para anon/authenticated:

- Produção: 120 entradas, distribuídas por public, graphql, graphql_public e storage.
- Laboratório: 96 entradas nos mesmos schemas.

O zero WARN do Advisor no laboratório não significa que essas default ACLs tenham desaparecido.

### Storage e upload assinado

Produção:

| Bucket | Público | Objetos | Limite |
|---|---|---:|---:|
| chat-images | Sim | 168 | 20 MiB |
| profile-images | Sim | 20 | 20 MiB |

Ambos têm allowlist MIME, mas \`storage.objects\` tem zero policies próprias. anon/authenticated têm privilégios efetivos SELECT/INSERT/UPDATE/DELETE na tabela; RLS está habilitado sem policies. O laboratório não tem buckets nem objetos, mas também mantém grants diretos em \`storage.objects\` e zero policies.

A #167 valida MIME e tamanho declarados pelo cliente e emite upload assinado. Isso não é inspeção dos bytes efetivamente enviados. Não há evidência de scanner, validação por assinatura mágica ou quarentena privada. A visibilidade pública dos buckets precisa de decisão explícita antes de fechar ACL-STORAGE.

## 9. Migrations, ambiente e logs

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Estado do projeto | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| PostgreSQL | 17.11.0.002 | 17.11.0.003 |
| Migrations no ledger | 7 | 39 |
| Edge Functions ACTIVE | 38 | 2 |
| Usuários | 5 | 0 |
| Mensagens | 302 | 0 |
| Buckets Storage | 2 | 0 |

A branch gerenciada \`main\` da produção permanece \`MIGRATIONS_FAILED\`; o preview está \`ACTIVE_HEALTHY\`.

Quatro SQLs originais continuam ausentes nos refs QA/master consultados:

- \`20261023154754_create_upstatus_visual_config.sql\`
- \`20261026195855_add_chat_message_file_name.sql\`
- \`20261027154329_add_chat_message_file_name.sql\` — não confirmado; o ledger reporta \`add_chat_message_file_name\`
- \`20261027154329_allow_chat_document_mime_types.sql\`
- \`20261027155438_set_upstatus_upload_limits_20mb.sql\`

**Nota de precisão:** o nome/versão do segundo arquivo deve ser validado contra o ledger antes de qualquer recuperação. Não reconstruir SQL por inferência.

Na janela de logs consultada só apareceram pgbouncer_logs e postgres_logs. Não havia fonte Edge/Function suficiente para contar HTTP 402 nem provar recuperação de quota. Nenhuma conclusão de disponibilidade foi inferida a partir da ausência de logs Edge.

O laboratório não é Full-Product TEST: não possui usuários, mensagens, sessões, salas, memberships, eventos, buckets ou objetos suficientes para aceitação integrada.

## 10. Aceitação física e classificação dos testes

A Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta com **0/8** critérios aprovados. Não houve teste físico de perda de internet durante sala de voz, retorno sem F5, reentrada, novas chamadas, microfone real, captura de tela real ou interoperabilidade instalada Normal ↔ Team Lite.

Classificação desta execução:

- **CI existente:** #74, #76, #161, #167 e #168 têm os resultados PASS descritos acima; #82 e #170 têm FAIL.
- **Inspeção de código/catálogo:** realizada em workflows, bundles implantados, Edge Functions, RLS, grants, ACLs, funções e triggers.
- **Teste manual:** não executado.
- **Pendente:** reconexão física, Tampermonkey real, áudio/tela com dispositivos, interoperabilidade instalada e revisão humana.
- **Bloqueado:** RT-01, AUTH-03, ACL-STORAGE, TEST-ISOLATION e MIGRATION-PROVENANCE.

## 11. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Mensagens/canais públicos; tópico divergente; clientes sem auth privada |
| TEST-ISOLATION | blocked | Laboratório sem fixtures/buckets Full-Product |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs originais indisponíveis; main em MIGRATIONS_FAILED |
| AUTH-03 | blocked | Setup legado e chat-clear por nome ainda nos runtimes |
| ACL-STORAGE | blocked | Grants/default ACLs, buckets públicos, zero policies e bytes não inspecionados |
| RECONNECT | pending | Issue #78 0/8; teste físico não executado |
| HUMAN-REVIEW | pending | PRs candidatas sem reviews humanas e sem autorização de release |

## 12. Próximos passos recomendados

1. Reconciliar #167 + #161 + #168 em uma única candidata Normal, preservando os anexos pendentes e as assertions.
2. Rodar Validate e Smoke no HEAD integrado; não considerar o Validate isolado da #167 como aceitação de Storage real.
3. Definir bump de versão e atualizar o guard do workflow de produção.
4. Corrigir os workflows Normal, Team Lite e TEST: manifestos por produto, slug correto, CLI fixada, project ref allowlisted e SHA/ref de release explícitos.
5. Integrar AUTH-03 nos dois produtos e planejar migration/rollout coordenados.
6. Tornar Realtime privado/autorizado, alinhar tópicos e revisar grants e payloads.
7. Revisar RLS, TRUNCATE, default ACLs, SECURITY DEFINER e Storage; decidir privacidade dos buckets e inspeção/quarentena de uploads.
8. Recuperar os SQLs originais de fonte autoritativa e resolver MIGRATIONS_FAILED sem reconstrução especulativa.
9. Provisionar Full-Product TEST.
10. Executar os oito critérios físicos da Issue #78 e obter revisão/aprovação humana explícita.

## Integridade e limites

- GitHub: somente leitura durante a inspeção; foi criado apenas este relatório novo na branch QA, sem substituir arquivo existente.
- Supabase: todas as consultas foram SELECT-only. Nenhuma migration, grant, policy, bucket, secret, flag ou função foi alterada.
- Não houve merge, deploy, release ou publicação de userscript.
- Não foi executado teste manual nem iniciado novo workflow.
- O comentário da Engenharia na Issue #79 foi preservado; somente o comentário dedicado QA foi atualizado.
