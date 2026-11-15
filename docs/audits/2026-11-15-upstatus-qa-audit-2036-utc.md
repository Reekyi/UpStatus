# UpStatus — auditoria independente de qualidade

**Execução:** 2026-11-15T20:36:46.362Z  
**Escopo:** GitHub Reekyi/UpStatus; Supabase produção dlfvkawaiqduhlazsszm; projeto isolado bfpjtfqlnypisxljoxkb.  
**Parecer:** **NOT READY**.  
**Método:** inspeção read-only de refs, PRs, commits, workflows, logs de CI, fontes de Edge Functions implantadas, catálogos PostgreSQL, advisors, migrations, Realtime, Storage e logs de execução. Nenhum teste foi disparado pela auditoria; resultados de CI abaixo são execuções existentes. Nenhuma operação de escrita em produção foi realizada.

## 1. Heads e integridade do repositório

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA / PR #82 | 3ac7086d30e2c5c48f8528f97763ec6753f5bc9d |

PR #82 usa como base o commit a9288ccfcb0f308d3a587bfca624418a395be07b. A comparação com o master atual mostra QA 346 commits à frente e 1 atrás. A diferença master-only é documental; não fiz rebase nem sincronização automática.

PR #82 contém 192 arquivos alterados, todos Markdown. Continua aberta e Draft. O Validate falha por uma asserção herdada da base, não por erro de sintaxe do relatório.

A branch QA foi mantida isolada. Este relatório foi criado como arquivo novo, sem substituir docs/RELEASE_READINESS.md ou qualquer relatório anterior.

## 2. Documento de prontidão

Li docs/RELEASE_READINESS.md na branch QA. Blob SHA: 7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c. O arquivo tem 8.422 linhas adicionadas no PR #82; a última seção datada termina em 2026-11-15 06:30 UTC. Portanto, o documento-base está desatualizado em relação ao checkpoint de Engenharia de 20:08 UTC, à PR #168 e às revalidações desta execução.

O documento continua útil como histórico, mas os heads e evidências devem ser obtidos das refs e runs atuais, não das tabelas antigas.

## 3. PRs, commits e CI

| PR | HEAD | Base | Evidência exata consultada | Resultado |
|---|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | master | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | AUTOMATED PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | team-lite-official | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | AUTOMATED PASS |
| #82 QA docs | 3ac7086d30e2c5c48f8528f97763ec6753f5bc9d | master (base SHA a9288cc) | [Validate 43753937306](https://github.com/Reekyi/UpStatus/actions/runs/43753937306) | FAIL |
| #161 Normal AUTH-03 | 557814dc31bed779b84a2094358dc6b2a7e67689 | HEAD da #74 | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | AUTOMATED PASS |
| #168 Retry-After | c6de3eb29bb419e817a237487185df0df752015d | HEAD da #161 | [Validate 43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) | Validate PASS; sem Smoke |

As PRs consultadas continuam Draft e sem reviews humanas submetidas: #74, #75, #76, #82, #161 e #168.

### #74 Normal

O Smoke no HEAD exato passou com 136/136 verificações autenticadas. Os logs mostram negociação WebRTC de chamada, sala de voz e compartilhamento de tela, entrega de faixas remotas, mesh de três membros, teardown, corrida de abertura/cancelamento de sala, rate limit de sinalização (90 aceitas e 1 HTTP 429 com Retry-After de 60 segundos), concorrência de read receipts, setup enrollment e limpeza dos fixtures.

Esse run não demonstra o novo rate limit de emissão de setup-invite introduzido na #161. A proteção específica foi exercitada separadamente na #161.

### #75 e #76 Team Lite

A comparação entre os heads mostra #76 327 commits à frente de #75 e zero atrás. #76 é continuação/descendente da baseline #75, não uma candidata independente para merge separado.

O Candidate Checks da #76 passou 110/110 verificações autenticadas, incluindo chamadas, voz, tela, mesh de três participantes, concorrência e ciclo de vida de salas, rate limit de sinalização, read receipts e rate limit distribuído de setup-invite no projeto isolado.

O manifesto candidato Team Lite é 3.4.31; o runtime instalado continua 3.4.30. O resultado é CI isolado, não teste físico com Tampermonkey.

