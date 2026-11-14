# Auditoria independente de QA do UpStatus — 10/11/2026 03:36 UTC

## Resultado executivo

**Recomendação: `not_ready`.** Os candidatos Normal e Team Lite passaram por checks relevantes em seus HEADs atuais, e a emissão de convites tem rate limit concorrente validado nas duas linhas. Isso não torna a produção segura: os runtimes implantados ainda usam setup legado, os broadcasts Realtime continuam públicos, o tópico do Team Lite candidato diverge do novo tópico do build Normal, o hardening de ACL/Storage não chegou à produção e há quatro migrations originais ausentes do repositório.

Esta rodada foi feita por inspeção read-only no GitHub e no Supabase. Não houve teste local, teste físico no Tampermonkey, SQL write, migration, deploy, merge, release, alteração de secrets/flags ou publicação de userscript. A única escrita técnica é este relatório novo na branch QA; o comentário QA existente da Issue #79 também foi atualizado conforme solicitado.

## 1. Heads e ancestralidade conferidos

| Escopo | Branch / HEAD observado | Relação com a base |
|---|---|---|
| master | `9d40461` | referência atual |
| PR #74 Normal | `chore/continuity-foundation` / `afc69bc41c283ff34cb87bfc9b5a1ab94cffe0bf` | 881 commits à frente e 1 atrás de master |
| PR #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` / `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 commits à frente e 0 atrás de team-lite-official |
| PR #76 Team Lite candidate | `team-lite/signaling-transport-candidate` / `c64e5d9f95b7021a208adf59fcb206cb0db78560` | 376 commits à frente e 0 atrás de team-lite-official |
| PR #82 QA | `qa/release-readiness-2026-11-04-master` / `bd771a85dd2596be343ff4ebf75496c340c5a5f4` | 177 commits à frente e 1 atrás de master |
| PR #130 Normal AUTH-03 | `feat/normal-setup-invite-rate-limit-20261109` / `a6c32324e6fe17a0783bad09637131d7893285fd` | 12 commits à frente e 2 atrás de chore/continuity-foundation |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | HEAD oficial consultado |
| PR #129 deploy guard | `fix/team-lite-disable-legacy-prod-dispatch-20261109` / `886d364d0c43af0d8aed867bf04c407478af5e8f` | candidato baseado no HEAD oficial observado |

A #130 está divergida da base por dois commits; antes de integrar, revisar o merge-base e repetir os checks no resultado integrado. A #74 também é uma branch longa e não deve ser tratada como fast-forward simples. Não fiz rebase.

## 2. CI, inspeção de código e revisão

| PR | Evidência no SHA auditado | Classificação |
|---|---|---|
| #74 Normal | Validate 42741455776 e Signaling Smoke 42741455775 passaram em push no SHA `afc69bc` | Push CI PASS; **não** foi encontrado check PR-triggered nem combined status no SHA exato |
| #75 Team Lite | Candidate Checks 41674353127 passou no SHA `7bbf9b9` | PR CI PASS histórico; baseline anterior, não substitui a #76 |
| #76 Team Lite | Candidate Checks 42746507197 passou no SHA `c64e5d9` | PR CI PASS no HEAD exato |
| #82 QA | Validate 42744322256 falhou no SHA `bd771a85` | PR CI FAIL no HEAD atual |
| #130 Normal AUTH-03 | Signaling Smoke 42741601731 passou no SHA `a6c3232` | PR workflow PASS no HEAD exato |
| #129 deploy guard | Team Lite Legacy Deploy Safety Guard 42670892535 passou no SHA `886d364` | PR CI PASS, mas candidato não integrado |

### Resultados detalhados

**PR #74 Normal**
- Push Validate e Signaling Smoke passaram.
- Smoke: 19/19 verificações não autenticadas e 136/136 autenticadas.
- Os testes automatizados cobrem WebRTC, chamadas, voz, compartilhamento de tela, mesh de três participantes e teardown.
- A etapa específica de rate limit de emissão de convites não faz parte do HEAD da #74. A consulta de workflows PR-triggered e o combined status do SHA retornaram vazios; portanto, os dois PASS observados não devem ser apresentados como checks obrigatórios de PR.

**PR #75 Team Lite**
- Candidate Checks 41674353127 é PASS histórico.
- É uma baseline anterior à linha de trabalho da #76; não somar esse resultado como uma segunda aprovação do candidato atual.

