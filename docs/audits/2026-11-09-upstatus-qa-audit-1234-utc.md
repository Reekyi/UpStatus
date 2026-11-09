# UpStatus — auditoria independente de QA
**Data:** 2026-11-09 12:34 UTC (09:34 BRT)  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório isolado:** bfpjtfqlnypisxljoxkb

## Escopo e método

UpStatus é um userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Esta rodada começou pela leitura integral do blob de docs/RELEASE_READINESS.md na branch QA. O blob atual é 7cfbd70886df42ce790c078c224b19284a632595 (aprox. 1.045.105 caracteres). O conteúdo reúne snapshots históricos; a última revalidação ao vivo dentro desse documento é de 2026-11-08 15:30 BRT. Este relatório registra a fotografia mais recente e não substitui silenciosamente o histórico.

Foram consultados refs, PRs, reviews, Actions, arquivos e diffs pelo GitHub; projetos, branches gerenciadas, migrations, Edge Functions, Advisors e catálogos PostgreSQL pelo Supabase. As consultas SQL desta rodada foram SELECT-only. Não foram iniciados workflows, testes que mutam fixtures, chamadas externas de signaling, testes físicos, uploads ou deploys.

Vocabulário:
- AUTOMATED PASS: workflow terminou com sucesso no SHA indicado.
- CODE INSPECTION: fonte/configuração examinada estaticamente; não é teste de runtime.
- MANUAL PENDING: depende de navegador/dispositivo/rede e aceitação humana.
- BLOCKED: gate confirmado sem dependência ou pré-requisito.
- NOT VERIFIED: evidência ausente ou não acessível.

## Heads e integridade

- QA qa/release-readiness-2026-11-04-master: 145d6f2ef5a71b245bee29bf27139250ee0df141.
- master: 9d40461babcec8eb8686c2a04be9c675df7da381.
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281.
- QA está 159 commits à frente e 1 atrás de master; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. O commit master-only é documental, relativo ao preflight do histórico de migrations. Não fiz rebase nem incorporei esse commit concorrente.
- PR #82 aponta para o HEAD QA acima, mas seu base SHA ainda é a9288cc; master já avançou para 9d40461.
- O documento principal foi preservado sem alteração. A nota anterior docs/audits/2026-11-09-upstatus-qa-audit-1134-utc.md também foi preservada (blob 94da71a746ca1aea4d96ef4c34174f36e6b42bdb).

## GitHub: PRs centrais e evidência exata

| Item | HEAD | Resultado observado |
|---|---|---|
| PR #74 Normal | 9c0133e8cf6bd85ac8993888718a408db2f24a3e | Validate 42451736696 PASS; Signaling Smoke 42451736729 PASS |
| PR #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks 41674353127 PASS histórico; baseline superada pela #76 |
| PR #76 Team Lite | eb28e88325d7e8a6236d9050bebabf794d64a8c4 | Candidate Checks 42450476433 PASS |
| PR #82 QA | 145d6f2ef5a71b245bee29bf27139250ee0df141 | Validate 42610953055 FAIL |

Links:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42451736696
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42451736729
- #75 histórico: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/42450476433
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42610953055

O log da #82 falha em scripts/validate.mjs:26 com “production updateURL mismatch”, depois de construir PROD/TEST 3.4.7. O arquivo alterado na #82 é documental; a falha ocorre no contrato herdado de master antes de validar o conteúdo da auditoria. A candidata #85 que trata updateURL continua Draft e não foi integrada. Não atribuir a falha ao Markdown.

### Detalhe dos testes #74 e #76

O job da #74 concluiu todos os passos: sintaxe dos harnesses, endpoint não autenticado no projeto isolado, integração autenticada/browser, concorrência do rate limiter distribuído, recibos atômicos e consumo atômico de convite de setup.

O job da #76 concluiu: isolamento de projeto, adapter autenticado, contrato de primeiro acesso, recuperação de tentativa de sala, recuperação de screen-share, contrato HTTP, autenticação do endpoint, Full-IIFE Playwright com endpoints inertes/stubs GM, integração/browser, rate limit, recibos, convite atômico e layout de migrations.

