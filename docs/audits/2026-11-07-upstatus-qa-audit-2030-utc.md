# Auditoria independente UpStatus - 2026-11-07 20:30 UTC (17:30 BRT)

## Veredito executivo

Os candidatos Normal e Team Lite passaram novamente em seus workflows de integração nos HEADs exatos consultados. O Normal concluiu Validate e Signaling Smoke no HEAD documental atual; Team Lite concluiu Candidate Checks. O guard de deploy TEST e a correção de updater/upload também passaram em Validate.

**Release continua BLOQUEADO.** O achado novo mais importante desta rodada é uma divergência de autorização no backend Team Lite candidato: a rota destrutiva de limpeza do chat verifica apenas o nome Ricardo, sem confirmar o papel armazenado de administrador. O Normal candidato já exige ambos. O CI Team Lite não possui uma asserção específica para essa rota.

Também permanecem bloqueadores a proteção insuficiente do workflow TEST ativo em develop, a ausência de um projeto TEST full-product, a autenticação legada em produção e a migração incompleta do Realtime público.

## Classificação das evidências

- **AUTOMATED PASS:** workflow concluído com sucesso no SHA indicado.
- **CODE INSPECTION:** leitura de código, configuração ou catálogo, sem execução funcional do caminho.
- **MANUAL PENDING:** depende de Tampermonkey instalado, dispositivos reais, rede real ou aceitação humana.
- **BLOCKED:** falta ambiente, autorização, privilégio ou pré-condição para validar.
- **NOT VERIFIED:** não há evidência suficiente para afirmar o comportamento.

## Fonte QA e heads reais

A primeira leitura foi feita em docs/RELEASE_READINESS.md na branch qa/release-readiness-2026-11-04-master.

- Blob SHA: 1ae48aab678a06b4ff75d061d2355a6449cbe1e0
- 6.221 linhas.
- O trecho final ainda registra o checkpoint de 02:35:36 UTC, com fixtures não vazias e Smoke pendente. Esse snapshot está superado pelos runs posteriores e pelas consultas atuais, que encontraram fixtures zeradas e os dois candidatos aprovados.
- O documento principal não foi alterado nesta rodada. Este relatório é um novo arquivo de auditoria para preservar o histórico.

Heads de branches consultados pela API do GitHub:

| Branch | HEAD |
|---|---|
| master | a9288ccfcb0f308d3a587bfca624418a395be07b |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| qa/release-readiness-2026-11-04-master | 2c5544e5711ee7d8eef5103d1416749a87969cb1 |

O endpoint de branches reporta protected=false e protection.enabled=false para master, develop e QA. A leitura de rulesets/protection detalhada não foi possível por 403 da API. Portanto, não foi comprovada uma regra alternativa de ruleset.

## PRs, heads, tamanho e CI

Todas as PRs examinadas permanecem abertas, Draft e sem merge. As consultas de reviews retornaram zero aprovações humanas.

| PR | Branch / HEAD | Base | Ahead | Arquivos | Estado |
|---|---|---|---:|---:|---|
| #74 | chore/continuity-foundation / a79ec9a922eaa064d2982bf650dbd7a6d186e9bd | master | 852 | 84 | Draft |
| #75 | team-lite/3.4.31-guest-fixes / 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 59 | 10 | Draft |
| #76 | team-lite/signaling-transport-candidate / 2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7 | team-lite-official | 313 | 42 | Draft |
| #82 | qa/release-readiness-2026-11-04-master / 2c5544e5711ee7d8eef5103d1416749a87969cb1 | master | 107 | 18 | Draft |
| #84 | safety/test-deploy-target-guard-20261107 / 21341f331270e142bdf7584c1cdf16e6011e41b3 | develop | 30 | 13 | Draft |
| #85 | fix/master-release-script-url-20261107 / 17554523ef51bafd503e74b3f1271d55f43a6eda | master | 21 | 7 | Draft |

### #74 Normal e base compartilhada

O HEAD atual a79ec9a é um commit documental de 10 linhas em docs/REALTIME_SECURITY_TEST_MATRIX.md, cujo pai é d949c4b765e77b80d01d3115e76c35555f28949b. O runtime não mudou nesse último commit documental.

No HEAD atual:
- Validate 42409229531: SUCCESS.
- Signaling Smoke 42409229487: SUCCESS.