**PR #76 Team Lite**
- Candidate Checks 42746507197 passou no HEAD exato.
- 16/16 verificações não autenticadas e 110/110 autenticadas.
- O teste de rate limit enviou 24 chamadas concorrentes no primeiro bucket: 5 permitidas e 19 negadas; no segundo bucket, 6 chamadas: 5 permitidas e 1 negada.
- A primeira conta continuou bloqueada após o uso do segundo bucket; o reset da janela e a limpeza das fixtures também passaram.
- Os testes automatizados incluem chamadas WebRTC, voz, compartilhamento de tela, mesh de três participantes, convites e limpeza.

**PR #130 Normal AUTH-03**
- Signaling Smoke 42741601731 passou no HEAD `a6c3232`.
- 19/19 verificações não autenticadas e 136/136 autenticadas.
- O script de rate limit é o mesmo blob nas branches Normal e Team Lite e cobre os dois buckets, reset e cleanup.
- O HEAD está divergido da base por dois commits; o PASS do candidato não substitui validação após integração.

**PR #82 QA**
- Validate 42744322256 falhou no HEAD atual `bd771a85`.
- Log: `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`.
- Não alterei o validator nem fiz rerun.

**Revisão humana**
- A consulta de reviews retornou zero reviews para #74, #75, #76, #82 e #130.
- CI verde não substitui revisão humana nem autorização de release.

## 3. Compatibilidade Normal / Team Lite e Realtime

### Divergência nova nos bundles candidatos

A inspeção de `scripts/build.mjs`, do template Normal e do artefato Team Lite candidato encontrou uma incompatibilidade que os checks atuais não estão cobrindo:

