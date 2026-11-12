# UpStatus — auditoria independente de qualidade
**Data:** 2026-11-12 12:50 UTC  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb  
**Recomendação:** NOT READY — não liberar.

## 1. Escopo, método e limites

Foram inspecionados, em modo read-only:
- Heads reais de master, QA e team-lite-official.
- PRs #74, #75, #76, #82, #133, #142, #143, #147, #149, #151 e candidatas de publicação/migration #125, #127, #128, #129 e #135.
- Issues #78 e #79, reviews, commits e workflows.
- Logs existentes de CI; nenhum workflow foi iniciado ou repetido nesta execução.
- Código dos userscripts embutidos nos runtimes implantados, templates candidatos, Edge Functions, migrations, RLS, grants, Default ACLs, SECURITY DEFINER, Realtime e Storage.
- Consultas SQL somente SELECT/catalog. Nenhum teste manual ou script local foi executado; não havia checkout local/ambiente de navegador disponível nesta execução.

Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva.

## 2. Heads e governança

| Ref | HEAD | Protegida |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | não |
| qa/release-readiness-2026-11-04-master | e5b29df5560f0f235e6c837aa37f720198fe642f | não |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | não |

QA está 249 commits à frente e 1 atrás de master; as branches estão divergidas. A API de rulesets retorna lista vazia. Nenhuma das três branches tem proteção ativa.

O arquivo docs/RELEASE_READINESS.md foi lido integralmente pelo Git blob: 1.045.105 caracteres e 8.409 linhas. Blob SHA: 7cfbd70886df42ce790c078c224b19284a632595. O último checkpoint interno é 2026-11-08 15:30 BRT / 18:30 UTC. O documento está materialmente desatualizado em relação aos estados atuais de CI, Realtime, migrations e Edge Functions.

## 3. PRs, reviews e CI

Todas as PRs abaixo continuam abertas e Draft; não há merge nem review humana registrada nas PRs #74, #75, #76, #82, #133, #149 e #151.

| PR | HEAD | Base | Resultado observado |
|---|---|---|---|
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d | master | Validate do HEAD atual PASS; Smoke disponível em SHA anterior, não atribuir ao HEAD atual |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | PASS histórico |
| #76 Team Lite signaling | c4dee8d2c502499de5f95932ac14a90cffb56196 | team-lite-official | Candidate Checks PASS |
| #82 QA | e5b29df5560f0f235e6c837aa37f720198fe642f | master | Validate FAIL: production updateURL mismatch |
| #133 Normal call-source | 8d38036ead5e1c3c9cc00db9791f8c9de093ba62 | chore/continuity-foundation | Candidate Validate e Smoke PASS; 136/136 authenticated checks |
| #142 Normal dual-runtime | 2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4 | staged-chat-attachments | Candidate Validate PASS |
| #143 Normal dispatcher | c4a04fa755b877bc76b1372170a26e7b974264e6 | #142 | Candidate Validate PASS |
| #147 Normal updater/chat | fdc727d072008b064fb8f3c4af52067c5da15111 | QA antigo 6b9aba1 | Full Validate PASS |
| #149 Team Lite call-source | 77352d2e3b93722d6b69a9eec31a92bb63158230 | #76 | Candidate Checks PASS; 110/110 authenticated checks |
| #151 Normal admin/chat | 60b686aefc1e5ae01197a8be8c7956ef9cc56bd3 | #147 | Full Validate PASS |

Evidências:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42753434411
- #75 histórico: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43124413080
- #82 Validate FAIL: https://github.com/Reekyi/UpStatus/actions/runs/43213143755
- #133 smoke 136/136: https://github.com/Reekyi/UpStatus/actions/runs/42804903887
- #142 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43085494740
- #143 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43093687347
- #147 Full Validate: https://github.com/Reekyi/UpStatus/actions/runs/43176202190
- #149 Candidate Checks 110/110: https://github.com/Reekyi/UpStatus/actions/runs/43173176232
- #151 Full Validate: https://github.com/Reekyi/UpStatus/actions/runs/43196245858

A falha atual da #82 é reproduzida no HEAD QA e decorre de uma divergência concreta:
- release.json declara scriptUrl em /functions/v1/upstatus/upstatus.user.js.
- scripts/validate.mjs exige /upstatus/upstatus.user.js.
- scripts/build.mjs da QA define cloud para upstatus-screen-share-3-1-1-beta10 e gera updateUrl = cloud + /upstatus.user.js; ignora release.json.scriptUrl.
- release.json QA ainda declara versão 3.4.7.