### #82

O Validate 43753937306 falhou em scripts/validate.mjs:26 com production updateURL mismatch. O PR contém somente arquivos Markdown, portanto a falha é herdada do validator da base master. Não alterei nem enfraqueci o validator.

### #161 e #168 — AUTH-03 Normal

A #161 passou Validate e Smoke no SHA exato. O Smoke confirmou 136/136 verificações autenticadas, WebRTC, rate limit de sinalização, atomicidade de read receipts, setup enrollment e o teste de concorrência do rate limit de setup-invite no laboratório.

A migration candidata cria upstatus_setup_invite_rate_limits com RLS, sem grants para anon/authenticated, e RPC SECURITY INVOKER com search_path vazio e EXECUTE somente para service_role. O handler limita cinco emissões por administrador em janela fixa de 900 segundos e falha fechado se a RPC falhar.

A #168 adiciona Retry-After: 900 e Access-Control-Expose-Headers: Retry-After à resposta 429 e amplia o teste de rota. O Validate passou no SHA exato. O valor 900 é uma espera conservadora igual à janela completa, não o tempo restante exato, pois a RPC retorna somente boolean. Não houve Smoke, HTTP real ou teste de navegador para #168.

**Bloqueio adicional da #161:** release.json não foi alterado e continua em 3.4.7, igual ao userscript instalado. O atualizador só oferece atualização quando a versão servida é maior. A candidata muda CLOUD_SERVER de beta10 para upstatus, mas, sem bump de versão, usuários existentes podem permanecer no backend antigo. Além disso, o workflow candidato da #74 exige exatamente 3.4.7; um bump exige atualizar também esse guard. Não liberar o handler/migration sem coordenar artefato, versão, distribuição, API e rollback.

## 4. Workflows e compatibilidade Normal / Team Lite

### Normal

Em master, scripts/build.mjs ainda define CLOUD_SERVER como upstatus-screen-share-3-1-1-beta10, enquanto release.json aponta scriptUrl para /functions/v1/upstatus/upstatus.user.js. Isso explica a falha do #82.

A candidata #161 altera o destino da API para upstatus e deriva o updateURL de release.json. A correção ainda não está em master.

O workflow candidato de produção da #74 é mais seguro: manual-only, master-only, checkout de SHA exato, validação do projeto dlfvkawaiqduhlazsszm e Supabase CLI 2.122.1. Porém, o guard fixa a versão 3.4.7 e o workflow publica somente upstatus; o cutover precisa alinhar a versão e o endpoint antigo beta10.

### Team Lite

O workflow oficial em team-lite-official continua inseguro para publicação:
- lê o manifesto raiz em vez de team-lite/release.json;
- usa Supabase CLI latest;
- usa SUPABASE_PROJECT_ID de secret genérico, sem validação explícita do destino;
- publica upstatus, não upstatus-team-lite.

Não despachar esse workflow.

A #76 corrige o workflow de TEST candidato: manual-only, usa vars.SUPABASE_TEST_PROJECT_ID, rejeita produção e o projeto de sinalização isolado, valida formato e igualdade do destino e fixa CLI 2.122.1. Essa proteção ainda não está na branch oficial.

### TEST

O deploy-test atual de develop ainda dispara em push, usa secret genérico SUPABASE_PROJECT_ID e CLI latest. A candidata #74/#76 remove o push automático e exige projeto TEST dedicado.

A organização possui somente dois projetos Supabase: produção e upstatus-security-test. A candidata rejeita explicitamente o projeto isolado; portanto, não existe hoje destino Full-Product TEST para esse workflow.

## 5. Supabase — projetos, migrations e Edge Functions

Os dois projetos estão ACTIVE_HEALTHY:
- Produção UpStatus, dlfvkawaiqduhlazsszm, PostgreSQL 17.11.0.002.
- Laboratório upstatus-security-test, bfpjtfqlnypisxljoxkb, PostgreSQL 17.11.0.003.

Inventário de migrations:
- Produção: 7, última 20261027155438.
- Laboratório: 39, última 20261110000612.

A branch gerenciada main de produção continua MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY.

