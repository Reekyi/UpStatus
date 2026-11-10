# UpStatus — auditoria independente de qualidade

**Data:** 10/11/2026, 12:34 BRT / 15:34 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Resultado:** **NOT READY — não liberar**

## Método e limites

- GitHub: inspeção read-only de branches, PRs, commits, diffs, workflows, jobs, logs, reviews, arquivos e rulesets.
- Supabase: consultas SQL exclusivamente SELECT, inventário de migrations/funções, leitura de código implantado e Security Advisor.
- A leitura integral de `docs/RELEASE_READINESS.md` foi feita pelo blob `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.410 linhas.
- Não houve execução manual no navegador/Tampermonkey, alteração de produção, SQL write, migration, deploy, merge, release, mudança de secrets/flags, publicação de userscript ou operação destrutiva.
- Os testes de integração AUTH-03 no workflow #89 usaram o projeto isolado e escreveram/removeram fixtures temporárias pelo próprio CI, com opt-in explícito. A QA apenas inspecionou o log e o estado pós-execução.

## 1. Heads e governança

| Referência | Base | HEAD | Estado |
|---|---|---|---|
| `master` | — | `9d40461babcec8eb8686c2a04be9c675df7da381` | branch sem proteção |
| `team-lite-official` | — | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | branch sem proteção |
| PR #74 Normal | master `a9288cc` | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Draft; 883 commits, 90 arquivos |
| PR #75 Team Lite baseline | team-lite-official `9065bc1` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft; 59 commits, 10 arquivos |
| PR #76 Team Lite | team-lite-official `9065bc1` | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | Draft; 378 commits, 56 arquivos |
| PR #82 QA | master `a9288cc` | `88b92b7db4cd92a18070fdf7dae12ca3c086ea8f` | Draft; 192 commits, 67 arquivos |
| PR #89 AUTH-03 | `fix/production-cutover-guard-auth-delete-wiring-20261108` `f04d18d` | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` | Draft; 37 commits, 25 arquivos |
| PR #133 Normal | base #74 `fb878537` | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` | Draft; 14 commits, 17 arquivos |
| PR #134 Team Lite | base #76 `3b1406dd` | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` | Draft; 10 commits, 7 arquivos |
| PR #135 migration recovery | master `9d40461` | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` | Draft; 1 commit, 6 arquivos |
| PR #137 cleanup AUTH-03 | base #89 antiga `4224dc31683d4b235e52d2ddcece1570294763f0` | `73cf0461b8f173277a18e1d2525e8d5ea7aa5526` | Draft; mergeable=false |

O compare entre #75 e #76 confirma que #76 é descendente direto de #75: 319 commits à frente e zero atrás. #75 deve ser tratado como baseline histórico, não como uma segunda linha independente para merge.

O compare entre o HEAD atual de #89 (`5c46eea`) e #137 (`73cf046`) retorna **diverged**: #137 tem cinco commits próprios e está sete commits atrás do HEAD atual de #89. Ambas alteram `scripts/auth-fixture-cleanup.mjs`, `scripts/test-auth-enrollment.mjs`, o workflow de cutover e `scripts/validate.mjs`. A API do helper também diverge: #89 usa `{fixtures, deleteFixture, verifyNoFixtures}`; #137 usa `{cases, deleteFixture, listRemaining}`. Não integrar #137 por cherry-pick cego; portar e harmonizar sobre o HEAD atual de #89, com check PR-triggered.

Nenhuma review humana foi encontrada nas PRs #74, #75, #76, #82, #89, #133, #134, #135 e #137. Todas permanecem Draft. A API de branches informa `protected=false` para `master` e `team-lite-official`; o endpoint de rulesets retorna lista vazia. O endpoint detalhado de branch protection não ficou acessível pela integração, mas o objeto de branch já confirma ausência de proteção nas duas branches oficiais.

## 2. CI e validação

### Candidatas atuais