O Smoke confirmou:
- 19/19 verificações não autenticadas.
- 129/129 verificações autenticadas.
- Call, áudio, voice room e screen-share WebRTC em Chromium.
- Entrega de tracks remotas e teardown de peers/tracks.
- Mesh de três participantes.
- Convites, aceitação/recusa, membership, ownership e handoff.
- Call/voice attempt recovery, cancelamento, tombstones e concorrência.
- Rate limit distribuído: 90 aceitas e uma HTTP 429 com Retry-After de 60 segundos.
- Recibos de leitura atômicos.
- Enrollment por convite, incluindo elegibilidade NULL/empty, conta configurada, token malformado/incorreto/expirado/reutilizado, concorrência com um único vencedor e preservação de papéis.
- Cleanup de usuários, sessões, salas, memberships e eventos temporários.

O run é evidência automatizada do endpoint isolado e dos testes Chromium. Não é teste físico no Tampermonkey, nem teste de produção.

### #75 Baseline Team Lite

- HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309.
- Candidate histórico 41674353127: SUCCESS.
- PR não foi atualizada desde 03/11 e é baseline histórico, não substitui a avaliação do candidato atual #76.

### #76 Team Lite

- HEAD 2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7.
- Candidate Checks 42386904302: SUCCESS.
- 16/16 verificações não autenticadas e 103/103 autenticadas.
- Chromium validou call, voice audio, screen video, mesh e teardown.
- Validou ownership/membership, late join, saída concorrente, recuperação, rate limit, read receipts e setup invite.
- Atualizador candidato 3.4.31 e portais Lucca/Ycaro passaram nos checks.
- A suíte confirma a implementação do candidato no ambiente isolado, não a implantação do backend Team Lite completo em TEST.

### #82 QA

- HEAD 2c5544e5711ee7d8eef5103d1416749a87969cb1.
- Validate 42407046039: FAILURE.
- Falha: VALIDATION FAILED: production updateURL mismatch.
- O log mostra a falha na etapa Validate build, antes de qualquer deploy.
- A causa é a asserção herdada de master, que não compara o contrato atual de distribuição com release.json. A correção está no trabalho #85 e também existe no ramo amplo #74. Não enfraquecer a validação.

O commit atual 2c5544e é documental e adicionou apenas docs/audits/2026-11-07-upstatus-qa-audit-1935-utc.md.

### #84 TEST guard

- Validate 42387042361: SUCCESS.
- Passaram guard do build target, metadata do projeto, escopo de secrets, upload assinado e Validate.
- O workflow candidato é manual-only, faz checkout de github.sha, compara o SHA executado com GITHUB_SHA, exige SUPABASE_TEST_PROJECT_ID, rejeita produção e laboratório e inclui preflight pela Management API.
- **O workflow_dispatch não foi executado.** O preflight real da Management API e qualquer deploy permanecem NOT VERIFIED.

### #85 Updater/security

- Validate 42386047749: SUCCESS.
- O candidato corrige a comparação UpdateURL/DownloadURL com release.json, reforça autorização administrativa por papel armazenado e testa o contrato de upload assinado com mocks.
- Os testes de upload são VM/mock de cliente e servidor. Não houve upload real no Storage.
- Todos os sete arquivos tocados por #85 também estão no diff amplo de #74. A comparação entre heads mostra branches divergentes: #85 tem 21 commits que não estão em #74, enquanto #74 tem 852 commits que não estão em #85. Não tratar como duas PRs independentes para merge. Reconciliar os sete arquivos uma vez na sequência de integração.

## Achado novo de alta prioridade: Team Lite permite chat clear por nome, sem papel admin

CODE INSPECTION no HEAD #76:

- Arquivo: src/server/team-lite-index.template.ts
- Blob SHA: 099d343d977be8f127bacb6d3988cfe90c4fc412
- Na rota POST /api/chat/clear, a condição é apenas name !== "Ricardo".
- Depois da condição, o código lê todas as mensagens, apaga todas as mensagens e remove objetos correspondentes do bucket chat-images.

A rota não chama admin(name) nem confirma role === implementation_admin.