A #147 corrige o uso de release.scriptUrl na sua candidata e passou Full Validate; #151, filha da #147, também passou Full Validate. Ambas derivam de uma base QA antiga (6b9aba1), não do HEAD QA atual e precisam de revalidação após reconciliação.

## 4. Duas arquiteturas Normal concorrentes

### Linha single-runtime: #133

scripts/build.mjs define:
- PROD_FUNCTION = upstatus.
- PROD_TOPIC = upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- updateUrl derivado de release.scriptUrl.

A candidata inclui:
- Convite obrigatório no primeiro setup, consumo de convite e rate limit.
- Papel derivado do enrollment, sem promoção por nome.
- Polling autenticado de comandos remotos; broadcast serve como aviso.
- Proveniência de call_signal fora do payload.
- Rotas de upload assinado.
- Chat staged e regressões.
- 136/136 verificações autenticadas e smoke aprovado.

A versão de release ainda é 3.4.7, igual ao Normal instalado. O dispatcher #143 exige versão estável superior à versão atual; esta candidata ainda não tem versão de release selecionada/bumpada.

### Linha dual-runtime: #142/#143

scripts/build.mjs define:
- PROD_FUNCTION = upstatus.
- PROD_API_FUNCTION = upstatus-screen-share-3-1-1-beta10.
- PROD_TOPIC = upstatus-screen-share-live-3-1-1-beta10.
- Gera artefatos para os dois runtimes.

#143 possui um workflow de publicação muito mais rigoroso: execução manual a partir de master, SHA exato, projeto esperado, PR merged/review autorizado, checks no SHA de release, versão pinada da CLI 2.122.1, preflight read-only e atestações SHA-bound de gates e aceitação física.

Entretanto, a linha dual-runtime não inclui AUTH-03 completo da #133 e usa tópico beta10, enquanto os triggers SQL atuais publicam no tópico legado. A #143 não deve ser liberada sem resolver essa paridade.

### Compatibilidade candidata

Normal #133 e Team Lite #149 usam o tópico legado, alinhado ao tópico dos triggers atuais. A linha #142/#143 usa beta10. Os clientes instalados usam beta10. Portanto:
- A combinação #133 + #149 é a candidata mais alinhada ao tópico atual do banco.
- A combinação #142 + #149 é incompatível em tópico sem alteração coordenada.
- Nenhuma combinação está pronta: sinalização autenticada continua opt-in, endpoint server-mediated não existe em produção e os bundles instalados não foram substituídos.

Não fazer merge cego entre #133, #142/#143 e #147/#151. É necessária uma decisão explícita de arquitetura e uma única candidata integrada Normal.

## 5. Userscripts e Edge Functions implantados

Inventário read-only:
- Produção: 38 Edge Functions ACTIVE; todas reportam verify_jwt=false.
- Laboratório: 2 Edge Functions ACTIVE.
- 23 slugs de produção contêm test ou backup; upstatus-test v281 e múltiplos backups permanecem no projeto de produção.
- A configuração verify_jwt=false não prova ausência de autenticação: os handlers principais usam sessão própria via x-upstatus-token. As funções de teste/backup restantes exigem revisão individual.

Runtimes principais:
| Função | Versão | Source SHA |
|---|---:|---|
| upstatus (distribuição Normal) | v480 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd |
| upstatus-screen-share-3-1-1-beta10 (API Normal) | v6 | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 |
| upstatus-team-lite | v15 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb |

Os bundles implantados são Normal 3.4.7 e Team Lite 3.4.30. Inspeção do código decodificado:
- remote_command executa o payload recebido; o cliente instalado não consulta a API autenticada antes de executar.
- call_signal, voice-room e screen-share ainda processam eventos públicos.
- Não há private:true nem setAuth() nos canais instalados.
- Team Lite verifica a sessão local e a geração de autenticação, mas isso não autentica o emissor do broadcast.
- Normal API beta10 v6 e Team Lite v15 ainda mantêm o fluxo de primeiro setup sem convite obrigatório e fallback de papel administrativo por nome quando o papel está vazio.

As cinco contas de produção estão configuradas (3 implementation_admin e 2 implementation_user; zero senha/papel vazio). Isso reduz o risco imediato de uma conta existente desconfigurada, mas não corrige a vulnerabilidade latente do provisionamento.

Candidatas #133 e #149 mudam remote_command para aviso que aciona polling autenticado e marcam a origem de call_signal fora do payload. Em ambas, signalTransportFlag é false por padrão. O endpoint de sinalização é configurável e vazio por padrão.

