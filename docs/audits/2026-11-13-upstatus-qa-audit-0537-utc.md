# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-13T05:37:02.242Z  
**Repositório:** Reekyi/UpStatus  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**HEAD QA antes deste append:** 8049417a05950f93bd1b2d88dd11fa77e3846be8  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Supabase laboratório:** bfpjtfqlnypisxljoxkb

## Veredito

**NOT READY.** A #76 tem evidência automatizada forte no HEAD atual, mas o transporte autenticado de voz/tela continua opt-in e sem endpoint de produção. O runtime TEST instalado ainda usa produção. O workflow oficial Team Lite continua apontando para a função Normal. Não há aceitação física nem aprovação humana.

## Correções de classificação desta auditoria

1. O HEAD real da QA é 8049417. As respostas anteriores citaram SHAs posteriores que não são o HEAD da branch auditada; os caminhos de relatório 0500 e 0527 também retornaram 404. O último relatório existente antes desta execução é o de 04:43 UTC. Este documento corrige o registro com evidência obtida diretamente do GitHub.
2. Durante a inspeção inicial do candidato Team Lite foi consultado o template comum, não o arquivo específico do produto. A revisão do arquivo correto, team-lite/upstatus-team-lite.user.js, confirma que o candidato #76 trata remote_command público apenas como aviso para consulta autenticada, em linha com releaseNotes. Esse achado inicial foi descartado. A lacuna real restante é a sinalização de chamada/voz/tela por broadcast público quando a flag de transporte autenticado está desligada.
3. O teste da #158 não falhou na regra owner+role. Os logs mostram que essas assertions passaram antes da falha em anexos staged.

## Heads e integridade das branches

| Referência | HEAD confirmado |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA | 8049417a05950f93bd1b2d88dd11fa77e3846be8 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

A QA está 270 commits à frente e 1 atrás de master. O merge base é a9288ccfcb0f308d3a587bfca624418a395be07b. Os 129 arquivos divergentes são documentais. O único commit de master que falta na QA é docs/checkpoints/2026-11-08-production-migration-history-preflight.md.

O arquivo docs/RELEASE_READINESS.md foi lido integralmente: 1.045.105 bytes e 8.410 linhas. O último checkpoint interno continua em 08/11/2026 às 18:30 UTC. O documento principal não foi alterado.

## PRs solicitadas e evidência de CI

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d | Draft, 883 commits, 90 arquivos, sem reviews | Validate e Smoke SUCCESS |
| #75 Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Draft, 59 commits, 10 arquivos, sem reviews | PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | Draft, 386 commits, 57 arquivos, sem reviews | Candidate Checks SUCCESS |
| #82 QA | 8049417a05950f93bd1b2d88dd11fa77e3846be8 | Draft, 270 commits, 129 arquivos, sem reviews | Validate FAIL |
| #158 Normal updater/chat | 25775192ed5be4197581b55123cd4f2f78386c51 | Draft, 10 commits, 5 arquivos | Validate FAIL |

### #74 Normal

- [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) concluíram SUCCESS no HEAD fb878537.
- Smoke: 19/19 verificações não autenticadas e 136/136 autenticadas.
- O log confirma chamada, voz e compartilhamento via WebRTC no navegador automatizado, teardown, mesh de três participantes e rate limit de 90 aceitas + 1 rejeitada com HTTP 429 e Retry-After 60s.
- Duas etapas de setup-invite ficaram SKIPPED: syntax-check do harness e teste distribuído de emissão. A #76 cobre essas etapas.
- A base da PR está um commit documental atrás do master atual. O merge ref atualizado ainda precisa de Validate e Smoke.
- release.json permanece 3.4.7, igual ao Normal instalado. Não é incremento de versão para uma nova release.

### #75 e #76 Team Lite