- O build Normal define `PROD_TOPIC = upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, alinhado ao tópico dos triggers PostgreSQL.
- O userscript Team Lite candidato `team-lite/upstatus-team-lite.user.js` mantém hardcoded `upstatus-screen-share-live-3-1-1-beta10`.
- O build Team Lite incorpora esse arquivo estático por base64; não substitui o tópico durante o build.
- Nas duas versões candidatas, `signaling_transport_enabled` começa `false` e o endpoint começa vazio. O caminho padrão continua sendo o fallback Realtime legado.
- A função `upstatus-signal-test` existe apenas no laboratório. A produção não tem uma função `upstatus-signal` para o transporte autenticado de produção.

Consequência: mesmo que os dois candidatos tenham CI verde, o caminho padrão de broadcast permanece incompatível entre Normal e Team Lite após o build Normal mudar para o novo tópico. O transporte autenticado existe como caminho opt-in no código, mas não está habilitado por padrão nem tem endpoint de produção implantado. Os testes automatizados do caminho autenticado não comprovam o cutover padrão nem a interoperabilidade física entre as duas instalações.

### Fotografia do Realtime em produção

Consulta read-only das últimas 24 horas:

| Tópico | Evento | private | Mensagens |
|---|---|---:|---:|
| `upstatus-live-6f5e7b31-...` | db_change | false | 20 |
| mesmo | user_status | false | 13 |
| mesmo | remote_command | false | 3 |
| mesmo | remote_result | false | 3 |
| **Total** | | **39/39 false** | **39** |

Os triggers PostgreSQL publicam no tópico `upstatus-live-6f5e7b31-...`. Os userscripts efetivamente implantados Normal 3.4.7 e Team Lite 3.4.30 escutam `upstatus-screen-share-live-3-1-1-beta10`. O userscript embutido na função Screen Share beta10 v6 é 3.1.1-beta8 e também usa o tópico antigo.

Os três triggers de broadcast continuam como `SECURITY DEFINER`, `search_path=public`, com EXECUTE para `anon` e `authenticated`:
- `upstatus_broadcast_messages` publica a linha inteira por `to_jsonb(NEW/OLD)` no evento `db_change`.
- `upstatus_broadcast_remote_state` publica metadados de comandos e resultados remotos.
- `upstatus_broadcast_users` publica nome, status, motivo, atualização e sync.

A tabela `realtime.messages` tem RLS habilitado, zero policies e grants SELECT/INSERT para os papéis cliente. Sem policies, isso não prova leitura direta das linhas; a exposição confirmada nesta rodada é o broadcast `private=false` e a ausência de autenticação do remetente no caminho legado. Não fiz injeção externa nem exploração.

**Gate RT-01: blocked.**

## 4. AUTH-03: avanço parcial, produção ainda no fluxo legado

### Candidatos

Normal #130 e Team Lite #76 implementam emissão de convite com:
- Limite distribuído de 5 emissões por administrador a cada 900 segundos.
- Bucket identificado por prefixo e hash do administrador, sem gravar o nome em claro no bucket.
- HTTP 503 se a RPC falhar e HTTP 429 quando o limite for excedido.
- Setup com token hexadecimal de 64 caracteres, expiração e consumo atômico pela RPC de convite.

O teste concorrente passou nos dois candidatos. A tabela de rate limit usa RLS, não tem policies para clientes, não concede privilégios a anon/authenticated e reserva acesso ao service_role. A RPC é `SECURITY INVOKER`, tem `search_path` vazio e EXECUTE apenas para service_role no laboratório.

### Lacunas

- O rate limit cobre **emissão de convites**, não tentativas de login nem tentativas de setup.
- Os runtimes implantados continuam no fluxo antigo: `POST /api/setup` chama `login(req,true)` sem token de convite e sem consumo atômico.
- Produção não tem `setup_token_*`, tabela `upstatus_setup_invite_rate_limits`, RPC de consumo de convite ou RPC de rate limit.
- Produção tem 5 usuários; a consulta agregada encontrou zero usuários sem senha e zero sem papel. Isso não elimina o risco de primeiro setup futuro.
- O runtime Normal v480 exige senha mínima de 6 caracteres; Team Lite v15 exige 4 no login legado. O fallback por nome para papel administrativo ainda existe nos runtimes antigos.

### Migration de produção versus test migration

A branch candidata contém `supabase/migrations/20261109230000_setup_invite_rate_limit.sql`. O histórico remoto do laboratório **não** contém essa versão. O laboratório contém `20261110000612_setup_invite_rate_limit_contract_test_20261109`, que cria DDL equivalente e executa assertions de RLS, ACL, SECURITY INVOKER e search_path. É uma validação útil do contrato, mas não prova que a migration de produção foi aplicada ao laboratório.

Após os checks, a consulta de contagem encontrou zero usuários, sessões, mensagens, chat reads, salas, membros, eventos, bindings, tentativas de chamada/voz, rate-limit buckets e mensagens Realtime no laboratório.

**Gate AUTH-03: in_progress.** O caminho de convite candidato avançou; a produção e o rate limit de login/setup continuam pendentes.

## 5. RLS, grants, SECURITY DEFINER e Storage

Fotografia read-only de produção:

| Verificação | Resultado |
|---|---:|
| Tabelas públicas com RLS habilitado e sem policies | 10 |
| Tabelas públicas com grants diretos a papéis cliente | 9 |
| Grants de cliente que incluem TRUNCATE | presentes nas 9 tabelas |
| Policies em `storage.objects` | 0 |
| Buckets públicos | 2 |
| Limite configurado dos buckets | 20 MiB cada |

A consulta de `pg_default_acl` no schema public encontrou **6 registros e 24 ACL items**. Correção de contagem: são 6 registros de default ACL, não 24 registros. Há ACLs para os papéis cliente e service_role; a revisão de defaults precisa ser feita por owner e tipo de objeto, sem confundir ACLs gerenciadas por schemas Supabase.

`storage.objects` tem RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE/DELETE para anon e authenticated. Sem policy, o RLS não autoriza operações por si só; ainda assim, os grants são excessivos e os dois buckets públicos permitem leitura pública dos objetos publicados.

Buckets:
- `chat-images`: público, 20 MiB.
- `profile-images`: público, 20 MiB.

Os runtimes Normal e Team Lite têm `signedUploadRoute` que confia no MIME e no tamanho declarados pelo cliente ao emitir a URL assinada; não inspeciona os bytes antes de criar a URL. O helper `sniffMime` retorna o MIME declarado quando não reconhece uma assinatura. O caminho assinado não usa esse helper para validar o conteúdo.

As três funções de broadcast SECURITY DEFINER continuam com `search_path=public` e EXECUTE para anon/authenticated. São funções de trigger que retornam `trigger`; não alego que demonstrei chamada RPC direta.

**Gate ACL-STORAGE: blocked.**

## 6. Edge Functions e ambiente de teste

### Produção

A listagem retornou 38 Edge Functions ativas; todas reportam `verify_jwt=false`. Isso isoladamente não prova ausência de autenticação, pois os três handlers principais usam autenticação própria por token. Foram inspecionados diretamente:
- `upstatus` v480.
- `upstatus-team-lite` v15.
- `upstatus-screen-share-3-1-1-beta10` v6.

A função Screen Share beta10 v6 embute um userscript beta8. Não auditei individualmente os 38 handlers; a conclusão de autenticação se limita aos três runtimes principais e às funções de broadcast identificadas.

### Laboratório

O projeto isolado tem 39 migrations e duas funções ativas:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.

Não existe projeto full-product TEST independente na conta; a listagem retornou apenas produção e laboratório. O laboratório está separado e terminou limpo após o CI, mas não substitui um ambiente full-product com os runtimes e bundles de produção.

**Gate TEST-ISOLATION: in_progress.** O laboratório isolado está funcional e limpo; o ambiente full-product TEST continua ausente.

## 7. Migrations e proveniência

Produção tem 7 migrations remotas:
- `20261005160000 upstatus_cloud`
- `20261005173000 remote_realtime`
- `20261005180000 client_presence`
- `20261023154754 create_upstatus_visual_config`
- `20261026195855 add_chat_message_file_name`
- `20261027154329 allow_chat_document_mime_types`
- `20261027155438 set_upstatus_upload_limits_20mb`

Os quatro últimos SQLs originais retornam 404 em `master`; o histórico remoto os registra, mas o repositório não contém a proveniência original. A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview status reporte `ACTIVE_HEALTHY`.

Não reconstruí SQLs a partir do schema e não apliquei migrations.

**Gate MIGRATION-PROVENANCE: blocked.**

## 8. Workflow oficial Team Lite

O workflow atual em `team-lite-official` ainda contém `workflow_dispatch`, environment `production`, secrets `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_ID`, setup da CLI e comando `supabase functions deploy upstatus`. O slug `upstatus` pertence ao Normal, não ao Team Lite.

A PR #129 substitui esse workflow por um guard fail-closed, sem secrets, sem CLI Supabase e sem job de deploy; o guard usa permissões `contents: read`, checkout pinado por SHA e testa o commit exato. O teste offline do guard passou em 42670892535. A PR continua aberta/Draft e não foi integrada. O workflow inseguro continua na branch oficial. Não despachei o workflow.

## 9. Issues, testes manuais e gates

- Issue #78: 0/8 critérios físicos concluídos. Não houve instalação/teste físico no Tampermonkey nesta rodada.
- Issue #79: o corpo ainda mostra checklist histórico 16/35; os comentários de status são a fonte mais recente. O comentário QA existente foi atualizado, sem duplicata e sem alterar o comentário da Engenharia.
- Reviews humanas: zero nas PRs #74, #75, #76, #82 e #130.
- Nenhum teste manual, físico ou local foi executado nesta rodada. Os resultados de voz/tela/chamada citados acima são CI automatizado, não aceitação no navegador do usuário.

| Gate | Estado | Evidência principal |
|---|---|---|
| RT-01 | blocked | 39 broadcasts private=false; tópicos incompatíveis; transporte autenticado desligado por padrão |
| TEST-ISOLATION | in_progress | laboratório separado e limpo; full-product TEST ausente |
| MIGRATION-PROVENANCE | blocked | quatro SQLs remotos sem fonte em master; main MIGRATIONS_FAILED |
| AUTH-03 | in_progress | rate limit de emissão passou em Normal e Team Lite; login/setup e produção ainda legados |
| ACL-STORAGE | blocked | 10 tabelas RLS sem policies, 9 com grants, Storage sem policies e buckets públicos |
| RECONNECT | pending | Issue #78 0/8; nenhum teste físico sem F5 |
| HUMAN-REVIEW | pending | nenhuma review humana e nenhuma autorização explícita de release |

## 10. Ação manual necessária

Ricardo precisa executar os oito critérios da Issue #78 nas instalações reais Normal e Team Lite no Tampermonkey, especialmente:
1. Desconectar a internet por cerca de 10 segundos durante uso.
2. Confirmar reconexão sem F5 nas duas versões.
3. Reentrar em sala e iniciar/receber novas chamadas.
4. Verificar microfone e compartilhamento de tela.
5. Confirmar ausência de peers, áudio e pollers duplicados.
6. Confirmar interoperabilidade Normal ↔ Team Lite.

Não marquei RECONNECT como concluído por causa de Playwright ou simulação.

## 11. Limites e segurança da execução

- GitHub: inspeções de branches, commits, PRs, reviews, workflows, logs e arquivos; uma escrita documental aditiva nesta branch QA.
- Supabase: listagens e consultas SQL exclusivamente SELECT/read-only; nenhuma alteração de schema, dados, secrets, flags, migration ou function.
- Não houve merge, deploy, release, dispatch, publicação de userscript ou operação destrutiva.
- Não houve teste local ou físico; o relatório distingue esses limites de CI e inspeção estática.

**Conclusão: `not_ready`.** Os checks candidatos de Team Lite e Normal estão melhores, mas a diferença de tópico entre os bundles candidatos, o transporte autenticado desligado por padrão, o setup legado em produção, ACL/Storage, migrations e aceitação física impedem a liberação.