Não existe Edge Function server-mediated de sinalização em produção. O laboratório possui upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não apontar clientes de produção para o laboratório.

## 6. Realtime, RLS, grants e SECURITY DEFINER

Snapshot de produção:
- 111 eventos persistidos, todos private=false, no tópico legado:
  - 59 user_status.
  - 40 db_change.
  - 6 remote_command.
  - 6 remote_result.
- Os clientes instalados usam tópico beta10; os triggers SQL usam o tópico legado.
- O trigger upstatus_broadcast_messages envia to_jsonb(OLD/NEW) completo em db_change.
- upstatus_broadcast_remote_state envia campos operacionais de command/result.
- upstatus_broadcast_users envia name/status/reason/updated_at/sync.
- As três funções são SECURITY DEFINER, search_path=public, retornam trigger e têm EXECUTE efetivo para anon/authenticated.
- Security Advisor: 6 WARN (3 funções para anon + 3 para authenticated) e 10 INFO de RLS sem policy.

O Advisor descreve as funções trigger como executáveis via REST RPC. Não foi feita chamada de exploração; a invocabilidade direta não foi reproduzida. Tratar os grants como excessivos até revogação/revisão, sem afirmar exploit confirmado.

realtime.messages:
- RLS habilitado; FORCE RLS desabilitado.
- Zero policies.
- SELECT/INSERT/UPDATE efetivos para anon/authenticated.
- A configuração do projeto “Allow public access” não foi exposta pelo conector; acesso externo efetivo não foi reproduzido.

Laboratório:
- As três funções broadcast são SECURITY DEFINER com search_path vazio.
- Nenhuma tem EXECUTE para anon/authenticated.
- Os triggers publicam somente {op}, em vez de linha completa/campos operacionais.
- Advisor: 18 INFO RLS sem policy, zero WARN.

Grants e Default ACL:
- 166 grants diretos em produção: 126 public, 32 storage, 8 realtime.
- 18 privilégios TRUNCATE distribuídos em nove tabelas públicas.
- 10 tabelas public com RLS e zero policies em produção; 18 no laboratório.
- Default ACL expandida: 120 entradas em produção e 96 no laboratório. Permanecem defaults amplos para anon/authenticated/PUBLIC em objetos futuros, inclusive privilégios de tabela/função/sequência em schemas public/storage/GraphQL, conforme owner/schema.
- O laboratório tem menos grants diretos de tabela para clientes, mas Default ACL de supabase_admin ainda é ampla.

## 7. Storage e upload assinado

Produção:
- Buckets chat-images e profile-images são públicos.
- 188 objetos: 168 chat-images e 20 profile-images.
- Limite de 20 MiB por bucket.
- Zero policies próprias em storage.objects.
- 296 mensagens; 296 com file_name nulo.

Na candidata #133:
- O upload direto usa sniffMime e valida bytes; avatar direto tem limite de 2 MiB.
- mediaRoute de chat aceita imagem até 25 MiB, mas o bucket limita 20 MiB; arquivos entre 20 e 25 MiB passam na validação do servidor e falham no Storage.
- signedUploadRoute usa limite global de 20 MiB para chat e avatar; avatar assinado não preserva o limite de 2 MiB da rota direta/UI.
- signedUploadRoute valida MIME declarado, tamanho, caminho e origem da URL, mas não executa sniffMime nos bytes que serão enviados pelo cliente.

Ajustar limites por tipo e adicionar validação final de conteúdo/assinatura de arquivo antes de considerar uploads assinados prontos. A política de leitura pública dos buckets também precisa de decisão explícita.

## 8. AUTH-03 e migrations

Produção:
- 7 migrations no ledger.
- Zero colunas setup_token_*.
- Tabela de rate limit e RPCs de consumo de convite/rate limit ausentes.
- 5 usuários configurados; nenhum sem senha/papel.

Laboratório:
- 39 migrations.
- 4 colunas setup_token_*.
- Tabela de rate limit e RPCs de convite/rate limit presentes.
- Zero usuários/fixtures no snapshot.
- A migration no ledger é test-only 20261110000612_setup_invite_rate_limit_contract_test_20261109; não é a migration de produção 20261109230000_setup_invite_rate_limit da candidata #133.

#133 contém a migration de produção e passou 136/136, mas a migration não está aplicada em produção. A existência do contrato test-only no laboratório não prova que a migration de produção foi executada pelo fluxo normal.

