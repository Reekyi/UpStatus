# Auditoria independente UpStatus — 2026-11-09

## Escopo e método

Auditoria independente do userscript/app UpStatus integrado ao Sale Smartly: presença, chat, chamadas de voz e compartilhamento de tela. Esta rodada utilizou GitHub e Supabase em modo de leitura, inspeção de fontes e logs de workflows já existentes.

Não foram executados testes manuais no navegador, chamadas HTTP de validação contra as Edge Functions, scripts de integração com fixtures ou qualquer operação de escrita no Supabase. Não houve migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva.

## Documento de referência e heads

O documento obrigatório `docs/RELEASE_READINESS.md` foi lido na branch QA. Blob SHA preservado: `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint dentro do documento é de 2026-11-08 15:30 BRT / 18:30 UTC; portanto, ele ainda não incorpora os avanços de 09/11 descritos nas PRs #109, #111, #112 e #113. O documento principal não foi alterado.

Heads reais conferidos antes desta nota:

| Branch | HEAD | Protegida | Required checks |
|---|---|---:|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | Não | Enforcement off |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Não | Enforcement off |
| `qa/release-readiness-2026-11-04-master` | `cc0d4d0f78c664f9d776284c545df368f76110a2` | Não | Enforcement off |

QA está 146 commits à frente e 1 atrás de master; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. O commit master-only é documental. Não foi feito rebase nem incorporação automática. A PR #82 aponta para o mesmo HEAD QA `cc0d4d0f...`.

A ausência de proteção nas branches oficiais e na QA, somada à ausência de required status checks, é um risco de governança: CI verde não é uma barreira obrigatória para atualização das branches.

## PRs, commits e CI

Todas as PRs consultadas permanecem abertas/Draft. Não foram encontradas reviews humanas nas PRs #74, #75, #76, #82, #109, #111, #112 e #113.

| PR | HEAD atual | Evidência observada | Classificação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | [Validate 42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) e [Signaling Smoke 42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS | Automatizado PASS |
| [#75 baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico, não substitui #76 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | [Candidate Checks 42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS | Automatizado PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `cc0d4d0f78c664f9d776284c545df368f76110a2` | [Validate 42551591404](https://github.com/Reekyi/UpStatus/actions/runs/42551591404) FAILURE | Bloqueado |
| [#109 capacidade](https://github.com/Reekyi/UpStatus/pull/109) | `9294f47a9dbea7038d34b74fdc53e958804e2d51` | [Validate 42554593978](https://github.com/Reekyi/UpStatus/actions/runs/42554593978) SUCCESS | Contrato/offline PASS |
| [#111 Team Lite idempotency adapter](https://github.com/Reekyi/UpStatus/pull/111) | `d65c3a6e42b5adba4303fcd510747839eca25b20` | [Offline guard 42554841729](https://github.com/Reekyi/UpStatus/actions/runs/42554841729) SUCCESS | Guard estático PASS |
| [#112 Normal idempotency](https://github.com/Reekyi/UpStatus/pull/112) | `a7d6950fa0835e2c296318b2f431256f0fca3ab5` | [Validate 42555495928](https://github.com/Reekyi/UpStatus/actions/runs/42555495928) SUCCESS | Contrato/offline PASS |
| [#113 DB readiness](https://github.com/Reekyi/UpStatus/pull/113) | `41982e8eb7a9347ce54d2e22cec76eaeb08ac99a` | [Validate 42557387067](https://github.com/Reekyi/UpStatus/actions/runs/42557387067) SUCCESS | Contrato/offline PASS |

O log do #82 confirma build 3.4.7 / TEST 3.4.7 seguido de `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`. O fix existe na candidata #74, mas ainda não está em master.

O corpo da #109 ainda cita o HEAD anterior `94d43f...`; o HEAD real é `9294f47...`, cujo Validate atual é 42554593978. A PR #110 foi explicitamente supersedida pela #112 e não deve ser integrada.

A #112 está 16 commits à frente / 0 atrás do HEAD atual da #109. A #113 está 25 commits à frente / 0 atrás da #112. A #113 tem Validate SUCCESS no HEAD atual; o comentário de engenharia em #79 ainda cita o checkpoint anterior e não registra o run 42557387067.

A #111 está 5 commits à frente e 1 atrás da base #103 (`de2c6a92154ece2f8a313d2bafedf02170bb5f5a`). O guard offline passou, mas a branch deve ser atualizada/reconciliada antes de integrar e revalidar. O workflow completo Team Lite, que muta fixtures no laboratório compartilhado, foi intencionalmente evitado.

## Capacidade de salas — PR #109

A candidata adiciona `invite_upstatus_signal_room_member` e `accept_upstatus_signal_room_invitation`. As RPCs são VOLATILE, SECURITY INVOKER, `search_path` vazio e EXECUTE restrito a service_role. O fluxo bloqueia a sala antes das memberships e verifica a capacidade de 32 participantes aceitos antes de escrever. Sala cheia deve retornar HTTP 409 / `ROOM_FULL`.

Migration candidata: `20261109010000_enforce_signal_room_member_capacity.sql`, blob SHA `eeae5af9efb2d8a2334aa153106570a33918cfdd`.

O Validate aprovou contratos estáticos e sintaxe do harness, não a concorrência HTTP real. A migration não foi aplicada e o harness não foi executado.

### Risco no harness

O arquivo atual `scripts/test-signal-room-capacity.mjs`, blob SHA `1ba969c1e7feba1750a21e58f7a68de9543ec019`, continua com duas lacunas:

1. O preflight verifica os marcadores de `/health` e tabelas vazias, mas não chama `/ready` nem exige `X-UpStatus-Signal-Readiness: database-v1`. Os marcadores de health são marcadores de código, não prova de que todas as RPCs e migrations estão prontas. A nova readiness deveria ser verificada antes da primeira escrita de fixture.
2. O bloco `finally` executa os DELETEs sequencialmente sem captura individual. Se um DELETE falhar, os próximos DELETEs e as verificações finais de tabela vazia não rodam; a falha de limpeza também pode mascarar a falha original. É necessário tentar todas as exclusões, acumular erros e sempre executar a verificação final.

O harness exige projeto allowlisted, `UPSTATUS_SIGNAL_ALLOW_MUTATION=1` e preflight vazio. A allowlist do código não substitui autorização explícita de QA para mutação. Nenhum teste com fixtures foi executado.

A regra de voz aberta da issue #78 continua sem convite/aceitação. A #109 cobre salas genéricas de chamada e não deve alterar o contrato de open join de voz.

## Idempotência de eventos — PRs #111 e #112

A migration candidata `20261109030000_signal_event_idempotency.sql`, blob SHA `30a534b5228e502f73d835d1f0535083186cf794`, cria um ledger com chave primária `(room_id, sender, idempotency_key)`, hash SHA-256 do request canônico e retenção até a exclusão da sala. A RPC `enqueue_upstatus_signal_events` é VOLATILE, SECURITY INVOKER, `search_path` vazio, service_role-only, usa locks room-first/membership e grava ledger e eventos atomicamente.

Comportamento coberto:
- Mesma chave + mesmo request: retorna resultado original sem re-enfileirar.
- Mesma chave + payload diferente: HTTP 409 / `IDEMPOTENCY_KEY_REUSED`.
- Unicast e broadcast passam pela RPC; a exceção de join request é limitada ao fluxo validado de request-invite.

A adapter gera chave aleatória de 128 bits com `crypto.getRandomValues`, aceita chave explícita e anexa a chave ao erro para possível retry. Fonte compartilhada: blob SHA `0e451e0c52a02bdc8828c7191e53f91b34a5a408`. Bundle Team Lite inspecionado: blob SHA `482c83ea7091f9e5229b0cb994bcf3e6f5b81127`.

### Limite de segurança ainda aberto

A implementação é **idempotência por chave**, não proteção completa contra replay malicioso. A chave é escolhida pelo cliente. O banco não tem unicidade por hash do request, nonce emitido pelo servidor ou sequência monotônica por remetente. Portanto, um emissor autenticado pode reenviar o mesmo SDP/ICE com uma chave nova e gerar outro evento. O rate limit reduz volume, mas não transforma isso em rejeição de replay.

O teste de contrato e o harness cobrem repetição com a mesma chave e conflito de payload com a mesma chave; não cobrem o mesmo payload com uma chave nova. O adapter expõe `error.idempotencyKey`, mas a inspeção do bundle não encontrou um consumidor que guarde e reutilize essa chave no retry; chamadas sem chave explícita geram uma nova chave por invocação. O retry de uma operação lógica precisa persistir/reutilizar a mesma chave no call site.

Classificação: a deduplicação de retry com mesma chave está coberta por contrato offline; replay com chave nova e retry real de call site permanecem pendentes.

## Readiness de banco — PR #113

A migration candidata `20261109040000_signal_database_readiness.sql`, blob SHA `0eccd306d22c84e29e38d9bc730fdf266922c815`, cria uma RPC STABLE, SECURITY INVOKER, `search_path` vazio e EXECUTE apenas para service_role. Ela verifica tabelas requeridas, RLS, colunas, privilégios de service_role e RPCs do handler. Cada RPC do handler precisa ser VOLATILE, SECURITY INVOKER, usar search_path vazio, permitir EXECUTE para service_role e negar EXECUTE a anon/authenticated.

A Edge Function separa liveness `GET /health` de readiness `GET /ready`; a rota pública retorna somente 200/503 genérico, sem expor nomes internos das dependências. Os contratos offline passaram no Validate 42557387067.

Limite: migration e função não foram aplicadas; nenhum GET /ready real foi chamado. O CTE de readiness executado como SELECT é relatado no corpo da PR #113; nesta rodada confirmei por catálogo que as dependências candidatas ainda estão ausentes, mas não reapliquei esse CTE.

## Supabase: estado e catálogo

### Projetos

Produção `dlfvkawaiqduhlazsszm`:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- 7 migrations aplicadas.
- 38 Edge Functions ACTIVE.
- Branch gerenciada `main`: MIGRATIONS_FAILED; preview ACTIVE_HEALTHY. Causa ainda não identificada.

Laboratório `bfpjtfqlnypisxljoxkb`:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- 38 migrations, última `20261108050802`.
- Sem branches Supabase.
- Duas funções de teste: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Não existe terceiro projeto TEST full-product.

### Edge Functions e versões implantadas

Produção:
- `upstatus` v480, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, userscript 3.4.7.
- `upstatus-team-lite` v15, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, userscript 3.4.30.
- API beta10 v6, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- Nenhuma função `upstatus-signal` implantada.

Laboratório:
- `upstatus-signal-test` v32, source SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`.
- A fonte v32 não contém o ledger de idempotência, marcador de capacidade, rota `/ready` nem marcador de readiness.