Comparação:
- Normal candidato #74, src/server/index.template.ts, blob c7de6c4b8677fd829f512b224db3157e506cf2ad, exige Ricardo E admin(name).
- Team Lite candidato #76 exige somente o nome Ricardo.
- scripts/team-lite-candidate-check.mjs, blob 18a56435370673980118b0a32e01192ec429481c, testa a função admin e alguns padrões antigos, mas não contém uma asserção para garantir que POST /api/chat/clear também exige o papel armazenado.

Impacto condicional: qualquer sessão autenticada para a conta Ricardo cujo papel armazenado não seja administrador ainda passaria pela condição desta rota Team Lite e poderia limpar o histórico compartilhado e remover mídias. A auditoria não tentou essa chamada.

**Gate recomendado:** alinhar Team Lite ao contrato do Normal e acrescentar regressão explícita: Ricardo com papel não-admin recebe 403; Ricardo com implementation_admin é autorizado; demais usuários continuam sem poder limpar. O teste deve usar mocks ou fixtures allowlisted em ambiente isolado, nunca produção.

## Autorização administrativa na produção

Inspecionei as fontes implantadas das quatro funções centrais. Todas mantêm caminhos legados:

- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd
- upstatus-test v281, SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29

As quatro fontes ainda possuem:
- Setup legado público com fallback administrativo por nome quando o papel está vazio.
- Health route baseada em allowlist de nomes, não somente no papel armazenado.
- Delete de mensagem com fallback name === Ricardo além de admin(name).
- Chat clear autorizado somente por name === Ricardo.
- Ausência do fluxo de setup invite nos runtimes implantados.

O candidato Normal corrige essas autorizações por papel. O candidato Team Lite corrige health e delete, mas a rota chat/clear ainda ficou com a condição somente por nome.

verify_jwt=false nas Edge Functions não prova ausência de autenticação: os runtimes centrais usam sessão customizada. Ainda assim, os quatro caminhos legados acima são comprovados por inspeção de fonte. As outras 34 funções antigas não tiveram revisão individual de todas as rotas nesta rodada.

## Workflows e proteção de branches

### develop ativo

- HEAD develop: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6.
- .github/workflows/deploy-test.yml blob: d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839.
- Gatilhos push e workflow_dispatch.
- Usa secrets.SUPABASE_PROJECT_ID compartilhado.
- CLI latest.
- Não valida a identidade do projeto de destino.
- Branch metadata informa protected=false.

Não li o secret e não afirmo qual destino ele contém. O risco é o workflow não impor a separação de ambientes.

A versão #74 já é manual-only e usa variável dedicada, mas faz checkout de develop, que é um ref móvel, sem igualdade entre checkout e GITHUB_SHA.

A #84 melhora o contrato com manual-only, checkout do SHA do evento, igualdade de SHA, variável dedicada, rejeição de produção/laboratório e preflight de organização/database host. A correção ainda não está integrada em develop.

### Deploy de produção candidato

O workflow em #74 é manual-only, usa environment production, exige master, checkout exato do SHA, valida o project ref de produção e fixa Supabase CLI 2.122.1. A configuração de required reviewers do environment não foi verificada. A branch master também aparece protected=false.

## Normal e Team Lite: build e compatibilidade

- release.json Normal continua em 3.4.7, com scriptUrl para /functions/v1/upstatus/upstatus.user.js.
- O CLOUD_SERVER Normal continua apontando para o runtime beta10 legado. Isso é compatibilidade deliberada e não deve ser chamado de bug isoladamente. O cutover precisa coordenar API, Realtime, Storage, manifesto, versão e rollback.
- Team Lite usa coreVersion 3.4.7 e buildVersion 3.4.31; o scriptUrl estável continua apontando para team-lite-official.
- Ambos os userscripts mantêm signaling_transport_enabled com default false e endpoint vazio. O Realtime legado continua sendo o caminho padrão.
- O builder atual gera upstatus-test e upstatus-team-lite, mas não gera upstatus-team-lite-test. O workflow TEST implanta somente upstatus-test.

Não ligar o transporte autenticado por padrão até existir endpoint full-product validado, plano de rollback e aceite físico.

## Supabase: projetos e runtimes

A organização possui somente dois projetos:

| Ambiente | Ref | Estado | Migrations | Edge Functions |
|---|---|---|---:|---:|
| Produção | dlfvkawaiqduhlazsszm | ACTIVE_HEALTHY | 7 | 38 |
| Laboratório isolado | bfpjtfqlnypisxljoxkb | ACTIVE_HEALTHY | 34 | 2 |