Proveniência:
- Quatro SQLs originais continuam 404 no master.
- #135 recuperou os statements do ledger em docs/migration-recovery; o README e manifest deixam claro que não são os arquivos originais byte a byte.
- #127 mantém Git blob SHA verificável para as três migrations originais presentes no master; quatro remotas ficam deliberadamente sem proveniência.
- Branch Supabase main permanece MIGRATIONS_FAILED; o preview está saudável.
- Não copiar statements recuperados para supabase/migrations nem sintetizar arquivos originais.

## 9. Novo gap de contrato HTTP na sinalização

O RPC do laboratório open_upstatus_signal_voice_room_attempt pode retornar VOICE_ATTEMPT_ALREADY_ACTIVE.

O código implantado em upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não mapeia VOICE_ATTEMPT_ALREADY_ACTIVE; esse código cai no fallback HTTP 500.

A PR #149 adiciona teste offline de mapOpenVoiceRoomResult que espera 409 para VOICE_ATTEMPT_ALREADY_ACTIVE. O teste autenticado contra o endpoint verifica o corpo/erro, mas não verifica o status HTTP desse caso. A função implantada v32 não importa o helper testado no repositório; não há prova de paridade de SHA entre o helper e o endpoint live.

Portanto, o 110/110 da #149 não comprova o contrato HTTP 409 do endpoint atualmente implantado. Atualizar a função candidata no laboratório e testar status/body no endpoint real antes de promover a sinalização.

## 10. Workflow Team Lite e publicação

O workflow oficial team-lite-official/.github/workflows/deploy-production.yml:
- É workflow_dispatch.
- Usa Supabase CLI latest.
- Não valida um projeto esperado nem vincula a aprovação a um SHA de release.
- Executa supabase functions deploy upstatus.
- O slug correto é upstatus-team-lite.

Não despachar o workflow atual: ele pode direcionar a publicação Team Lite ao runtime Normal.

As PRs #125/#128/#129 propõem dispatcher SHA-bound, aprovação humana e bloqueio do workflow legado; permanecem Draft. #143 Normal possui gates de publicação mais robustos, mas pertence à arquitetura dual-runtime e está Draft.

## 11. Teste manual, pendências e veredito

Issue #78 permanece OPEN, 0/8 critérios físicos aprovados. Não foram executados teste real de queda/reconexão sem F5, microfone, permissões de tela ou interoperabilidade instalada Normal ↔ Team Lite.

Issue #79 continua OPEN. O corpo contém 16 checkboxes marcados e 19 pendentes, um histórico de checklist, não uma porcentagem de prontidão.

### Gates
- RT-01: blocked — broadcasts públicos, tópico divergente e sinalização server-mediated ausente em produção.
- TEST-ISOLATION: done — projeto de laboratório separado e limpo; não existe terceiro ambiente full-product TEST.
- MIGRATION-PROVENANCE: blocked — quatro arquivos originais não recuperados.
- AUTH-03: in_progress — candidato #133 aprovado em CI, produção ainda sem schema/RPC.
- ACL-STORAGE: blocked — grants, Default ACL, buckets públicos e policies ausentes.
- RECONNECT: pending — nenhum teste físico sem F5.
- HUMAN-REVIEW: pending — PRs Draft, sem reviews/aprovação explícita.

### Prioridades
1. Escolher uma arquitetura Normal e integrar AUTH-03, admin hardening, signed upload e chat staged numa única candidata.
2. Alinhar o tópico Realtime com Normal/Team Lite e com os triggers.
3. Implantar e validar no laboratório a função server-mediated exata que será promovida; corrigir o HTTP 409 de VOICE_ATTEMPT_ALREADY_ACTIVE.
4. Tornar sinalização autenticada padrão e remover handlers públicos de comandos/sinais sensíveis.
5. Corrigir grants/Default ACLs, SECURITY DEFINER e Storage.
6. Resolver os quatro SQLs originais e MIGRATIONS_FAILED.
7. Corrigir o workflow oficial Team Lite e manter dispatcher SHA-bound.
8. Corrigir Validate da QA sem enfraquecer assertions.
9. Fazer bump de versão Normal acima de 3.4.7 e validar o updater.
10. Executar os oito testes físicos da #78 e obter aprovação humana.

**Conclusão: NOT READY.** Os testes automatizados dos candidatos são fortes, mas não representam o código implantado. Há divergência entre o endpoint live do laboratório e o helper testado no CI, sinalização pública ainda habilitada por padrão, AUTH-03 ausente em produção, workflow Team Lite apontando para o Normal e ausência de aceitação física.

Nenhuma produção foi alterada. Todas as consultas SQL desta auditoria foram SELECT/catalog-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou fixture. Nenhum teste manual ou workflow foi executado nesta rodada.
