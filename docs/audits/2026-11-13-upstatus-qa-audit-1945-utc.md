# Auditoria independente de qualidade do UpStatus
**Data:** 2026-11-13, fechamento aproximado 19:45 UTC  
**Repositório:** Reekyi/UpStatus  
**Supabase:** produção dlfvkawaiqduhlazsszm; laboratório bfpjtfqlnypisxljoxkb  
**Decisão:** **NOT READY**

## Escopo e método

Foram reconsultados os heads reais das branches e PRs, metadados e diffs de #74, #75, #76, #82, #161, #162 e #163, workflows e logs dos checks associados, Issues #78 e #79, código-fonte das funções Edge implantadas, inventário de projetos/funções/migrations, advisors e catálogos PostgreSQL.

O arquivo docs/RELEASE_READINESS.md foi lido integralmente via blob: 1.045.105 bytes e 8.410 linhas. Seu último checkpoint técnico continua em 2026-11-08 15:30 BRT / 18:30 UTC. Ele é histórico; esta execução foi registrada em arquivo novo, sem substituir o checkpoint principal.

Classificação usada:
- **CI PASS/FAIL:** resultado de workflow no SHA indicado.
- **INSPEÇÃO DE CÓDIGO/CATÁLOGO:** leitura estática ou consulta SELECT, sem comprovação de execução real.
- **MANUAL PENDING:** exige navegador instalado, dispositivo ou aceitação humana.
- **BLOCKED:** dependência ou risco impede avançar com segurança.

Não foram executados testes locais, não foram disparados workflows, não houve teste manual e não foram alteradas fixtures. Logs de CI existentes foram inspecionados, não reexecutados.

## Heads reais e integridade

| Referência | HEAD curto | Commits / arquivos | Estado |
|---|---|---:|---|
| master | 9d40461 | — | base atual |
| team-lite-official | 9065bc1 | — | branch oficial |
| QA / #82 | 62d61b4 | 287 commits / 143 arquivos | open, Draft |
| #74 Normal | dcaf6a0 | 887 / 90 | open, Draft |
| #75 Team Lite baseline | 7bbf9b9 | 59 / 10 | open, Draft |
| #76 Team Lite | 83a6cc4 | 386 / 57 | open, Draft |
| #161 Normal | 557814d | 12 / 10 | open, Draft |
| #162 voz | fa8c9fa | 8 / 7 | open, Draft, mergeable=false |
| #163 voz reconciliada | 00f357b | 7 / 6 | open, Draft |

A comparação atual QA...master informa 287 commits à frente e 1 atrás. A branch QA e o HEAD da #82 apontam para 62d61b4. A comparação da #163 com a base atual da #161 informa 7 commits à frente e zero atrás. A #162 original está divergida: 8 à frente e 2 atrás da base atual; não deve ser tratada como a linha reconciliada.

Nenhuma das sete PRs consultadas possui review registrada. Todas permanecem abertas e Draft. CI verde não equivale a aprovação humana.

## CI por HEAD exato

| PR | Workflow / run | Resultado | Interpretação |
|---|---|---|---|
| #74 | Validate 43376770142; Smoke 43376770200 | **PASS / PASS** | candidato Normal da branch-base |
| #75 | Candidate Checks 41674353127 | **PASS histórico** | baseline antigo, substituído pela linha #76 |
| #76 | Candidate Checks 43363871881 | **PASS** | 110/110 autenticados e 16/16 não autenticados |
| #82 | Validate 43484604954 | **FAIL** | production updateURL mismatch |
| #161 | Validate 43479685384; Smoke 43479685445 | **PASS / PASS** | ambos no mesmo SHA 557814d |
| #162 | Validate 43459219365; Contract 43459218841 | **PASS / PASS** | evidência pertence à branch antiga e divergida |
| #163 | Validate 43488822143; Contract 43488822237 | **PASS / PASS** | ambos no SHA reconciliado 00f357b |

### Normal #161

O log do Validate confirma o guard de destino TEST, build completo e regressões de chat, upload, updater e sinalização. O Smoke confirma 136/136 verificações autenticadas, chamadas WebRTC com áudio remoto, voz, vídeo de tela, mesh autenticado de três participantes, rate limit distribuído de sinalização, recibos atômicos, consumo único de convite, rate limit distribuído de emissão de convites e limpeza das fixtures.

A validação usou o projeto isolado bfpjtfqlnypisxljoxkb. Não foi teste contra produção nem teste físico Tampermonkey.

Evidências:
- https://github.com/Reekyi/UpStatus/actions/runs/43479685384
- https://github.com/Reekyi/UpStatus/actions/runs/43479685445

### Team Lite #76