Quatro SQLs registrados no ledger de produção retornam 404 em master e QA:
1. 20261023154754_create_upstatus_visual_config.sql
2. 20261026195855_add_chat_message_file_name.sql
3. 20261027154329_allow_chat_document_mime_types.sql
4. 20261027155438_set_upstatus_upload_limits_20mb.sql

Não reconstruí esses arquivos por inferência.

Edge Functions:
- Produção: 38/38 ACTIVE, todas com verify_jwt=false na configuração de gateway.
- Laboratório: 2/2 ACTIVE, upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- Produção: upstatus v480, upstatus-team-lite v15, beta10 v6 e upstatus-test v281.

verify_jwt=false não prova, sozinho, que todos os handlers aceitam chamadas anônimas. Os runtimes principais implementam autenticação própria por token; ainda assim, cada rota deve manter inventário explícito de autenticação e autorização. O transporte server-mediated de sinalização continua somente no laboratório; não existe função equivalente implantada em produção.

## 6. RLS, grants, SECURITY DEFINER e Storage

### Produção

- 10 tabelas em public com RLS habilitado e zero policies.
- 126 linhas de grants de anon/authenticated em tabelas public; nove tabelas concentram os grants amplos.
- 18 grants TRUNCATE para anon/authenticated.
- 120 entradas de privilégios em default ACL para esses roles nos schemas public, storage, graphql e graphql_public. Esta contagem é de privilégios expandidos via aclexplode, não de linhas brutas de pg_default_acl.
- Três funções SECURITY DEFINER de broadcast com search_path=public e EXECUTE efetivo para anon/authenticated.
- Security Advisor: 10 INFO de RLS sem policy e 3 WARN por role anon + 3 WARN por authenticated para as três funções.

RLS habilitado sem policies tende a bloquear DML por linha; a existência dos grants não prova, isoladamente, leitura ou escrita de linhas. TRUNCATE não é protegido por RLS. As funções de broadcast retornam trigger; não foi demonstrada invocação RPC direta. Os grants são desnecessários, mas o caminho concreto de exposição é o broadcast público acionado por trigger.

### Laboratório

- 18 tabelas public com RLS e zero policies.
- Zero grants diretos de anon/authenticated nas tabelas public consultadas.
- 96 entradas de privilégios em default ACL para anon/authenticated nos schemas auditados.
- Três funções de broadcast com search_path vazio e sem EXECUTE para anon/authenticated.
- Security Advisor: 18 INFO, nenhum WARN.

### Realtime

Produção:
- realtime.messages com RLS habilitado, FORCE RLS false e zero policies.
- Seis privilégios de tabela para anon/authenticated: SELECT, INSERT e UPDATE para cada role.
- Snapshot de 106 linhas, todas private=false.
- Triggers publicam no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- Clientes instalados assinam upstatus-screen-share-live-3-1-1-beta10.

A função upstatus_broadcast_messages serializa OLD/NEW completo com to_jsonb e envia db_change publicamente. Isso inclui texto e metadados de chat. Os broadcasts de remote state enviam command/result e o broadcast de usuários envia nome/status/reason/sync.

Os bundles implantados Normal 3.4.7 e Team Lite 3.4.30 criam o canal sem private:true e sem realtime.setAuth(). Team Lite verifica a sessão local ao processar alguns eventos, mas isso não autentica o remetente do broadcast. Os handlers de voz/tela ainda recebem identidade e payload de sinalização vindos do canal público.

Não foi reproduzido acesso externo nem exploração. O setting Allow public access do Dashboard não é exposto pelo conector. O achado é uma arquitetura de confiança pública confirmada por código/catálogo, não um incidente externo demonstrado.

Laboratório:
- realtime.messages sem linhas e sem policies.
- RLS habilitado, FORCE RLS false.
- Não é ambiente Full-Product TEST.

### Storage

Produção:
- chat-images: público, limite 20 MiB, 168 objetos.
- profile-images: público, limite 20 MiB, 20 objetos.
- Zero policies próprias em storage.objects.

Total: 188 objetos em buckets públicos. A política de privacidade e o isolamento por usuário continuam sem validação. A candidata #164 melhora upload assinado e avatar, mas seus testes de CI não provam o comportamento implantado em Storage de produção.

## 7. AUTH-03 e runtime efetivo

