# Auditoria independente de qualidade — UpStatus
**Data:** 11/11/2026, 10:33–10:40 UTC  
**Repositório:** Reekyi/UpStatus  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Supabase isolado:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master

## Resumo executivo

**Recomendação: NOT READY.**

Esta rodada confirmou uma divergência nova de segurança entre os candidatos: Team Lite #76 implementa e executa no CI o rate limit distribuído de emissão de convites de primeiro acesso; o HEAD Normal #74 ainda não chama essa proteção. A PR Normal #130 contém uma implementação candidata, mas está divergente do HEAD atual de #74 e seu workflow registrado marcou o teste de rate limit como skipped, apesar de o arquivo de teste existir no commit.

A cadeia de publicação Normal #143 melhorou: os filtros de caminho que podiam deixar alterações fora do guard foram removidos; o contrato exige checks no SHA exato e restringe quais checks podem ser skipped. Entretanto, #143 não está baseada no HEAD atual da candidata API #142 e o manifesto Normal continua em 3.4.7, igual à versão implantada. O próprio guard exige uma versão estável superior à atual.

A produção Supabase continua com broadcasts Realtime públicos, tópico divergente dos clientes, grants amplos, RLS sem policies, Storage público, AUTH-03 ausente e histórico de migrations incompleto no Git. Nenhuma operação de escrita foi feita no Supabase.

## 1. Heads reais e relações entre branches

| Referência | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA / PR #82 | 6b0b0a0c271143764a31c7e3fcd273ae8927ca45 |
| PR #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d |
| PR #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| PR #76 Team Lite candidate | 4edfbf25476c7c751741b2e14c2c88fdc554f618 |
| PR #82 QA | 6b0b0a0c271143764a31c7e3fcd273ae8927ca45 |
| PR #128 Team Lite review provenance | ad2ceb5f04989e5a84047723431f08abf52ee7cf |
| PR #129 Team Lite legacy deploy guard | f48a2d9edf5d46aaca46d79f4b26c6fd8305c51c |
| PR #130 Normal invite rate limit | a6c32324e6fe17a0783bad09637131d7893285fd |
| PR #141 staged chat | 61d00fb8666f4ca91c5a3c52a415d877b31a10cf |
| PR #142 Normal API parity | f4b1a6dbccecf63152bf353fcaaadfcd41357e11 |
| PR #143 Normal dispatcher | 34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa |

Comparações diretas:

- QA vs master: 217 commits à frente e 1 atrás. Nenhum rebase foi feito.
- #76 vs #75: 321 commits à frente, 0 atrás; #76 é continuação da baseline.
- #130 vs #74: branches divergentes, #130 12 commits à frente e 4 atrás; merge-base 5939b57027748eb9af08327d2a8c712fd5046484.
- #143 vs HEAD atual de #142: branches divergentes, #143 13 commits à frente e 1 atrás; merge-base 6fa53bd8246862e6fd5613787e5fa9bea4cdaefa.
- #142 está 11 commits à frente de #141.

A divergência #143/#142 significa que o dispatcher não está diretamente baseado no HEAD atual da candidata API. Antes de integrar, a Engenharia deve reconciliar a ancestralidade ou demonstrar equivalência exata do runtime que será construído e publicado.

## 2. CI e workflows

### PR #74 — Normal

- Validate: [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) — SUCCESS.
- Signaling Smoke: [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) — SUCCESS.
- O job Smoke marcou como skipped a etapa “Verify distributed setup-invite issuance rate limit”.
- Inspeção do template Normal no HEAD #74 confirma que issueSetupInvite valida o administrador e emite o convite, mas não chama consume_upstatus_setup_invite_rate_limit.

Portanto, o PASS do smoke não comprova proteção contra abuso de emissão de convites no Normal.

### PR #75 — Team Lite baseline

- Candidate Checks: [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) — SUCCESS histórico.
- É evidência da baseline, não substitui a candidata atual #76.

### PR #76 — Team Lite candidate