O log confirma 110/110 verificações autenticadas, 16/16 não autenticadas, negociação de chamada/voz/tela no Chromium, mesh de três participantes, rate limits, recibos, convite de primeiro acesso, rate limit de emissão e cleanup. Também passou verificações do userscript, portais Lucca/Ycaro, isolamento de sessão e updater.

Evidência: https://github.com/Reekyi/UpStatus/actions/runs/43363871881

### Contrato de voz #163

A Engenharia reconciliou a correção sobre o HEAD atual da #161 sem reescrever a #162. A comparação confirma 7 commits à frente, zero atrás e seis arquivos alterados. O Validate e o workflow dedicado passaram no SHA 00f357b.

O teste importa o mesmo helper usado pelo endpoint e confirma o mapeamento de VOICE_ATTEMPT_ALREADY_ACTIVE para HTTP 409. **Limite:** ele constrói objetos Response localmente; não envia uma requisição HTTP real à Edge Function implantada. O workflow é offline, sem secrets e sem acesso ao Supabase. A função de laboratório continua v32.

Evidências:
- https://github.com/Reekyi/UpStatus/pull/163
- https://github.com/Reekyi/UpStatus/actions/runs/43488822143
- https://github.com/Reekyi/UpStatus/actions/runs/43488822237

### QA #82

O Validate no HEAD 62d61b4 falhou em scripts/validate.mjs:26, após construir 3.4.7 / TEST 3.4.7, com production updateURL mismatch. A branch QA contém documentação, não uma correção do validator. A falha é herdada e continua aberta.

Evidência: https://github.com/Reekyi/UpStatus/actions/runs/43484604954

## Release e workflows

### Normal

Na branch candidata #161, .github/workflows/deploy-production.yml:
- restringe execução a master;
- confere checkout SHA e projeto dlfvkawaiqduhlazsszm;
- exige SUPABASE_ACCESS_TOKEN;
- fixa Supabase CLI 2.122.1;
- publica somente a função upstatus.

Há, porém, uma contradição de versão:
- release.json permanece em 3.4.7;
- scripts/build.mjs exige versão estritamente superior à versão atual para sincronizar o artefato raiz;
- deploy-production.yml rejeita qualquer versão diferente de 3.4.7.

Assim, manter 3.4.7 impede a sincronização do artefato raiz; incrementar a versão faz o guard do deploy rejeitar a candidata. O caminho de release precisa ser reconciliado antes de qualquer publicação. Nenhum workflow foi despachado.

### Team Lite oficial

O workflow .github/workflows/deploy-production.yml em team-lite-official ainda executa supabase functions deploy upstatus, usa CLI latest e não confere projeto/SHA aprovado. O destino de Team Lite deveria ser upstatus-team-lite. **Não despachar esse workflow.**

O deploy-test.yml herdado também usa SUPABASE_PROJECT_ID genérico, CLI latest e gatilho push em develop, sem prova de destino full-product TEST independente. Não despachar.

## Supabase: projetos e Edge Functions

A organização possui somente dois projetos:
- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe projeto full-product TEST independente.

Inventário:
- Produção: 38 Edge Functions ativas; upstatus v480, upstatus-team-lite v15, upstatus-test v281 e 12 funções com prefixo upstatus-test.
- Laboratório: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- Não existe upstatus-signal em produção.

A função v32 do laboratório mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE no mapeamento. Esse erro cai no fallback 500 no runtime v32. A #163 corrige o código versionado, não o runtime. Não houve deploy de teste.

## AUTH-03, identidade e rate limit

Consulta read-only de produção:
- 5 usuários;
- zero password_hash vazio;
- zero role vazia;
- zero nomes duplicados no conjunto atual;
- setup invites: tabela ausente;
- consume_upstatus_setup_invite: ausente;
- setup-invite rate limit: tabela e RPC ausentes;
- login-rate-limit: nenhum objeto encontrado;
- sessões e perfis continuam com user_name, sem user_id.

Inspeção do código implantado:
- Normal v480 exige senha de seis caracteres também no login;
- Team Lite v15 aceita quatro caracteres;
- ambos permitem primeiro setup sem setupToken;
- ambos mantêm fallback de role administrativa por nome quando a role está vazia.

Inspeção das candidatas #161 e #76:
- setup exige token hexadecimal de 256 bits, consumido atomicamente;
- setup exige seis caracteres e login aceita quatro;
- emissão de convite é limitada a cinco por administrador por 15 minutos, com 429 e fail-closed 503;
- não foi encontrado rate limit específico para tentativas de login.

A diferença de senha instalada pode impedir que contas Team Lite com senha de quatro ou cinco caracteres entrem no Normal. O fluxo de convite candidato é melhoria real, mas ainda não está em produção. A identidade por nome continua sendo dívida de segurança e integridade.

## Realtime, RLS, grants e SECURITY DEFINER