Não existe terceiro projeto TEST full-product.

Laboratório:
- upstatus-signal-test v32.
- upstatus-signal-e2e-once v3.
- Possui objetos de setup invite, signaling rate limit, chat read receipts e call/voice attempt recovery.
- Não possui os backends completos Normal e Team Lite nem buckets chat/profile.

Produção:
- 38 Edge Functions ACTIVE.
- 38 reportam verify_jwt=false.
- 36 nomes contêm test, beta ou backup.
- As quatro funções centrais acima foram inspecionadas individualmente; as demais variantes ainda precisam de inventário de consumidores e rotas antes de qualquer desativação.

Agregados SELECT-only em produção:
- 5 contas, 3 com papel implementation_admin.
- 0 contas sem senha.
- 0 papéis vazios.
- 262 mensagens.
- 50 linhas em realtime.messages.
- 2 buckets.

Objetos candidatos ausentes em produção:
- setup_token_hash e setup_token_expires_at.
- consume_upstatus_setup_invite.
- upstatus_signal_rate_limits e consume_upstatus_signal_rate_limit.
- merge_chat_read_receipts.
- tabelas de call attempts e voice-room attempts.

Os mesmos objetos existem no laboratório. Isso confirma que os recursos candidatos ainda não chegaram ao banco de produção.

## RLS, grants, SECURITY DEFINER e Default ACLs

### Produção

- 10 tabelas public com RLS habilitado e zero policies.
- Nove tabelas backend-owned têm grants de anon e authenticated para SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER e TRUNCATE.
- upstatus_visual_config não aparece com grants de cliente.
- realtime.messages tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- Security Advisor: 6 WARN, sendo três funções SECURITY DEFINER executáveis por anon e três por authenticated; 10 INFO de RLS sem policies.
- Performance Advisor: nenhum finding.
- Health Advisor: nenhum finding.

Zero policies não prova por si só acesso às linhas via PostgREST. Os grants são uma superfície excessiva, e TRUNCATE não é protegido por RLS.

As três funções de broadcast são SECURITY DEFINER, owner postgres, search_path=public, EXECUTE efetivo para anon/authenticated e têm triggers ativos:
- upstatus_broadcast_messages: publica OLD/NEW completo por to_jsonb.
- upstatus_broadcast_remote_state: publica sender, target, status, reason, error e metadados de comando/resultado.
- upstatus_broadcast_users: publica nome e estado.

Todas usam realtime.send com private=false.

### Laboratório

As mesmas três funções continuam SECURITY DEFINER por serem funções de trigger, mas agora:
- search_path vazio.
- EXECUTE negado para anon/authenticated.
- EXECUTE permitido para service_role.
- realtime.send schema-qualified.
- Payload reduzido a {op}.
- Triggers preservados.
- private=false continua.

Security Advisor: zero WARN e 17 INFO de RLS sem policies. Performance: quatro índices não utilizados. Health: nenhum finding.

O catálogo mostra zero partições filhas e zero linhas em realtime.messages no laboratório, contra sete partições e 50 linhas em produção. A configuração das funções foi validada, mas entrega real de broadcast no laboratório não foi comprovada. O canal continua público.

### Default ACLs e ACL-02

Produção mantém defaults amplos:
- postgres em public e storage.
- supabase_admin em public, graphql e graphql_public.

No laboratório, postgres/public foi restringido a postgres/service_role, mas postgres/storage e defaults de supabase_admin continuam amplos.

O catálogo confirma postgres sem superuser e sem membership em supabase_admin; supabase_admin é superuser. A sessão disponível não pode corrigir os defaults pertencentes a supabase_admin. ACL-02 permanece BLOCKED até existir caminho administrativo autorizado.

## Storage e upload

Produção:
- chat-images público, limite 20 MiB.
- profile-images público, limite 20 MiB.
- storage.objects não tem policies explícitas.
- Buckets públicos permitem leitura por URL pública; upload assinado protege a escrita, não a leitura.

A #85 passou testes de cliente/servidor com mocks, não upload real.

O caminho de áudio permanece separado: /api/chat/audio recebe data URL e limita áudio a 5 MiB. O fluxo assinado atual cobre chat e avatar, não áudio. Alinhar limites e validar áudio em TEST.

O laboratório não tem buckets de chat/perfil.

## Migração: rastreabilidade do ledger