A #76 é a linha Team Lite atual; #75 é baseline histórica. Não tratar #75 e #76 como dois payloads independentes. Os resultados são CI candidato isolado, não aceitação física nem prova de implantação.

### Retry e deploy candidates posteriores

- #120 Normal, HEAD 086bc543e33f4c0a416b0453b5714f60d9e3f894: Validate 42577115565 PASS. Corrige retry explícito para localizar a entrada implícita e reutilizar corpo/chave originais. Offline CI.
- #122 Team Lite, HEAD ad9638eb8a8e2b89ee7fd5e27ab158cef12f7f6f: Authenticated Call Source Guard 42578565781 PASS. Paridade do adapter, cache limitado, Retry-After, coalescência, TTL e lookup explícito. Offline CI; não executou a suíte completa mutável do laboratório.
- Os fixes #120/#122 permanecem Draft e não estão incorporados nos HEADs principais #74/#76. A aprovação dessas PRs não prova que os candidatos principais já contêm os fixes.
- #123 Team Lite deploy guard, HEAD b8cd8e15a983b00fd5b1eaca0ffecfd18b9b0d99: workflow focado 42589119358 PASS. Manual-only, SHA/projeto/organização fixos, CLI 2.122.1, alvo upstatus-team-lite e preflight sem aplicar migrations.
- #125 dispatcher, HEAD 35c9122d5a07a0890c1fafda86cadd3a842f96b1: offline guard 42598649482 PASS; deploy job SKIPPED. O Validate separado 42598656421 falha no updateURL herdado. Não é workflow pronto para despacho.
- #126 migration/main guard, HEAD da branch 048f74c7987c02225260605480a535c3808ebcfa; código validado em 68c48bfe22cbbf434f214367b4b1ade48e3bb29c. Contrato offline 42598779957 PASS (job offline_contract, todos os passos concluídos). Verifica main ACTIVE_HEALTHY e presença/versionamento dos arquivos locais; não executa Management API real nesta validação.
- #127 migration content provenance, HEAD 4ddd703287d8b17f29e3b28880cf0b1ef533f5fb: workflow focado push 42615124790 e PR 42615130073 PASS. O manifest contém Git blob SHA-1 para as três migrations originais disponíveis. As quatro migrations históricas ausentes continuam deliberadamente sem manifest.
- #128 release-review provenance, HEAD cb38853c4ac79932159715c8eafa8287fc884cb1: workflow focado 42614800302 PASS. Exige GitHub user humano, allowlist UPSTATUS_RELEASE_REVIEWERS, reviewer diferente do autor, commit_id igual ao HEAD atual e último evento relevante APPROVED. A variável precisa ser configurada pelo owner; não foi criada nem alterada. Proteção de reviewers do Environment production continua NOT VERIFIED.

#127 e #128 são contratos offline em branches Draft. Nenhuma review humana foi registrada nas PRs #74, #75, #76, #82, #127 e #128. A API de rulesets retornou lista vazia; a leitura de branch protection retornou 403 Resource not accessible by integration. Não afirmar que a proteção está ausente com base no 403. A configuração de required reviewers do Environment também não pôde ser verificada pela conexão disponível.

## Migrations: divergência confirmada e guard mais forte

Produção:
- Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Sete migrations remotas, última 20261027155438.
- Branch gerenciada default main acompanha Git master, mas está MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.
- Log anterior registra: “Remote migration versions not found in local migrations directory.”
- master/supabase/migrations contém apenas três arquivos:
  - 20261005160000_upstatus_cloud.sql
  - 20261005173000_remote_realtime.sql
  - 20261005180000_client_presence.sql

Quatro migrations aplicadas no histórico remoto continuam sem fonte local nos refs revisados:
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

