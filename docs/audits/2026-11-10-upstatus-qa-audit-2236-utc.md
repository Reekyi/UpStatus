# Auditoria independente de qualidade - UpStatus

**Coleta:** 2026-11-10 22:36 UTC  
**Recomendação:** \`not_ready\`  
**Repositório:** \`Reekyi/UpStatus\`  
**Supabase produção:** \`dlfvkawaiqduhlazsszm\`  
**Supabase laboratório:** \`bfpjtfqlnypisxljoxkb\`

## Segurança da execução

- GitHub e Supabase foram usados apenas para inspeção, exceto a gravação deste relatório na branch QA e a atualização do comentário QA existente na Issue #79.
- Todas as consultas SQL foram SELECT/catálogo.
- Nenhum teste local ou manual foi executado nesta rodada.
- Os resultados de CI abaixo são execuções já existentes, não testes disparados pela auditoria.
- Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/grant/ACL/policy ou operação destrutiva foi realizada.

## Resumo executivo

Os candidatos Normal #133 e Team Lite #134 mantêm CI aprovado. A nova PR #140 acrescenta uma comparação estática útil entre o SQL executável das migrations candidatas AUTH-03 de produção e laboratório. Isso melhora a proteção contra drift, mas não executa as migrations nem recupera os quatro SQLs históricos originais.

Novos pontos confirmados nesta rodada:

1. O runtime isolado \`upstatus-signal-test\` v32 não reconhece \`VOICE_ATTEMPT_ALREADY_ACTIVE\`; reconhece \`VOICE_ATTEMPT_CONFLICT\` e \`ROOM_FULL\` como conflitos HTTP 409. Se a camada de banco emitir o primeiro código, o runtime atual pode cair no fallback HTTP 500. A regressão HTTP precisa atingir a Edge Function implantada, não apenas helper offline ou RPC direta.
2. A PR #140 é uma melhoria válida, porém seu workflow é push-only e offline. O guard compara apenas o bloco delimitado de DDL/RPC/grants, removendo comentários de linha e diferenças de whitespace. Não aplica SQL, não executa o bloco \`DO $test$\` e não comprova paridade do arquivo inteiro fora dos marcadores.
3. A produção continua sem a tabela/RPC de rate limit de convites. O laboratório possui a tabela e RPC, com RLS, SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role.
4. A produção continua com 67/67 mensagens Realtime persistidas como \`private=false\`, três broadcasts SECURITY DEFINER executáveis por anon/authenticated, grants amplos e dois buckets públicos.
5. Os workflows Normal continuam em arquiteturas incompatíveis: #133 publica runtime único; #89 publica beta10 e upstatus com cutover guard e preflight de migrations. O workflow oficial Team Lite ainda publica o slug Normal \`upstatus\`.
6. O Validate mais recente da QA (#82) falha em \`production updateURL mismatch\`.
7. O conteúdo de \`docs/RELEASE_READINESS.md\` não pôde ser relido nesta execução: o GitHub connector devolveu conteúdo vazio tanto na leitura integral quanto em leituras por faixa. O blob continua \`7cfbd70886df42ce790c078c224b19284a632595\`. O checkpoint anterior e a Issue #79 foram usados como referência; não se afirma uma nova leitura integral.

## Heads e evidências de CI

### Branches

- \`master\`: \`9d40461babcec8eb8686c2a04be9c675df7da381\`.
- QA \`qa/release-readiness-2026-11-04-master\`: comparação com master indica 203 commits à frente e 1 atrás; merge base \`a9288ccfcb0f308d3a587bfca624418a395be07b\`.
- O último SHA QA conhecido antes do novo commit documental era \`77e89b00be7275e0b07264d628064fcbe22170c1\`; a branch tinha um commit documental adicional. O conector de branches não expôs o SHA exato desse tip antes desta gravação.
- \`team-lite-official\`: comparação com master indica divergência, 220 commits à frente e 147 atrás. O último SHA de referência registrado na Issue #79 é \`9065bc1536fde64f437f6f12b7abb9b072cb8281\`.

### PRs solicitadas e candidatos relacionados

| PR | HEAD observado | Evidência | Resultado |
|---|---|---|---|
| #74 Normal | \`fb878537d95db9097cce6d29a14260b9fd8d2e3d\` | [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336), [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) | Ambos SUCCESS |
| #75 Team Lite baseline | \`7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309\` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS histórico; não equivale à suíte completa atual |
| #76 Team Lite | \`3b1406ddb56aecfa5b5515791ca99aea92c305ab\` | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | SUCCESS |
| #82 QA | branch QA; último SHA conhecido \`77e89b00...\`, com um commit documental posterior | [Validate 42908023779](https://github.com/Reekyi/UpStatus/actions/runs/42908023779) | FAILURE: \`production updateURL mismatch\` |
| #89 AUTH-03/cutover | \`5c46eea3e4c9f909d3e0992bacfbd2263c2d8024\` | [PR workflow 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | SUCCESS; guard corretamente bloqueou cutover |
| #133 Normal | \`8d38036ead5e1c3c9cc00db9791f8c9de093ba62\` | [Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827), [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | Ambos SUCCESS; Smoke 136/136 autenticados |
| #134 Team Lite | \`ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5\` | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298), [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) | Ambos SUCCESS; 110/110 autenticados, 16/16 não autenticados, 11/11 contratos |
| #140 parity AUTH-03 | \`2a9a7d0c6a4bdae0a11400a227b53e8fe9c2c7c9\` | [Validate offline 42910727417](https://github.com/Reekyi/UpStatus/actions/runs/42910727417) | SUCCESS em push-only; sem check PR retornado |

As PRs #74, #75, #76, #82, #133, #134 e #140 retornaram zero reviews registradas nesta consulta. #140 permanece aberta e Draft.

### PR #140: revisão independente do guard de paridade

A PR está empilhada sobre #133, três commits à frente do SHA base \`8d38036...\`. Alterou somente:

- \`.github/workflows/migration-parity-candidate.yml\`
- \`scripts/migration-layout.test.mjs\`

O workflow:
- dispara somente em push para \`fix/normal-migration-parity-guard-20261110\`;
- usa \`permissions: contents: read\`;
- fixa a action checkout por SHA;
- executa \`node scripts/validate.mjs\`;
- não acessa Supabase, secrets, fixtures ou deploy.

O log do job confirma:
- \`Test migration layout guard passed.\`
- regressões offline de sinalização, convites, voz, upload e chat;
- \`Validation OK: PROD 3.4.7 / TEST 3.4.7\`.

A comparação lê a migration de produção desde \`CREATE TABLE IF NOT EXISTS public.upstatus_setup_invite_rate_limits\` até \`COMMENT ON TABLE\`, e a migration isolada até \`DO $test$\`. Remove comentários de linha e whitespace antes de comparar. Isso cobre o bloco comum de tabela, índice, RLS, grants e RPC. Não é parser SQL, não compara comandos fora desses marcadores e não executa a migration ou o bloco DO. É um guard estático útil, não prova de aplicação no banco.

A migration candidata define:
- tabela de buckets com RLS habilitado;
- revoke de privilégios de PUBLIC, anon e authenticated;
- CRUD somente para service_role;
- RPC SECURITY INVOKER com search_path vazio;
- validação de tamanho de bucket key, limite e janela;
- contador fixo por bucket com upsert atômico;
- limpeza oportunista limitada a 100 linhas com FOR UPDATE SKIP LOCKED;
- EXECUTE da RPC somente para service_role.

## Workflows e compatibilidade

### Normal #133 versus #89

Inspeção dos arquivos nos SHAs exatos:

- #133 \`scripts/build.mjs\`: PROD_FUNCTION é \`upstatus\`; gera \`upstatus\` e \`upstatus-test\`; o CLOUD_SERVER de produção aponta para \`upstatus\`.
- #133 \`deploy-production.yml\`: manual-only, exige branch master, checkout SHA exato, project ref esperado, secret presente, CLI 2.122.1 e deploy somente de \`upstatus\`. Porém exige \`release.json.version === 3.4.7\`, que é a versão já implantada.
- #133 \`release.json\`: 3.4.7 e scriptUrl para \`/functions/v1/upstatus/upstatus.user.js\`.
- #89 \`scripts/build.mjs\`: cria dois runtimes Normal, \`upstatus\` e \`upstatus-screen-share-3-1-1-beta10\`; o userscript aponta a API para beta10.
- #89 \`deploy-production.yml\`: manual-only, exige master e SHA exato, valida projeto, aplica guard de cutover, consulta histórico de migrations por Management API somente leitura e publica beta10 antes de upstatus.

Os contratos continuam incompatíveis. #133 é runtime único e #89 é runtime duplo. A versão 3.4.7 de #133 não é uma nova versão de userscript; o guard de sincronização do artefato raiz exige versão superior à atual. Não integrar os workflows sem uma decisão arquitetural e um contrato único de versão/cutover.

### Team Lite oficial

O workflow oficial em \`team-lite-official\`:
- é workflow_dispatch;
- não fixa explicitamente o SHA do checkout nem verifica project ref;
- usa Supabase CLI \`latest\`;
- executa \`supabase functions deploy upstatus\`, que é o slug Normal, não \`upstatus-team-lite\`.

O manifesto oficial aponta para buildVersion 3.4.30. A candidata #134 é 3.4.31, mas sua suíte aprovada não corrige por si só o dispatcher oficial.

### TEST

O workflow TEST oficial em \`team-lite-official\` ainda possui gatilho push em develop, usa \`SUPABASE_PROJECT_ID\` e CLI \`latest\`. A proposta da #84 muda para manual-only, variável dedicada \`SUPABASE_TEST_PROJECT_ID\`, validação do projeto e CLI fixada. Continua Draft. O inventário contém apenas produção e laboratório de sinalização/auth; não existe projeto full-product TEST independente.

## Supabase: fotografia read-only

### Produção \`dlfvkawaiqduhlazsszm\`

- 7 migrations remotas.
- 38 Edge Functions ativas.
- Runtimes relevantes: \`upstatus\` v480, \`upstatus-team-lite\` v15, \`upstatus-screen-share-3-1-1-beta10\` v6 e \`upstatus-test\` v281.
- Não existe \`upstatus-signal\` implantada.
- As funções relevantes têm metadata \`verify_jwt=false\`; isso não prova ausência de autenticação, pois os handlers principais possuem validação customizada.
- Os bundles Normal e Team Lite continuam com o fluxo antigo \`login(req,true)\`; produção não possui a tabela/RPC AUTH-03 de rate limit de convites.
- Tabela de rate limit de convites: ausente.
- RPC \`consume_upstatus_setup_invite_rate_limit\`: ausente.

Banco e Storage:
- 10 tabelas públicas com RLS habilitado e sem policies.
- 9 dessas tabelas têm grants diretos para anon/authenticated.
- 126 linhas de privilégios de tabela para os papéis clientes nas tabelas públicas, incluindo privilégios amplos como TRUNCATE.
- 120 privilégios em Default ACLs destinados a anon/authenticated/PUBLIC, distribuídos entre objetos de tabela, função e sequência em schemas como public, storage e graphql.
- \`storage.objects\` e \`storage.buckets\` têm grants para anon/authenticated e nenhuma policy própria retornada.
- Buckets \`chat-images\` e \`profile-images\` são públicos, com limite de 20 MiB cada.

Realtime e SECURITY DEFINER:
- 67/67 linhas em \`realtime.messages\` estão com \`private=false\`, no tópico \`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0\`.
- Último registro observado: 2026-11-10 21:00:28 UTC.
- \`realtime.messages\` concede SELECT/INSERT/UPDATE a anon e authenticated; RLS está habilitado e sem policies.
- Três funções \`upstatus_broadcast_*\` continuam SECURITY DEFINER, \`search_path=public\`, executáveis por anon e authenticated.
- A função de mensagens continua sendo a fonte de payload completo OLD/NEW via to_jsonb, conforme inspeções anteriores. Não foi demonstrada exploração RPC direta nesta rodada.

### Laboratório \`bfpjtfqlnypisxljoxkb\`

- 39 migrations.
- 2 Edge Functions: \`upstatus-signal-test\` v32 e \`upstatus-signal-e2e-once\` v3.
- 18 tabelas públicas com RLS habilitado e sem policies.
- Zero grants diretos de tabela pública para anon/authenticated.
- 96 privilégios em Default ACLs destinados a papéis clientes para objetos futuros.
- Zero mensagens Realtime e zero buckets.
- As três funções broadcast são SECURITY DEFINER, mas têm search_path vazio e não são executáveis por anon/authenticated.
- A tabela \`upstatus_setup_invite_rate_limits\` existe.
- A RPC \`consume_upstatus_setup_invite_rate_limit(text,integer,integer)\` existe, é SECURITY INVOKER, search_path vazio, EXECUTE somente para service_role e sem SELECT para anon/authenticated.

### Drift HTTP de voz no runtime isolado

A Edge Function implantada \`upstatus-signal-test\` v32 contém mapeamento HTTP 409 para \`VOICE_ATTEMPT_CONFLICT\` e \`ROOM_FULL\`, mas não contém \`VOICE_ATTEMPT_ALREADY_ACTIVE\`. Esse código não está tratado no runtime implantado e pode cair no fallback HTTP 500. O teste offline que espera 409 não substitui uma requisição HTTP contra a função implantada. Nenhuma requisição de teste foi executada pela QA nesta rodada.

## Issues e aceitação

- Issue #78 permanece aberta, com os oito critérios sem marcação. Não houve teste físico de perda real de internet, retorno sem F5, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79: o comentário QA existente foi atualizado; o comentário dedicado da Engenharia foi preservado.
- Não há reviews humanas registradas nas PRs prioritárias consultadas.

## Limitações desta execução

- \`docs/RELEASE_READINESS.md\` manteve blob SHA \`7cfbd70886df42ce790c078c224b19284a632595\`, mas o connector retornou conteúdo vazio em leitura integral e por faixa. O histórico anterior e a Issue #79 foram usados como checkpoint; não se afirma nova leitura integral.
- O connector não expôs o SHA exato do tip QA antes desta gravação. A comparação confirma 203 commits à frente e 1 atrás de master; o último SHA conhecido era \`77e89b00...\`, com um commit documental posterior.
- Nenhum teste local ou manual foi executado.
- A revisão do guard #140 é inspeção estática e leitura de logs de CI, não execução de SQL.

## Gates

| Gate | Estado | Justificativa |
|---|---|---|
| RT-01 | blocked | Realtime de produção segue 67/67 private=false; broadcasts SECURITY DEFINER e grants permanecem amplos. |
| TEST-ISOLATION | in_progress | Laboratório separado e limpo, mas não é full-product TEST e mantém Default ACLs permissivas. |
| MIGRATION-PROVENANCE | blocked | #140 prova paridade de um bloco AUTH-03 candidato, não recupera os quatro SQLs históricos originais. |
| AUTH-03 | in_progress | Lab tem RPC e tabela com privilégios restritos; produção ainda não possui a estrutura. |
| ACL-STORAGE | blocked | Grants/Default ACLs amplos e dois buckets públicos persistem em produção. |
| RECONNECT | pending | Issue #78 sem critérios físicos aprovados. |
| HUMAN-REVIEW | pending | PRs prioritárias sem reviews e sem autorização explícita de release. |

## Próximos passos recomendados

1. Adicionar teste HTTP de integração para o código real \`VOICE_ATTEMPT_ALREADY_ACTIVE\` contra a Edge Function de laboratório.
2. Manter #140 Draft até revisão independente; considerar ampliar o guard para cobrir statements fora do bloco delimitado e executar a migration isolada em CI controlado.
3. Definir uma única topologia Normal e portar para ela o guard de versão, o preflight de migrations e o cutover coordenado.
4. Corrigir o dispatcher oficial Team Lite para publicar somente \`upstatus-team-lite\`, com SHA/projeto/CLI fixados.
5. Provisionar full-product TEST dedicado antes de habilitar deploy TEST.
6. Planejar hardening de Realtime, grants, Default ACLs e Storage com revisão e plano de rollback.
7. Recuperar os quatro SQLs históricos originais e fechar proveniência.
8. Executar os oito critérios físicos da Issue #78 e obter revisão humana antes de qualquer release.

**Conclusão:** \`not_ready\`. CI dos candidatos está verde, mas produção continua em runtime legado e com gates de segurança, migração, publicação e aceitação física abertos.