SELECT em realtime.messages retornou 104 mensagens nos últimos 14 dias, todas private=false:
- 70 user_status;
- 26 db_change;
- 4 remote_command;
- 4 remote_result.

A tabela pai realtime.messages:
- RLS habilitado;
- FORCE RLS desabilitado;
- 7 partições;
- zero policies;
- anon e authenticated possuem SELECT, INSERT e UPDATE.

A função upstatus_broadcast_messages envia a linha completa com to_jsonb(OLD/NEW) no evento db_change, private=false. As três funções de broadcast são SECURITY DEFINER, usam search_path=public e têm EXECUTE para anon/authenticated. As três retornam trigger; não foi demonstrada exploração direta por RPC PostgREST comum. Os grants continuam desnecessários e o payload público de messages expõe mais dados do que um hint de invalidação.

Outros achados de catálogo:
- 10 tabelas public com RLS habilitado e sem policies;
- 9 tabelas public concedem privilégios amplos a anon e authenticated;
- 18 concessões TRUNCATE no conjunto dessas tabelas;
- 120 entradas Default ACL para papéis clientes, distribuídas entre public, storage, graphql e graphql_public, com privilégios de tabelas, funções e sequências.

RLS sem policies nega acesso normal às linhas, mas não torna os grants amplos desejáveis; TRUNCATE não é controlado por RLS. Não foi demonstrado que um cliente conseguiu executar TRUNCATE via API.

## Storage

Produção tem dois buckets públicos e zero policies próprias em storage.objects:
- chat-images: 168 objetos, limite 20 MiB;
- profile-images: 20 objetos, limite 20 MiB.

Os tipos MIME de chat incluem imagens, áudio/vídeo e documentos. A visibilidade pública e ausência de policies próprias permanecem bloqueadores de ACL-STORAGE. Não foi realizado upload ou download de teste.

## Migrations e proveniência

Ledger:
- produção: 7 migrations;
- laboratório: 39 migrations.

O diretório canônico supabase/migrations em master contém somente três arquivos:
- 20261005160000_upstatus_cloud.sql
- 20261005173000_remote_realtime.sql
- 20261005180000_client_presence.sql

Quatro migrations aplicadas em produção continuam sem suas fontes SQL originais no diretório canônico. Não se deve reconstruir esses arquivos a partir do schema e apresentá-los como originais.

A branch gerenciada Supabase main está MIGRATIONS_FAILED; preview_project_status está ACTIVE_HEALTHY.

## Issues e aceitação física

Issue #78 permanece aberta. Seus oito critérios físicos continuam sem aprovação: reconexão Normal sem F5, reconexão Team Lite sem F5, reentrada em sala, novas chamadas, estabilidade de áudio/peers/pollers, continuidade dos participantes, regressões automatizadas completas e teste manual no navegador. Nenhum teste físico foi executado nesta rodada.

Issue #79 mantém 16 itens marcados e 19 pendentes no corpo, total 35. Isso é estado histórico do checklist, não percentual de prontidão.

## Gates e decisão

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, sem autorização privada |
| TEST-ISOLATION | BLOCKED | só há produção e laboratório de signaling/auth |
| MIGRATION-PROVENANCE | BLOCKED | quatro SQLs originais ausentes; main MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | produção sem setup token/rate limit e sem rate limit de login |
| ACL-STORAGE | BLOCKED | grants/Default ACL e Storage público sem policies |
| RECONNECT | PENDING | Issue #78 continua 0/8; falta teste físico de Ricardo |
| HUMAN-REVIEW | PENDING | nenhuma das PRs auditadas tem review humana; sem autorização de release |

Próximas prioridades:
1. Reconciliar o guard de versão Normal com o build e a versão estável a aprovar.
2. Corrigir o workflow Team Lite para o slug correto, CLI pinada, projeto/SHA exatos e preflight.
3. Adicionar rate limit de tentativas de login e migrar sessões/perfis para users.id.
4. Tornar Realtime privado/autenticado e remover payloads completos de mensagens.
5. Provisionar full-product TEST somente após autorização, organização e custo conhecidos.
6. Recuperar/provar as quatro fontes SQL originais e resolver MIGRATIONS_FAILED.
7. Endurecer grants, Default ACL, SECURITY DEFINER e Storage.
8. Executar os testes físicos da #78 e obter review/aprovação humana do SHA final.

## Segurança desta execução

Produção e laboratório foram consultados somente por SELECT, catálogos, inventários e leitura de funções. Não houve SQL write, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL, criação de projeto, teste manual ou dispatch de workflow.

A única escrita desta execução será um novo relatório documental na branch QA dedicada. docs/RELEASE_READINESS.md, branches de Engenharia e comentário da Engenharia serão preservados.