A consulta de catálogo no laboratório confirmou:
- `public.upstatus_signal_event_idempotency` ausente.
- `public.upstatus_signal_readiness()` ausente.
- RPCs candidatas de capacidade e enqueue ausentes.
- Tabelas de sinalização existentes com RLS habilitada, sem grants diretos a anon/authenticated nas operações auditadas; service_role mantém os privilégios necessários.
- Zero linhas nas tabelas consultadas de users, sessions, rooms, memberships, bindings, events, call attempts, voice attempts e rate limits.

As migrations de capacidade, idempotência e readiness continuam somente no GitHub. Não foram aplicadas no laboratório nem em produção.

### AUTH-03

Produção: zero colunas `setup_token_*` em `public.users` e RPC `consume_upstatus_setup_invite` ausente.

Laboratório: quatro colunas (`setup_token_hash`, `setup_token_expires_at`, `setup_token_issued_by`, `setup_token_issued_at`) e RPC `consume_upstatus_setup_invite(p_user_name text, p_setup_token_hash text, p_password_hash text)`, SECURITY INVOKER, VOLATILE, `search_path` vazio. Não foi alterado nenhum dado.

### RLS, grants, SECURITY DEFINER e Advisors

Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas concedem a anon/authenticated privilégios amplos, incluindo TRUNCATE; RLS sem policies não protege TRUNCATE.
- Security Advisor: 6 WARN / 10 INFO.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, retornam trigger, usam `search_path=public` e têm EXECUTE efetivo para anon/authenticated. O Advisor as reporta como acessíveis por `/rest/v1/rpc/...`; não executei requisição HTTP para comprovar a exposição efetiva, mas os grants e o aviso permanecem pendentes de resolução.