Os test-migrations são DDL executável, intencionalmente fora de supabase/migrations para não entrar em db push de produção. O README exige aplicação manual apenas no projeto isolado.

Há diferença entre timestamps/nomes de arquivos rastreados e entradas do ledger isolado. Exemplos:
- Arquivo 20261107170000_pin_empty_search_path_trigger_broadcasts_test.sql; ledger 20261107165942_pin_empty_search_path_trigger_broadcasts_test.
- Arquivo 20261107010000_setup_invites_test.sql; ledger 20261107020949_upstatus_setup_invites_isolated_test.

O catálogo confirma o efeito de search_path vazio e as RPCs/colunas candidatas no laboratório. A diferença não prova schema drift, mas falta um mapa explícito arquivo SHA -> versão/nome do ledger para reprodutibilidade e auditoria futura.

## Fixtures

Consulta SELECT-only no laboratório encontrou zero:
- users, sessions, rooms, memberships, bindings, events.
- call attempts e voice-room attempts.
- rate-limit buckets.
- messages, chat_reads e realtime.messages.

Os workflows CI registraram criação e cleanup das próprias fixtures. A auditoria não iniciou nem limpou fixtures manualmente.

## Issues

### #78 - reconexão

OPEN, atualizada às 20:04:25 UTC, 26 comentários, 0/8 critérios marcados. Permanecem MANUAL PENDING:
- Queda real de internet por cerca de dez segundos.
- Retorno sem F5 em Normal e Team Lite.
- Reentrada e nova chamada.
- Microfone e display capture reais.
- Interoperabilidade instalada Normal <-> Team Lite.
- Ausência de peers/polling órfãos.

### #79 - release

OPEN, atualizada às 20:05:00 UTC, 97 comentários, 16/35 itens marcados e 19 pendentes. O corpo foi atualizado às 17:05 BRT com os heads e resultados recentes; não está simplesmente preso ao snapshot antigo. Continuam pendentes gates de Realtime, segurança de produção, manual #78, Storage, cutover, reviews humanas e documentação final.

## Próximos gates priorizados

1. **Corrigir Team Lite chat clear:** exigir Ricardo e papel implementation_admin, com regressão que negue Ricardo não-admin. Não enfraquecer o teste.
2. **Integrar proteção do deploy TEST em develop:** manual-only, SHA exato, destino dedicado, preflight; revisar também branch protection de master/develop.
3. **Provisionar TEST full-product** e runtime upstatus-team-lite-test.
4. **AUTH-03:** testar emissão/consumo por HTTP real, 403 para não-admin e ausência de token em logs; hoje a suíte runtime chama REST/RPC diretamente com service_role.
5. **AUTH-02:** rate limit distribuído e fail-closed de login/setup, com concorrência, 429 e Retry-After.
6. **Produção:** planejar migração do setup público, fallback por nome, health/delete/chat-clear antigos e rollback.
7. **Realtime:** escolher JWT válido para canais privados ou substituir a dependência pública por transporte server-mediated autenticado; provisionar ambiente com Realtime funcional e provar entrega real. Manter o flag default-off.
8. **RLS/ACL:** revisar grants de tabelas e realtime.messages; obter caminho administrativo autorizado para defaults de supabase_admin.
9. **Storage:** decidir público versus privado, testar upload/download real e alinhar áudio.
10. **Migrações:** documentar mapa entre arquivos de test-migrations e entradas de ledger.
11. **Manual e governança:** completar #78, reconciliar #79 após os gates, obter reviews humanas e resolver sobreposição #74/#85 antes de qualquer merge.

## Registro de segurança desta rodada

- Todas as consultas SQL emitidas foram SELECT-only.
- Nenhuma migration foi aplicada.
- Nenhum deploy, merge, release ou publicação foi executado.
- Nenhum secret ou token foi lido.
- Nenhuma flag, role, grant, policy, ACL ou configuração foi alterada.
- Nenhuma fixture foi criada, atualizada ou removida pela auditoria.
- Nenhum workflow foi disparado, repetido ou cancelado manualmente.
- Nenhuma branch de engenharia foi alterada.
- A única escrita é este novo relatório na branch QA dedicada.

Não foi atribuído percentual de conclusão. CI automatizado, inspeção de código, teste manual, pendente e bloqueado permanecem categorias distintas.