- Candidate Checks: [42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) — SUCCESS.
- O job executou as etapas de autenticação isolada, recuperação de voz/tela, contrato HTTP do helper, full-IIFE em Chromium/Playwright, rate limit de sinalização, recibos de leitura, consumo único de convite e rate limit distribuído de emissão de convite.
- A etapa “Verify distributed setup-invite issuance rate limit” terminou SUCCESS.

O teste de rate limit usa o projeto isolado, valida 24 chamadas concorrentes (5 permitidas e 19 negadas), buckets independentes, reset da janela e limpeza das fixtures. O helper verifica o alvo Supabase antes de permitir mutação.

### PR #82 — QA

- HEAD atual: 6b0b0a0c271143764a31c7e3fcd273ae8927ca45.
- Validate: [42997652498](https://github.com/Reekyi/UpStatus/actions/runs/42997652498) — FAILURE.
- O resumo do job mostra falha na etapa “Validate build”.
- O download do log desta execução retornou BlobNotFound; portanto, não atribuo uma mensagem exata a este run. Execuções anteriores desta mesma linha registraram “production updateURL mismatch”, mas a causa textual do run atual não foi reaberta.

### PR #130 — Normal invite rate limit

- Smoke: [42741601731](https://github.com/Reekyi/UpStatus/actions/runs/42741601731) — SUCCESS geral.
- A etapa “Verify distributed setup-invite issuance rate limit” foi marcada skipped.
- O arquivo scripts/test-setup-invite-rate-limit.mjs e a migration existem no HEAD consultado; a razão do skip não foi estabelecida.
- Não foi encontrado um Validate separado para esse HEAD na consulta de runs retornada.

A PR #130 precisa ser atualizada sobre o HEAD atual #74 e o teste precisa executar sem skip antes de ser aceita.

### PR #143 — Normal dispatcher

- Offline guard: [42984657754](https://github.com/Reekyi/UpStatus/actions/runs/42984657754) — SUCCESS; deploy SKIPPED.
- Validate: [42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622) — SUCCESS.

A inspeção confirmou:
- O workflow deixou de depender de filtros de caminho restritos.
- Checks obrigatórios offline_guard e validate.
- Todos os checks precisam estar completos e vinculados ao SHA exato.
- Somente deploy e Supabase Preview podem estar skipped.
- A aprovação deve ser humana, allowlisted, não pode ser do autor e deve corresponder ao HEAD exato.
- Atestados de release-gates e aceitação física devem corresponder ao SHA exato e ter no máximo sete dias.
- Deploy exige workflow_dispatch em master, confirmação explícita, environment production e preflight read-only.
- Publicação da API beta10 antes da distribuição upstatus.

Limitações restantes:
- A configuração efetiva de required reviewers do environment production não foi consultada.
- Não há smoke pós-publicação nem compensação automática comprovada se o segundo runtime falhar.
- release.json em master e na branch #143 continua em 3.4.7, igual à versão Normal servida. O guard exige versão estável superior à versão atual.
- #143 está divergente do HEAD atual #142.

### PRs #128 e #129 — Team Lite release safety

- #128 Review Provenance: [42994078899](https://github.com/Reekyi/UpStatus/actions/runs/42994078899) — SUCCESS offline.
- #129 Legacy Deploy Safety Guard: [42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545) — SUCCESS offline.

As duas continuam candidatas não integradas à branch oficial. Não há review humana registrada nas PRs #74, #75, #76, #82, #128, #129, #130, #141, #142 ou #143.

## 3. AUTH-03: rate limit de convites e paridade Normal/Team Lite

### Team Lite #76

O handler issueSetupInvite:
- Exige administrador.
- Chama consume_upstatus_setup_invite_rate_limit.
- Usa bucket key derivado de hash da identidade administrativa.
- Limite: 5 emissões por janela de 900 segundos.
- Retorna HTTP 429 quando o limite é excedido.
- Retorna HTTP 503 se o limitador falha, fechando o fluxo.

A migration candidata:
- Cria upstatus_setup_invite_rate_limits.
- Habilita RLS sem policies para clientes.
- Revoga privilégios de PUBLIC, anon e authenticated.
- Concede acesso à tabela e EXECUTE da RPC somente a service_role.
- Define SECURITY INVOKER e search_path vazio.
- Usa atualização atômica do contador e limpeza limitada de buckets antigos.

### Normal #74

O HEAD atual não contém a chamada à RPC de rate limit. O teste correspondente é skipped no smoke.

### Normal #130

O código candidato adiciona a mesma proteção e a migration. Contudo:
- A branch está 12 commits à frente e 4 atrás de #74.
- Não está integrada ao HEAD atual.
- O run registrado marcou a etapa do teste de rate limit como skipped, apesar do harness presente.

**Conclusão:** não há paridade comprovada no HEAD atual dos produtos. A proteção Team Lite passou em CI isolado; a implementação Normal ainda precisa ser reconciliada e testada sem skip. Nenhuma dessas migrations foi aplicada à produção.

## 4. Supabase produção — dlfvkawaiqduhlazsszm

Consulta realizada em 11/11/2026, aproximadamente 10:37–10:38 UTC. PostgreSQL 17.11.

### Migrations e Edge Functions

Ledger de produção: 7 versões:
- 20261005160000
- 20261005173000
- 20261005180000
- 20261023154754
- 20261026195855
- 20261027154329
- 20261027155438

A branch gerenciada main continua em MIGRATIONS_FAILED. Os quatro SQLs históricos de outubro continuam ausentes de master. A causa específica do status MIGRATIONS_FAILED não foi exposta pela API de branches.

38 Edge Functions ativas. Funções relevantes:
- upstatus v480, verify_jwt=false.
- upstatus-team-lite v15, verify_jwt=false.
- upstatus-screen-share-3-1-1-beta10 v6, verify_jwt=false.
- upstatus-test v281, verify_jwt=false.

Não existe upstatus-signal na produção.

verify_jwt=false é metadata de gateway e não prova, por si só, ausência de autenticação: os handlers principais possuem validação customizada de sessão/token. Não classifiquei todas as funções como desprotegidas apenas por esse campo.

### Realtime

Consulta agregada em realtime.messages:
- 67 linhas.
- Todas private=false.
- Todas no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- Última linha em 2026-11-10 21:00:28 UTC.

Os clientes Normal/Team Lite, conforme inspeção direta anterior dos bundles servidos e hashes operacionais inalterados nesta consulta, assinam upstatus-screen-share-live-3-1-1-beta10. O tópico continua divergente.

As funções de broadcast:
- upstatus_broadcast_messages
- upstatus_broadcast_remote_state
- upstatus_broadcast_users

Todas são SECURITY DEFINER, retornam trigger, têm search_path=public e EXECUTE concedido a anon/authenticated. Por retornarem trigger, não há evidência de RPC direta comum invocável; o grant é desnecessário, mas o achado concreto é o broadcast público.

upstatus_broadcast_messages transmite o registro OLD/NEW completo via to_jsonb. remote_state transmite metadados de comandos/resultados. O trigger de usuários transmite campos de status.

realtime.messages tem RLS, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.

### RLS, grants e Default ACL

- 10 tabelas públicas com RLS e zero policies.
- Nove tabelas públicas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER.
- RLS não protege TRUNCATE.
- 120 entradas Default ACL para anon/authenticated, envolvendo objetos de postgres em public/storage e supabase_admin em public/graphql/graphql_public.
- Não foi executada operação destrutiva ou teste de privilégio.

### Storage

- chat-images: público, 20 MiB.
- profile-images: público, 20 MiB.
- Zero policies próprias em storage.objects.

### Chat

279 mensagens no total. Cinco são do tipo document; as cinco têm file_name NULL. Os outros tipos também têm file_name NULL, o que não significa que sejam documentos.

A API implantada ainda não persiste o nome dos documentos no caminho atual.

### AUTH-03

Produção não possui:
- upstatus_setup_invite_rate_limits.
- upstatus_signal_rate_limits.
- upstatus_signal_call_attempts.
- upstatus_signal_rooms.

O fluxo de setup continua sem o novo rate limit e sem o transporte server-mediated implantado.

## 5. Supabase isolado — bfpjtfqlnypisxljoxkb

- PostgreSQL 17.11.
- 39 migrations no ledger.
- 18 tabelas públicas com RLS e zero policies.
- Nenhum grant direto para anon/authenticated nas tabelas públicas consultadas.
- 96 entradas Default ACL ainda amplas, principalmente em storage e schemas GraphQL de supabase_admin.
- Zero mensagens em realtime.messages.
- Zero buckets Storage.
- Tabelas candidatas de rate limit de convites, rate limit de sinalização, tentativas de chamada e salas de sinalização presentes.
- Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- As três funções de broadcast têm search_path vazio, EXECUTE negado a anon/authenticated e payload reduzido a {op: TG_OP}; ainda publicam com private=false no tópico legado.

O laboratório não é um ambiente full-product TEST: não possui buckets Storage nem runtime Normal/Team Lite completo. Ele serve para testes isolados de sinalização e migrations, não para aceite integral de release.

A função de sinalização de teste v32 não contém o marcador VOICE_ATTEMPT_ALREADY_ACTIVE no código consultado. Não houve teste HTTP real nesta execução.

## 6. Issues e aceitação humana

- Issue #78 permanece aberta com 0/8 critérios físicos marcados. Queda real de internet, recuperação sem F5, reentrada em sala, novas chamadas e interoperabilidade instalada continuam MANUAL PENDING.
- Issue #79 permanece aberta. O comentário dedicado <!-- UPCONTROL:QA --> foi atualizado no mesmo comentário existente; o comentário da Engenharia não foi alterado.

## 7. Documentação e limites desta execução

O blob de docs/RELEASE_READINESS.md foi recuperado integralmente:
- Blob: 7cfbd70886df42ce790c078c224b19284a632595.
- 1.045.105 caracteres.
- 8.410 linhas.
- Última seção do documento principal: 2026-11-08 15:30 BRT / 18:30 UTC.

O documento principal está desatualizado em relação às revalidações de 11/11, que permanecem em relatórios separados. Este relatório também será criado como arquivo separado, sem substituir o documento principal.

Não foram executados:
- Testes locais.
- Testes manuais de navegador/dispositivo.
- Chamadas HTTP de upload ou signaling.
- Queda física de rede.
- Reruns de CI.
- Exploração de Realtime.

Todas as consultas Supabase foram SELECT-only. Não houve migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags, grants, policies, ACL ou fixtures.

## 8. Gates e recomendação

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, tópico divergente e ausência de autenticação privada nos clientes implantados |
| TEST-ISOLATION | BLOCKED | Laboratório isolado, mas sem ambiente full-product TEST/Storage |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs históricos ausentes e branch main em MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Estruturas ausentes na produção; rate limit Normal não integrado nem validado sem skip |
| ACL-STORAGE | BLOCKED | Grants, Default ACL e buckets públicos permanecem |
| RECONNECT | PENDING | Exige teste físico Normal/Team Lite sem F5 |
| HUMAN-REVIEW | PENDING | PRs continuam sem aprovação humana e não há autorização de release |

### Próximos passos prioritários

1. Reconciliar #130 com o HEAD atual #74 e executar o teste de rate limit no CI sem skip.
2. Alinhar #143 ao HEAD atual #142; definir versão Normal estável superior a 3.4.7.
3. Corrigir o tópico Realtime e remover broadcasts públicos de dados sensíveis, migrando para autorização server-mediated.
4. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
5. Endurecer grants, Default ACL e Storage em plano revisado e ambiente isolado.
6. Integrar AUTH-03 e sinalização autenticada em Normal e Team Lite.
7. Corrigir o workflow oficial Team Lite, que ainda aponta para a função upstatus e usa CLI latest.
8. Executar os testes físicos de reconexão e obter aprovação humana explícita.

**Veredito: NOT READY.**