- **Normal #133, HEAD `8d38036`:** [API Target Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) e [Signaling Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) passaram. O Smoke reporta 136/136 verificações autenticadas, chamadas/WebRTC, áudio, voz, compartilhamento de tela, mesh de três participantes, teardown, rate limits, convite e consumo atômico. O teste distribuído específico de emissão de convites foi skipped nesse Smoke; a cobertura foi exercitada separadamente em AUTH-03.
- **Team Lite #134, HEAD `ee246aa`:** [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) passaram. Candidate Checks reporta 16/16 não autenticadas, 110/110 autenticadas e 11/11 contratos HTTP, além de Playwright Full-IIFE, WebRTC, voz, tela, mesh, rate limits, setup por convite e cleanup.
- Esses resultados são CI no laboratório/stubs de navegador; não são testes físicos no Sale Smartly.

### AUTH-03 #89

O HEAD exato `5c46eea` passou no check PR-triggered [42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509). O log confirma Validate offline, regressão de cleanup, testes do preflight de migrations, guard de cutover, signed-upload/chat regressions e integração AUTH-03 no projeto isolado.

A integração testou tokens inválidos/expirados/reutilizados, consumo concorrente com um único vencedor, preservação de papel, não escalonamento por nome e cleanup. O runner usa PostgREST/RPC diretamente no laboratório; não houve deploy nem chamada a uma Edge Function Deno candidata. O guard terminou com **PRODUCTION CUTOVER BLOCKED**, porque produção continua na versão 3.4.7 e não possui as três migrations AUTH-03. Isso é o comportamento esperado do guard, não uma falha de teste nem autorização de release.

### Cleanup #137