A listagem Supabase confirma as sete versões remotas. O diretório de master confirma somente os três arquivos acima. #127 adiciona proveniência de conteúdo para esses três arquivos, mas não recupera os quatro faltantes. Seu Git blob SHA-1 detecta divergência de conteúdo em relação ao manifest; o manifest é uma referência de integridade, não uma assinatura criptográfica nem uma atestação independente da origem. A própria PR reconhece essa limitação.

Não reconstruir os quatro SQLs a partir do schema atual. Recuperar artefatos originais/backup revisado ou aprovar formalmente uma estratégia de baseline/reconciliação. Nenhuma migration foi aplicada.

Laboratório:
- Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations.
- Duas funções de teste: upstatus-signal-test v32 (SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712) e upstatus-signal-e2e-once v3.
- SELECTs pós-auditoria encontraram zero usuários, mensagens, sessões, salas, membros, eventos, rate limits, call attempts, voice attempts, bindings, chat reads, buckets Storage e mensagens Realtime.
- Não executei scripts de fixture nem Candidate Checks mutáveis. O projeto é identificado como laboratório, mas não havia autorização explícita nesta rodada para mutar fixtures.

## AUTH-03 e setup: falha P1 no runtime implantado

Produção:
- public.users: 5 contas, 3 com role implementation_admin, 0 roles vazias e 0 password_hash vazios.
- Nenhuma coluna setup_token_* e nenhuma RPC consume_upstatus_setup_invite.
- Não existem em produção as RPCs consume_upstatus_signal_rate_limit ou merge_chat_read_receipts, nem as tabelas de signaling candidatas consultadas.

Inspeção das fontes implantadas:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- Ambas encaminham POST /api/setup diretamente para login(req,true) antes da verificação geral de sessão.
- GET /api/account?name= informa needsSetup.
- Se a conta não tem password_hash, login(req,true) permite definir senha sem token de convite.
- O código lê a conta, verifica password_hash e depois atualiza por nome sem condição atômica no UPDATE. Duas primeiras tentativas concorrentes podem passar pela leitura antes de qualquer gravação; o fluxo não tem o one-winner garantido pela RPC candidata.
- O fallback por nome atribui implementation_admin a Ricardo, Lohan e Guilherme se role estiver vazia.
- Normal exige senha mínima de 6 caracteres; Team Lite implantado exige 4.

Não há conta atualmente sem senha/papel, portanto não foi observada conta tomada nesta consulta. O risco é latente para conta futura/resetada e inclui corrida no primeiro setup. Classificação P1 por provisionamento sem convite e ausência de consumo atômico.

Candidatos #74/#76 incluem emissão autenticada de convite e consumo via RPC. No laboratório, consume_upstatus_setup_invite é SECURITY INVOKER, search_path vazio, EXECUTE somente service_role; atualiza somente conta sem senha e com token/hash/expiração válidos, normaliza papel vazio para implementation_user e preserva papel explícito. Isso é evidência de catálogo isolado, não produção.

## Realtime, RLS, grants e Storage

### Produção

SELECTs e catálogo confirmaram:
- realtime.messages: RLS habilitado, zero policies, grants SELECT/INSERT para anon e authenticated.
- 52 mensagens consultadas, todas private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0: 44 user_status e 8 db_change.
- upstatus_broadcast_messages() publica to_jsonb(OLD/NEW) completo com private=false. Inclui conteúdo e metadados de mensagens.
- upstatus_broadcast_remote_state() publica campos de comando/resultado; upstatus_broadcast_users() publica estado de usuário.
- As três funções são SECURITY DEFINER, search_path=public e EXECUTE efetivo para anon/authenticated. Todas são triggers. Não foi demonstrada chamada RPC direta ou entrega externa maliciosa nesta auditoria.
- Dez tabelas public têm RLS e zero policies.
- Nove tabelas public concedem privilégios diretos aos papéis clientes, incluindo TRUNCATE efetivo em nove tabelas. RLS não protege TRUNCATE.
- Default ACL count: 24; defaults de postgres em public/storage e supabase_admin em public/GraphQL incluem grants amplos.
- storage.objects: RLS, zero policies e SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
- Buckets chat-images e profile-images são públicos, limite 20 MiB cada.