Produção não possui colunas setup_token_*, tabela upstatus_setup_invite_rate_limits ou RPC consume_upstatus_setup_invite_rate_limit. O runtime implantado ainda expõe needsSetup e aceita POST /api/setup sem convite único. O fallback nominal de papel administrativo permanece no código implantado.

O laboratório possui quatro colunas setup_token_*, a tabela de rate limit e a RPC correspondente, com execução restrita a service_role. A #161/#168 são candidatas, não produção.

## 8. Logs de disponibilidade

Na janela móvel consultada de 2026-11-14 20:29:25 UTC a 2026-11-15 20:29:25 UTC:
- Produção: dois HTTP 402, ambos GET de download.
  - Team Lite: 2026-11-14 20:55:03.083 UTC.
  - Normal: 2026-11-14 20:57:39.868 UTC.
- Laboratório: nenhum HTTP 402 no recorte e nenhum log de invocação Edge na janela.

Isso corrige contagens maiores reportadas em snapshots anteriores. A ausência de logs do laboratório não comprova recuperação nem funcionamento. O histórico contém uma falha de quota em workflow anterior: [run 43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747), com exceed_edge_functions_invocations_quota. Para produção, a causa dos dois 402 não foi identificada.

## 9. Issues e aceitação manual

- Issue #78: aberta, 0/8 critérios físicos marcados.
- Issue #79: aberta, 16 itens marcados e 19 pendentes.

Nenhum teste manual foi executado nesta auditoria. Não houve perfil Tampermonkey real, sessão Sale Smartly, perda física de internet por 10 segundos, teste de retorno sem F5, microfone/display capture com permissões reais ou interoperabilidade instalada Normal ↔ Team Lite.

Os testes de Chromium/WebRTC e integrações dos workflows são evidência automatizada em projeto isolado; não substituem a aceitação manual.

## 10. Gates e recomendação

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, 106 linhas públicas e payload OLD/NEW |
| TEST-ISOLATION | BLOCKED | Só há projeto isolado sem fixtures de produto/Storage |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs ausentes nas branches |
| AUTH-03 | BLOCKED | Produção sem setup-token/tabela/RPC; #161/#168 somente candidatas |
| ACL-STORAGE | BLOCKED | Grants/default ACLs, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8, sem teste físico |
| HUMAN-REVIEW | PENDING | PRs em Draft e sem review humana |

**Recomendação: NOT READY.**

Ordem de trabalho:
1. Corrigir o build/updateURL Normal e coordenar bump de versão com o guard do workflow.
2. Integrar #161/#168 somente após revisão, migration validada e rollout/rollback coordenados.
3. Corrigir deploy Team Lite para o manifesto próprio, projeto fixado, SHA e CLI pinada; manter deploy TEST bloqueado até existir Full-Product TEST.
4. Projetar transporte privado/autenticado de Realtime para Normal e Team Lite, minimizando payloads e validando sender/membership no servidor.
5. Revisar grants, default ACLs, funções SECURITY DEFINER e política de Storage.
6. Recuperar e validar os quatro SQLs originais; diagnosticar MIGRATIONS_FAILED.
7. Executar aceitação física de reconexão, áudio, tela e interoperabilidade instalada.
8. Obter review humana e autorização explícita antes de qualquer release.

## 11. Registro de segurança

Nenhum merge, deploy, release, publicação de userscript, migration em produção, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizada. Todas as consultas SQL foram SELECT-only. Nenhum workflow foi disparado ou repetido pela auditoria. A única escrita no GitHub nesta execução é este arquivo novo na branch QA e a atualização do comentário QA dedicado na Issue #79. O comentário da Engenharia foi preservado.


## Pós-commit: Validate da própria atualização documental

Depois que este relatório foi adicionado, a PR #82 avançou para o HEAD 552b97027d16cf957017d233dded54ef80d366ed. O Validate exato [43759075165](https://github.com/Reekyi/UpStatus/actions/runs/43759075165) terminou em FAILURE no job validate, repetindo **VALIDATION FAILED: production updateURL mismatch** em scripts/validate.mjs:26. O job não aponta erro de Markdown; a falha continua no contrato de build/validator da base master. Nenhum código de produto foi alterado para contornar o check.