Laboratório:
- Security Advisor: 0 WARN / 17 INFO; Performance Advisor: 4 INFO de índices não utilizados; Health Advisor sem achados.
- As três funções de broadcast também são SECURITY DEFINER, mas usam `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role.
- Default ACLs de postgres em public estão mais restritas; defaults de storage e de supabase_admin em public/graphql/graphql_public continuam amplos.

### Realtime

Produção:
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; anon/authenticated têm SELECT/INSERT/UPDATE efetivos.
- 50 mensagens consultadas, todas `private=false`: 42 `user_status` e 8 `db_change`.
- Triggers publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os userscripts Normal 3.4.7 e Team Lite 3.4.30 embutidos nas funções implantadas assinam `upstatus-screen-share-live-3-1-1-beta10`. Os tópicos não coincidem.
- `upstatus_broadcast_messages` publica a linha OLD/NEW completa em `db_change`; `upstatus_broadcast_remote_state` publica campos de comando/resultado; `upstatus_broadcast_users` publica estado do usuário. Os eventos são públicos.

Laboratório:
- Triggers usam `search_path` vazio, payload minimizado para `{"op": TG_OP}` e EXECUTE revogado de anon/authenticated.
- Ainda usam `private=false`; não há linhas nem partições em `realtime.messages` no laboratório.

Os clientes implantados continuam usando broadcast público para call_signal, voz e screen-share. Não foi demonstrado acesso externo; a configuração de public access do Dashboard não foi exposta pelo conector.

### Storage

Produção:
- `chat-images`: público, 20 MiB; MIME inclui imagens, vídeo, áudio e documentos.
- `profile-images`: público, 20 MiB; MIME de imagem.
- `storage.objects`: RLS true, zero policies; grants SELECT/INSERT efetivos para anon/authenticated.
- A política de privacidade dos anexos continua sem decisão. Nenhuma leitura ou escrita de objeto foi executada.

## Workflows de publicação

### Normal oficial em master

Workflow blob SHA `8252c6c6e7005c98625603b5b02b14cb1e50a519`:
- Manual-only.
- Exige versão exatamente 3.4.7.
- Usa Supabase CLI `latest`.
- Não faz checkout explícito de SHA aprovado nem valida identidade do projeto ou histórico de migrations.
- Publica somente `upstatus`.

O `release.json` de master (blob `93caf1701ea508575c90d002c0b8c3037b34d82a`) aponta scriptUrl para `/functions/v1/upstatus/upstatus.user.js`; o build de master (blob `51fd9983c53ad88cd269b251423bfc3439131139`) deriva updateURL do endpoint beta10. Essa divergência coincide com a falha de Validate da #82. O workflow oficial está bloqueado pelo próprio Validate atual.

Existe um workflow candidato mais seguro no stack da PR #89 (blob `c36ab9b5ec09546f0562b742fc351e5fe74d8d07`), ainda fora de master. Ele exige refs master e SHA exatos, verifica projeto/organização, cutover, histórico AUTH-03 por GET read-only, fixa CLI 2.122.1 e publica beta10 antes do userscript. O candidato continua bloqueado porque release.json permanece 3.4.7 e produção ainda tem apenas sete migrations. Não foi despachado.

### Team Lite oficial

Workflow blob SHA `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`:
- Lê o `release.json` raiz, que está em 3.0.40 / beta.22, e rejeita o pré-release.
- O manifesto específico `team-lite/release.json` está em 3.4.30 stable, mas o build não o utiliza.
- O build Team Lite (blob `afea263830a171a37121f3d74c3adb4c2334ccf8`) define `PROD_FUNCTION=upstatus`; o workflow também executa `supabase functions deploy upstatus`, não `upstatus-team-lite`.
- O build define tópico `upstatus-live-6f5e...`, enquanto o userscript Team Lite atualmente implantado assina `upstatus-screen-share-live-3-1-1-beta10`.

Não despachar esse workflow. Se o guard de pré-release fosse contornado, a sequência poderia publicar artefato Normal no slug Normal.

## Issues

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios físicos marcados. Exige queda real de rede, recuperação sem F5, reentrada, novas chamadas, microfone/tela reais e interoperabilidade instalada Normal ↔ Team Lite. A regra funcional mantém sala de voz aberta, sem convite/aceitação.
- [#79 release readiness](https://github.com/Reekyi/UpStatus/issues/79): OPEN, corpo com 16/35 checkboxes marcados. O número é histórico, não um percentual de prontidão. O comentário mais recente registra #113, mas não o Validate 42557387067 do HEAD atual.

## Bloqueios e próximos gates

1. Não chamar a implementação #112 de proteção completa contra replay até cobrir chave nova para payload repetido; decidir se o requisito é deduplicação de retry ou anti-replay contra emissor autenticado.
2. Persistir a idempotency key por operação lógica no cliente e comprovar que o retry real reutiliza a mesma chave.
3. Atualizar o harness para exigir GET /ready antes de qualquer fixture e tornar cleanup best-effort por tabela, com agregação de falhas e assert final sempre executado.
4. Coordenar explicitamente uma janela de laboratório; somente após autorização de mutação, aplicar as migrations candidatas no projeto allowlisted, atualizar a função de teste e executar HTTP capacity/replay/readiness. Não usar produção.
5. Atualizar a branch #111 sobre a base #103 e executar validação combinada Normal/Team Lite sem mutar o laboratório compartilhado sem autorização.
6. Tornar transporte autenticado obrigatório nas duas versões, retirar broadcasts públicos sensíveis e alinhar tópicos antes de qualquer cutover.
7. Resolver grants de tabelas, EXECUTE das SECURITY DEFINER, Default ACLs, payloads Realtime e política de Storage com owner autorizado.
8. Corrigir workflow Team Lite e trazer o workflow Normal endurecido para a linha oficial; fixar CLI, projeto, SHA, migration preflight e alvo correto.
9. Proteger master/team-lite-official, exigir CI no HEAD e review humana.
10. Diagnosticar MIGRATIONS_FAILED, planejar AUTH-03 separadamente e concluir os oito testes físicos da #78.

## Veredito

**NÃO LIBERAR.**

Há avanços reais e CI aprovado para os contratos de capacidade, idempotência e readiness. Isso é inspeção automatizada/offline, não comprovação do runtime implantado. O laboratório continua em v32, as migrations candidatas não foram aplicadas, o transporte autenticado não existe em produção e os clientes implantados continuam no caminho público de Realtime.

Nesta rodada, todas as consultas SQL foram SELECT-only. Não houve escrita no Supabase, execução de harness, criação de fixtures, teste manual, deploy, merge, release, publicação de userscript ou alteração de secrets, flags, roles, grants, policies ou ACLs. A única escrita desta rodada é esta nota documental na branch QA.