Security Advisor de produção: 6 WARN (3 funções SECURITY DEFINER para anon e as mesmas 3 para authenticated) e 10 INFO (RLS sem policy). Performance e Health sem achados.

### Clientes e transporte

Inspeção de userscripts candidatos #74/#76:
- signaling_transport_enabled é opt-in e default false.
- endpoint de sinalização começa vazio.
- O tópico Realtime legado permanece configurado.
- Não há private:true nem realtime.setAuth() no cliente candidato.
- Quando a flag está desligada, o caminho público legado continua sendo o caminho ativo. Logo, a existência do adapter autenticado não fecha RT-01 no default instalado.
- O cliente Team Lite candidato usa upstatus-screen-share-live-3-1-1-beta10, enquanto os triggers PostgreSQL publicam no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. A divergência de tópico permanece.

Isto confirma um caminho público de publicação e uma configuração cliente não autenticada. Não foi reproduzido acesso externo, spoofing ou entrega de mensagem a terceiro. Classificar como CODE INSPECTION + catálogo, não exploração comprovada. RT-01 continua bloqueador.

### Laboratório

- 17 tabelas public com RLS e zero policies; zero grants diretos de tabela a anon/authenticated e zero TRUNCATE nas tabelas public consultadas.
- As três funções de broadcast no laboratório são SECURITY DEFINER, search_path vazio e sem EXECUTE para anon/authenticated.
- realtime.messages: RLS, zero policies, grants SELECT/INSERT a anon/authenticated, sem linhas.
- storage.objects: zero policies e grants de leitura/escrita para anon/authenticated; nenhum bucket configurado.
- Default ACL count: 25. Defaults de postgres em public estão restritos a postgres/service_role, mas postgres em storage e supabase_admin em public/graphql/graphql_public ainda mantêm defaults amplos.
- Security Advisor: 0 WARN / 17 INFO. Performance: 4 INFO de índices não utilizados. Health: nenhum achado.

## Edge Functions e deploy

Produção lista 38 Edge Functions ACTIVE; todas reportam verify_jwt=false. Isso não prova por si só ausência de autenticação: os handlers principais usam token de sessão customizado. A exceção material é o /api/setup descrito acima, que é roteado antes da autenticação geral. É necessária uma matriz de auth por função/rota; não desativar backups ou funções antigas por suposição.

Runtimes relevantes:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
- Produção não tem endpoint server-mediated dedicado upstatus-signal.
- Laboratório mantém upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

O workflow oficial team-lite-official ainda usa Supabase CLI latest e executa deploy de upstatus, não upstatus-team-lite. Despachá-lo poderia substituir o runtime Normal. O workflow master também usa CLI latest e publica somente upstatus, sem sequência coordenada beta10. #125/#128 oferecem um dispatcher candidato mais seguro, mas permanecem Draft, o job de deploy foi SKIPPED nos testes e a variável allowlist não foi configurada. Não despachar nenhum workflow oficial.

#124 signed upload continua apenas com regressões mockadas; não houve upload real. O cliente pode validar MIME/tamanho declarados, mas isso não prova os bytes reais. Com buckets públicos, publicar antes de validar o conteúdo cria janela de exposição. Exigir inspeção de bytes server-side ou bucket privado de quarentena/finalize antes de disponibilizar o objeto.

## Issues e aceitação manual

- Issue #78 permanece aberta. Oito critérios físicos continuam 0/8: perda real de internet, retorno sem F5, reentrada, novas chamadas, microfone/tela reais, múltiplas quedas, ausência de peers/pollers órfãos e interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 permanece aberta, 16/35 caixas marcadas e 19 pendentes no corpo atual. Parte dos itens marcados é histórico e não substitui aceitação dos HEADs atuais.
- Nenhum teste físico, Tampermonkey real, microfone/display real ou cross-client instalado foi executado nesta rodada.

## Veredito

**NÃO LIBERAR.**