O workflow [42821890896](https://github.com/Reekyi/UpStatus/actions/runs/42821890896) passou em evento push no HEAD `73cf046`, mas `fetch_commit_workflow_runs` não encontrou check PR-triggered nesse HEAD. A PR está `mergeable=false` e baseada no SHA antigo `4224dc3`, não no HEAD atual de #89. Portanto, o PASS isolado não valida a integração da limpeza com o código atual de #89.

### QA #82 e migration recovery #135

- QA #82, HEAD `88b92b7`: [Validate 42836637081](https://github.com/Reekyi/UpStatus/actions/runs/42836637081) falhou em `production updateURL mismatch`, `scripts/validate.mjs:26`.
- #135, HEAD `98e96cf`: [Validate 42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) falhou na mesma asserção.
- O log de #82 confirma que o build produziu PROD/TEST 3.4.7 e falhou antes das etapas posteriores. Não relaxar o validator.

## 3. Divergência entre as linhas de release Normal

Foi confirmado um conflito de arquitetura entre duas candidatas que passaram em CI:

- A linha AUTH-03 #89 mantém `PROD_FUNCTION=upstatus` e `PROD_API_FUNCTION=upstatus-screen-share-3-1-1-beta10`. Seu userscript distribui por `upstatus`, mas chama a API beta10. O workflow candidato publica beta10 primeiro e depois `upstatus`; o manifesto e o guard exigem os dois runtimes.
- A linha Normal #133, portando a correção #132, deriva `CLOUD_SERVER` de `PROD_FUNCTION` e aponta a API diretamente para `upstatus`. Seu build/manifest não carrega a mesma separação `productionApiFunction` do guard #89.

As duas soluções são coerentes isoladamente com seus respectivos contratos, mas **não formam automaticamente uma única candidata de release**. Antes de integrar, a Engenharia precisa escolher e documentar uma topologia única (ou um plano explícito de compatibilidade transitória), atualizar build-manifest, guard, ordem de deploy e testes. Não mesclar #89 e #133 sem essa reconciliação.

## 4. Build e validator da QA

No HEAD QA, `release.json` mantém versão `3.4.7` e URL `/functions/v1/upstatus/upstatus.user.js`. O `scripts/validate.mjs` exige esse caminho.

O `scripts/build.mjs` da QA ainda define o CLOUD_SERVER Normal como `upstatus-screen-share-3-1-1-beta10` e deriva o updateURL desse cloud, gerando beta10 e falhando na asserção. O build da #133 já deriva o cloud da função Normal `upstatus`, eliminando a divergência no candidato.

Outra diferença de segurança do build: a versão QA ainda executa `fs.rmSync(dir,{recursive:true,force:true})` na pasta da Edge Function e remove `dist` recursivamente. A #89 introduz preservação de sidecars rastreados e teste próprio. Isso não apagou produção, mas a versão de build herdada pode remover arquivos auxiliares do workspace durante a geração. Portar a proteção de sidecars sem enfraquecer a validação.

## 5. Produção Supabase — fotografia read-only

Projeto produção `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, região `us-west-2`, Postgres 17.11.0.002. Inventário: 7 migrations, última `20261027155438`. Branch gerenciada `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

Projeto laboratório `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, região `sa-east-1`, 39 migrations, última `20261110000612`.

### Edge Functions e artefatos implantados

Produção lista 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false` no metadata. Isso, isoladamente, não prova ausência de autenticação: os runtimes principais usam autenticação própria por token. Os slugs principais são:

- `upstatus` v480;
- `upstatus-team-lite` v15;
- `upstatus-screen-share-3-1-1-beta10` v6;
- `upstatus-test` v281, dentro do mesmo projeto de produção.

O laboratório tem duas funções: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não existe `upstatus-signal` implantada em produção.

Os userscripts foram extraídos dos bundles implantados e inspecionados:

- Normal 3.4.7: `@updateURL` aponta para `/functions/v1/upstatus/upstatus.user.js`, mas `CLOUD_SERVER` aponta para `upstatus-screen-share-3-1-1-beta10`; o tópico é `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite 3.4.30: API aponta corretamente para `upstatus-team-lite`, mas o tópico Realtime continua `upstatus-screen-share-live-3-1-1-beta10`.
- Screen Share beta10 v6 embute um userscript identificado como beta8, com updateURL, API e tópico beta8.

Os três handlers principais ainda encaminham `POST /api/setup` para `login(req,true)`. Não há no projeto de produção colunas `setup_token_*`, tabelas de rate limit AUTH-03 ou RPCs `consume_upstatus_setup_invite*`/rate limit. O laboratório contém as quatro colunas de token, tabelas de convite/rate limit e RPCs de consumo.

### Realtime e SECURITY DEFINER

A consulta atual encontrou 58 mensagens no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, todas `private=false`:

| Evento | Registros |
|---|---:|
| user_status | 26 |
| db_change | 20 |
| remote_command | 6 |
| remote_result | 6 |

Janela observada: 09/11 12:02 UTC a 10/11 14:40 UTC. Isso é o total persistido consultado, não uma contagem de 24 horas.

Os três triggers de broadcast ativos chamam `realtime.send(..., false)` no tópico acima. `upstatus_broadcast_messages` serializa a linha inteira com `to_jsonb(OLD/NEW)`. As três funções são `SECURITY DEFINER`, `search_path=public`, retornam `trigger` e têm EXECUTE para PUBLIC, anon, authenticated e service_role. O Security Advisor mostra três WARN para anon e três para authenticated. Como são funções que retornam trigger, não foi demonstrada invocação direta bem-sucedida via RPC; o achado confirmado é o broadcast público e o excesso de ACL.

Os bundles implantados não usam `private:true` nem `realtime.setAuth()`. Os tópicos dos clientes (beta10/beta8) não coincidem com o tópico novo dos triggers. A correção de proveniência em #133/#134 continua com o transporte desabilitado por padrão (`enabled=false` no adapter) e depende de endpoint server-mediated de produção ainda inexistente.

### RLS, grants, Default ACL e Storage

Produção:

- 10 tabelas públicas com RLS e zero policies.
- Nove dessas tabelas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER (também aparece MAINTAIN na ACL de default).
- 24 registros Default ACL; defaults amplos para anon/authenticated em objetos futuros de postgres/supabase_admin nos schemas public, storage, graphql e graphql_public.
- `realtime.messages`: grants SELECT/INSERT/UPDATE para anon e authenticated; sem policies próprias na consulta.
- `storage.objects`: grants DELETE/INSERT/SELECT/UPDATE para anon e authenticated; zero policies em storage.
- Buckets `chat-images` e `profile-images` públicos, 20 MiB cada.

Laboratório:

- 18 tabelas públicas com RLS, zero policies e nenhum grant direto de tabela para anon/authenticated.
- Três funções broadcast de trigger continuam SECURITY DEFINER, mas no laboratório têm `search_path=""` e ACL restrita a postgres/service_role.
- Zero mensagens Realtime e nenhum bucket Storage.
- 25 registros Default ACL; ainda existem defaults permissivos para anon/authenticated em objetos futuros criados por supabase_admin nos schemas public/graphql/graphql_public e por postgres em storage (96 itens de privilégio para anon/authenticated no recorte consultado).

O laboratório está isolado e limpo, mas o hardening das permissões padrão ainda não está completo. A ausência de policies no laboratório é intencional para tabelas backend-owned e deve continuar acompanhada de grants restritos.

## 6. Issues e testes manuais

- Issue #78 continua OPEN, com 0/8 critérios físicos marcados. Os critérios exigem queda real de internet durante voz, retorno sem F5, reentrada e novas chamadas em Normal/Team Lite, sem peers/áudio/polling duplicados. Nenhum teste físico foi realizado nesta auditoria.
- Issue #79 mantém um comentário dedicado de QA e um da Engenharia; o comentário da Engenharia foi preservado.
- Nenhuma review humana foi encontrada nas PRs examinadas.

## 7. Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | **blocked** | 58/58 mensagens públicas, tópico divergente, sem endpoint server-mediated de produção |
| TEST-ISOLATION | **in_progress** | laboratório separado e CI AUTH-03 passou; falta ambiente full-product TEST independente |
| MIGRATION-PROVENANCE | **blocked** | quatro SQLs originais ausentes; PR #135 contém statements do ledger, não arquivos originais byte a byte |
| AUTH-03 | **in_progress** | integração passou no laboratório; produção sem colunas/tabelas/RPCs e guard bloqueia cutover |
| ACL-STORAGE | **blocked** | grants/Default ACL/Storage públicos persistem |
| RECONNECT | **pending** | Issue #78 0/8, sem teste físico |
| HUMAN-REVIEW | **pending** | PRs Draft, sem reviews e sem autorização explícita |

## 8. Próximas ações técnicas

1. Reconciliar a topologia de API/deploy Normal entre #89 e #133; atualizar manifesto, guard e workflow em uma única candidata coerente.
2. Portar #137 sobre o HEAD atual de #89, harmonizar a API de cleanup e exigir check PR-triggered.
3. Corrigir a build/validator da QA com a mesma fonte de verdade para PROD_FUNCTION, updateURL e API; preservar sidecars.
4. Corrigir o workflow Team Lite oficial para o slug `upstatus-team-lite`, checkout SHA exato, verificação de projeto/organização, CLI pinada, preflight de migrations e aprovação.
5. Implementar e validar o transporte server-mediated privado no laboratório; planejar cutover sem listeners públicos sensíveis e sem habilitar flag antes do endpoint de produção existir.
6. Hardening de grants, Default ACL, funções trigger-only e Storage; validar com objetos futuros no laboratório.
7. Recuperar/validar proveniência dos quatro SQLs originais e diagnosticar `MIGRATIONS_FAILED`; não aplicar migrations sem revisão e autorização.
8. Obter review humana e somente depois preparar a aceitação física da Issue #78.

## Veredito

**NOT READY.** CI das candidatas Normal/Team Lite e integração AUTH-03 isolada passaram, mas há divergência entre as topologias de release Normal, workflow Team Lite oficial incorreto, QA validator vermelho, Realtime público, permissões amplas, migrations ausentes em produção e aceitação física pendente.

Nenhuma alteração de produção foi realizada. Nenhum SQL write, migration, deploy, merge, release, mudança de secret/flag/role/grant/policy/ACL ou publicação de userscript ocorreu. As únicas escritas do QA são o relatório documental nesta branch dedicada e a atualização do comentário QA na Issue #79.