- #75 é baseline histórico; não deve ser somada como implementação independente à #76.
- [Candidate Checks #76, run 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) passou no HEAD exato 83a6cc4.
- O job concluiu todos os 21 passos: guard do build TEST, isolamento de mutações, adapter de sinalização, enrollment, recuperação de voz/tela, helper HTTP, endpoint autenticado no laboratório, Playwright full-IIFE, integração/browser, concorrência de rate limit, recibos atômicos, consumo de convite e layout de migrations.
- Logs: 16/16 checks não autenticados e 110/110 autenticados.
- A evidência é CI automatizado contra o laboratório isolado; não substitui teste físico nem prova que a sinalização autenticada esteja ativa em produção.
- A release candidata indica buildVersion 3.4.31; o Team Lite instalado continua 3.4.30.

### #82 QA

- A PR é documental; os 129 arquivos divergentes da QA são documentação.
- [Validate 43360054757](https://github.com/Reekyi/UpStatus/actions/runs/43360054757) falhou em production updateURL mismatch, em scripts/validate.mjs:26.
- A falha é herdada do contrato de build da base; não é uma falha causada pelo conteúdo documental.
- O HEAD real da QA continua 8049417. Não há evidência de commits posteriores citados em respostas anteriores.

### #158

- [Validate 43363857861](https://github.com/Reekyi/UpStatus/actions/runs/43363857861) falhou em scripts/chat-regression.test.mjs:110: files are staged instead of uploaded immediately.
- As assertions anteriores de owner + role para limpar o chat passaram. A falha é uma incompatibilidade de base: #158 parte de master, que não contém a implementação de anexos staged existente na #74.
- O build TEST da #158 fixa o mesmo project ref de produção dlfvkawaiqduhlazsszm. O namespace/prefixo local diferenciado não isola API, Storage ou Realtime.
- Não tratar #158 como trilha independente de integração. Rebase/coordenação com a #74 é necessário antes de revalidar.

## Compatibilidade Normal / Team Lite e runtimes instalados

| Produto instalado | Runtime | Versão | Namespace / armazenamento | Endpoint / tópico |
|---|---:|---|---|---|
| Normal | v480 | 3.4.7 | upseller / upstatus_screen_share_beta8_ | API beta10 / tópico beta10 |
| Team Lite | v15 | 3.4.30 | upseller-team-lite / upstatus_team_lite_ | API upstatus-team-lite / tópico beta10 |
| TEST | v281 | 3.3.28 | upseller / upstatus_screen_share_beta8_ | API beta10 / tópico beta10 |

A decodificação dos bundles servidos pelas Edge Functions confirma:

- Normal e TEST compartilham namespace e prefixo GM. TEST também usa o mesmo projeto, API e tópico de produção.
- TEST v281 ainda está ativo dentro do projeto de produção. Existem 12 funções com prefixo upstatus-test no inventário de produção.
- Normal e TEST instalados executam remote_command recebido por broadcast. Team Lite instalado exige uma sessão local autenticada, mas ainda executa o comando recebido; a origem do broadcast não é autenticada pelo Realtime.
- Os candidatos #74 e #76 mudam remote_command para um aviso que apenas dispara consulta autenticada ao backend.
- O candidato #76 preserva o prefixo local Team Lite upstatus_team_lite_.
- Os candidatos Normal e Team Lite usam o tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, alinhando-se ao tópico dos triggers. Os clientes instalados continuam no tópico beta10.

### Transporte autenticado ainda incompleto

Nos candidatos Normal e Team Lite:

- signaling_transport_enabled é opt-in e default false.
- O endpoint é obtido de configuração local e não tem valor de produção por padrão.
- call_signal continua sendo recebido pelo canal público quando a flag está desligada.
- Eventos de voz e compartilhamento de tela continuam usando broadcast público quando a flag está desligada.
- Quando a flag está ligada, o código passa a rejeitar sinais sem marcação de transporte autenticado, mas não existe endpoint server-mediated equivalente implantado em produção.
- Nenhum cliente usa canal Realtime private:true com setAuth().

Portanto, RT-01 permanece bloqueado. A candidata melhora a migração, mas não deve ser interpretada como transporte privado já ativo.

## Workflows de publicação

### Normal (#74)

O workflow candidato de produção é manual, exige branch master, checkout do SHA exato, projeto esperado e token, fixa Supabase CLI 2.122.1 e trava a versão estável em 3.4.7. Ele publica somente a função upstatus; não coordena a implantação de um endpoint de sinalização autenticada.

O workflow TEST é manual, exige vars.SUPABASE_TEST_PROJECT_ID, rejeita o projeto de produção e o laboratório de sinalização, valida que build e deploy usam o mesmo projeto e falha fechado se não houver projeto dedicado. Ele faz checkout de develop.

### Team Lite oficial

O workflow em team-lite-official/.github/workflows/deploy-production.yml continua:

- workflow_dispatch;
- Supabase CLI latest;
- secrets compartilhados SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_ID;
- sem validação equivalente de projeto/SHA;
- comando supabase functions deploy upstatus.

O destino correto é upstatus-team-lite. Não despachar o workflow atual: ele pode publicar o código Team Lite na função Normal.

O workflow TEST oficial também possui gatilho push em develop e publica upstatus-test no projeto vindo de SUPABASE_PROJECT_ID. A candidata #76 contém um workflow TEST manual com guard de projeto, mas a produção oficial não foi corrigida.

## Supabase — projetos e Edge Functions

A organização tem somente dois projetos ativos:

1. UpStatus produção: dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY.
2. upstatus-security-test: bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY.

Não existe projeto full-product TEST independente.

Produção tem 38 Edge Functions ACTIVE, todas com verify_jwt=false no gateway. Isso não prova ausência de autenticação: as funções precisam validar o token próprio da aplicação em cada rota. Versões relevantes:

- upstatus v480;
- upstatus-team-lite v15;
- upstatus-test v281;
- upstatus-screen-share-3-1-1-beta10 v6;
- não existe função upstatus-signal em produção;
- 12 funções com prefixo upstatus-test permanecem ACTIVE.

O laboratório tem duas funções: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

## Realtime e triggers

Consulta SELECT-only em realtime.messages:

| Evento | private=false |
|---|---:|
| user_status | 67 |
| db_change | 46 |
| remote_command | 6 |
| remote_result | 6 |
| **Total** | **125** |

Todas as 125 mensagens estão no tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, com private=false. Os bundles instalados assinam beta10; os candidatos voltam ao tópico legado.

Os três triggers instalados chamam funções SECURITY DEFINER com search_path=public:

- upstatus_broadcast_messages: transmite a linha OLD/NEW completa via to_jsonb.
- upstatus_broadcast_remote_state: transmite campos de comando e resultado.
- upstatus_broadcast_users: transmite nome, status, motivo, updated_at e sync.

As três funções têm EXECUTE efetivo para anon e authenticated. O Security Advisor emite três WARN para anon e três para authenticated. O Advisor identifica chamadas RPC em PostgREST; esta auditoria não executou RPC nem tentou explorar a chamada. O risco concreto observado é a combinação de SECURITY DEFINER, search_path público e broadcasts private=false com payload de estado.

O laboratório tem zero mensagens Realtime. Seus triggers usam search_path vazio e EXECUTE restrito, mas não há evidência de entrega trigger-to-Realtime nesse banco.

## RLS, grants, Default ACL e Storage

### Produção

| Indicador | Resultado |
|---|---:|
| Tabelas public com RLS e sem policies | 10 |
| Tabelas public com grants para clientes | 9 |
| Grants de tabela para anon/authenticated em public | 126 |
| Grants de tabela em todos os schemas consultados | 166 |
| Grants TRUNCATE em public | 18 |
| Entradas Default ACL para papéis cliente | 120 |
| Entradas Default ACL em public | 48 |
| Buckets públicos | 2 |
| Objetos Storage | 188 |
| Policies próprias em storage.objects | 0 |

Os 166 grants se distribuem em public 126, realtime 8 e storage 32. Os 18 TRUNCATE correspondem a nove tabelas para cada papel cliente. RLS não restringe TRUNCATE; os grants amplos devem ser removidos/revistos por owner autorizado.

As 120 entradas Default ACL estão distribuídas entre postgres/public, postgres/storage, supabase_admin/graphql, supabase_admin/graphql_public e supabase_admin/public. Cada grupo mantém privilégios para anon/authenticated.

Buckets:

- chat-images: público, 168 objetos, limite 20 MiB; MIME permite imagem, vídeo, áudio e documentos.
- profile-images: público, 20 objetos, limite 20 MiB; MIME de imagem.

A política de privacidade dos buckets ainda precisa de decisão. Buckets públicos tornam os objetos acessíveis por URL pública; não há policies próprias em storage.objects para governar o ciclo de escrita.

### Laboratório

- 18 tabelas public com RLS e sem policies.
- Zero grants diretos de cliente nas tabelas public consultadas.
- Zero objetos Storage e zero policies em storage.objects.
- Zero mensagens Realtime.
- Security Advisor: 0 WARN e 18 INFO de RLS sem policies.

O laboratório está mais restrito em grants e triggers, mas não é ambiente full-product.

## AUTH-03, identidade de sessão e autorização

Consulta de catálogo confirma:

- Produção: sem colunas setup_token_*, sem tabela upstatus_setup_invite_rate_limits e sem função consumidora de convite.
- Laboratório: quatro colunas setup_token_*, tabela de rate limit e função de consumo de convite presentes.

Produção:

- users.id é a chave primária.
- users.name não tem constraint UNIQUE.
- upstatus_sessions usa token_hash como PK e armazena somente user_name e expires_at.
- upstatus_profiles usa user_name como PK.
- A sessão tem expiração de 30 dias.

Os candidatos de chat exigem owner Ricardo + role implementation_admin para limpar todo o chat; o runtime Normal/Team Lite instalado ainda autoriza a limpeza somente pelo nome Ricardo. A sessão não está vinculada a users.id, então rename/reuso de nome continua sem identidade imutável.

## Migrations e proveniência

Supabase registra sete migrations em produção e 39 no laboratório.

Quatro versões do ledger de produção não têm SQL correspondente em master:

- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

As quatro buscas no diretório canônico retornaram 404. A PR #135 documenta statements recuperados do ledger, mas isso não é recuperação byte a byte dos arquivos originais nem restauração no diretório canônico.

A branch gerenciada Supabase main permanece MIGRATIONS_FAILED, embora preview_project_status esteja ACTIVE_HEALTHY.

## Voz e contrato HTTP

A função de laboratório upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não mapeia VOICE_ATTEMPT_ALREADY_ACTIVE. O adapter candidato trata os dois códigos de conflito; o helper e a função implantada não estão alinhados. O fallback observado no código é HTTP 500. Não foi executada requisição HTTP real nesta auditoria.

## Issues e aceitação física

- Issue #78 permanece com 0/8 critérios físicos aprovados. Nenhum teste manual foi executado nesta rodada.
- Issue #79 recebeu atualização no comentário QA existente; o comentário da Engenharia foi preservado. O checklist do corpo continua 16/35; isso não é percentual de prontidão de release.

## Gates

| Gate | Estado |
|---|---|
| RT-01 | blocked |
| TEST-ISOLATION | blocked |
| MIGRATION-PROVENANCE | blocked |
| AUTH-03 | blocked |
| ACL-STORAGE | blocked |
| RECONNECT | pending |
| HUMAN-REVIEW | pending |

## Próximas prioridades

1. Provisionar ambiente full-product TEST e planejar substituição segura do runtime v281 legado.
2. Implantar endpoint server-mediated de produção antes de habilitar a flag nos clientes; tornar call/voice/screen autenticados por padrão e remover broadcasts públicos sensíveis.
3. Revalidar #74 no merge ref atualizado e incrementar versão Normal.
4. Manter #158 fora da integração isolada; coordenar correção sobre a base completa da #74.
5. Corrigir workflow oficial Team Lite para publicar somente upstatus-team-lite, com projeto, SHA e CLI fixos.
6. Vincular sessões e perfis a users.id e aplicar a mesma autorização owner+role no servidor e na interface.
7. Rever RLS, grants, Default ACL, SECURITY DEFINER e política de Storage.
8. Recuperar proveniência dos quatro SQLs e diagnosticar MIGRATIONS_FAILED.
9. Corrigir HTTP 409 no helper e na função de laboratório, depois validar HTTP real.
10. Executar os oito testes físicos e obter aprovação humana vinculada ao SHA final.

## Limites e segurança desta execução

- CI foi inspecionado pelos logs existentes; nenhum workflow foi disparado manualmente.
- Não executei teste local, browser/Tampermonkey ou request HTTP de sinalização.
- Supabase foi usado somente para inventário, advisors e consultas SELECT de catálogo/agregados.
- Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizada.
- A única escrita de repositório nesta rodada é este novo relatório na branch QA; o RELEASE_READINESS.md e as branches de produto foram preservados.