Bloqueadores prioritários:
1. Recuperar os quatro SQLs históricos originais e validar sua proveniência; não reconstruir por inferência.
2. Restaurar consistência do histórico e main ACTIVE_HEALTHY. #126/#127 devem falhar fechados até isso.
3. Fechar AUTH-03 nos dois runtimes, com convite, consumo atômico e sem fallback administrativo por nome.
4. Tornar a sinalização server-mediated/autenticada o default seguro em Normal e Team Lite; retirar broadcasts públicos de conteúdo/comandos e provar membership/sender no servidor.
5. Corrigir o workflow Team Lite oficial para alvo correto e proteção equivalente; configurar allowlist humana #128 e verificar proteção do Environment/branches.
6. Integrar #120/#122 aos candidatos principais e executar regressão exata em ambos; anti-replay com chave nova continua requisito separado.
7. Validar migrations/RPCs e readiness HTTP no laboratório somente após autorização explícita para mutações controladas.
8. Revisar grants, Default ACLs, SECURITY DEFINER, Realtime e Storage.
9. Corrigir validação de bytes do signed upload e decidir privacidade dos buckets.
10. Corrigir o updateURL de master e completar os oito testes físicos da #78, com reviews humanas.

## Registro de segurança desta rodada

Nenhuma migration, SQL write, fixture, deploy, merge, release, workflow dispatch, publicação de userscript, alteração de secret/variable/flag/role/grant/policy/ACL ou operação destrutiva foi realizada. As consultas Supabase foram SELECT-only. Nenhum teste manual foi executado. A única escrita desta rodada é este documento na branch QA dedicada.


## Follow-up de validação e RPC isolada — 2026-11-09 12:45 UTC

- O Validate disparado pelo commit documental desta auditoria terminou em FAILURE no HEAD 9cab985336dc905ec8c3658fa6be9c54fa84e15c: [run 42619469852](https://github.com/Reekyi/UpStatus/actions/runs/42619469852). O log constrói PROD/TEST 3.4.7 e falha novamente em “production updateURL mismatch”. É a mesma assertion herdada de master; a nota não altera build nem validator.
- Confirmação adicional no laboratório: public.merge_chat_read_receipts existe como SECURITY INVOKER, search_path vazio, EXECUTE false para anon/authenticated e true somente para service_role. A função não existe em produção. O catálogo de produção também não contém tabelas/funções de signaling, setup invite ou rate limit consultadas.
- O inventário atual confirma 38/38 Edge Functions de produção ACTIVE e 38/38 com verify_jwt=false; isso não equivale automaticamente a endpoint sem auth, pois os handlers principais usam token customizado. Runtimes relevantes: upstatus v480 (SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd), upstatus-team-lite v15 (SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb) e upstatus-screen-share-3-1-1-beta10 v6 (SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29).
- O documento principal RELEASE_READINESS.md permanece preservado no blob SHA 7cfbd70886df42ce790c078c224b19284a632595; os SHAs dos commits e do blob desta auditoria são verificados no histórico do GitHub.


## Fechamento do HEAD documental — 2026-11-09 12:47 UTC

- Antes deste último append, QA estava em 7a9101412a964f4951cf010dd975779f468e75f4; comparação com master: 161 commits à frente, 1 atrás; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. O único commit de master não incorporado continua sendo o checkpoint documental 9d40461.
- Validate do HEAD 7a9101412a964f4951cf010dd975779f468e75f4: [run 42619842629](https://github.com/Reekyi/UpStatus/actions/runs/42619842629) FAILURE em scripts/validate.mjs:26, “production updateURL mismatch”, após build PROD/TEST 3.4.7.
- O catálogo isolado confirmou também merge_chat_read_receipts: SECURITY INVOKER, search_path vazio, sem EXECUTE para anon/authenticated e EXECUTE somente para service_role. A mesma RPC não existe em produção.
- O resultado do Validate é uma falha do contrato de build herdado de master, não da nota documental. Não houve mudança de código, validator ou workflow de engenharia.
