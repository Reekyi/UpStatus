# Auditoria independente UpStatus — 07/11/2026, revalidação ao vivo (~18:30 BRT)

## Escopo e classificação

Projeto: `Reekyi/UpStatus`, userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Ambientes Supabase:
- Produção: `dlfvkawaiqduhlazsszm`.
- Laboratório isolado: `bfpjtfqlnypisxljoxkb`.

Esta rodada leu primeiro `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`. Blob SHA confirmado: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0` (6.221 linhas). O arquivo principal foi preservado.

Classificações usadas:
- **CI PASS**: workflow concluído com sucesso no SHA indicado.
- **Inspeção de código/catálogo**: leitura estática de código, configuração ou catálogo; não equivale a teste de execução.
- **Manual pendente**: não há evidência de aceitação física.
- **Bloqueado**: dependência, risco ou falha que impede gate de release.

## Resumo executivo

1. Normal #74 e Team Lite #76 passaram nas suítes automatizadas dos HEADs consultados, incluindo integração autenticada, WebRTC, recuperação durável, concorrência, rate limit, read receipts e setup invite.
2. **Novo achado de autorização no Team Lite**: `POST /api/chat/clear` exige sessão válida, mas autoriza apenas por `name === "Ricardo"`; não confere o papel persistido. O Normal candidato exige também `admin(name)`. A rota apaga todas as mensagens e tenta remover os objetos de chat-images. A mesma condição por nome está no runtime Team Lite de produção v15.
3. A regressão não é coberta pelo workflow Team Lite: `team-lite-candidate-check.mjs` não contém asserção específica para `/api/chat/clear`, e `.github/workflows/team-lite-candidate.yml` não executa `scripts/chat-regression.test.mjs`.
4. O workflow TEST inseguro continua em `develop`; a correção está na PR #84 Draft e não está integrada.
5. A migração de signaling autenticado continua opt-in nos dois candidatos: `signaling_transport_enabled` default `false`, endpoint vazio. O Realtime legado continua sendo o caminho padrão.
6. Produção continua com broadcasts públicos de conteúdo de mensagens, setup legado, grants/default ACLs excessivos e Storage público.
7. Não existe ambiente TEST full-product. O laboratório tem apenas duas Edge Functions de signaling/auth e não possui buckets de chat/perfil nem partições de `realtime.messages`.

## Heads e PRs

Comparações atuais (ahead/behind):

| PR | HEAD | Base | Ahead / behind | Estado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `a79ec9a922eaa064d2982bf650dbd7a6d186e9bd` | master | 852 / 0 | Open, Draft |
| [#75 baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 / 0 | Open, Draft |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `26122c55fd453882f92094e12c09914d77b11b07` | team-lite-official | 314 / 0 | Open, Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `8fd27d0c30d188a65d1ce6e6a44778de109035eb` | master | 108 / 0 | Open, Draft |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | develop | 30 / 0 | Open, Draft |
| [#85 updater/security](https://github.com/Reekyi/UpStatus/pull/85) | `17554523ef51bafd503e74b3f1271d55f43a6eda` | master | 21 / 0 | Open, Draft |

Reviews consultadas: nenhuma aprovação humana nas seis PRs. #76 é continuação de #75, não payload independente. #74 e #85 têm sobreposição em arquivos de build, validação, servidor e userscript; reconciliar o diff antes de integração.

### CI por SHA exato

- #74 HEAD `a79ec9a9`: [Validate 42409229531](https://github.com/Reekyi/UpStatus/actions/runs/42409229531) SUCCESS; [Signaling Smoke 42409229487](https://github.com/Reekyi/UpStatus/actions/runs/42409229487) SUCCESS. O log do Smoke registra 129/129 checks autenticados, WebRTC de chamada/voz/tela com tracks remotas, mesh de três participantes, 90 aceitas + uma HTTP 429 com Retry-After 60s, concorrência de signaling, recibos atômicos, setup invite e cleanup.
- #76 HEAD `26122c55`: [Candidate Checks 42414281711](https://github.com/Reekyi/UpStatus/actions/runs/42414281711) SUCCESS. Log confirma 16/16 não autenticados, 103/103 autenticados, browser WebRTC call/voice/screen, mesh de três participantes, rate limit 90+1/429, read receipts, setup invite, regressões de leave/rejoin/reload e cleanup.
- #75: [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico; não substitui a validação do HEAD atual de #76.
- #84 HEAD `21341f33`: [Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) SUCCESS. É validação do guard, não deploy real.
- #85 HEAD `17554523`: [Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) SUCCESS. Upload assinado e regressões de chat foram testados com mocks/VM; não houve upload real no Storage.
- #82 HEAD `8fd27d0c`: [Validate 42412118724](https://github.com/Reekyi/UpStatus/actions/runs/42412118724) FAILURE em `VALIDATION FAILED: production updateURL mismatch` (linha 26 de `scripts/validate.mjs`). O log confirma build TEST e falha na asserção herdada; não é evidência de teste funcional falho do produto. Não enfraquecer o validador.

Os testes de integração que escrevem fixtures foram executados pelos workflows existentes no projeto isolado, com `UPSTATUS_SIGNAL_ALLOW_MUTATION=1` e secret de serviço do laboratório. A auditoria apenas leu os logs e verificou o estado posterior; não iniciou, repetiu ou cancelou workflows.

## Achado novo: autorização de limpeza de chat no Team Lite

**Prioridade: alta, gate de correção antes de release.**

Arquivos e blobs:
- Team Lite servidor candidato: `src/server/team-lite-index.template.ts`, blob `099d343d977be8f127bacb6d3988cfe90c4fc412`.
- Normal servidor candidato: `src/server/index.template.ts`, blob `c7de6c4b8677fd829f512b224db3157e506cf2ad`.
- Team Lite userscript: `team-lite/upstatus-team-lite.user.js`, blob `0e0660a6abc26052e67b9b1832a75fde7bc0b06e`.
- Team Lite check: `scripts/team-lite-candidate-check.mjs`, blob `18a56435370673980118b0a32e01192ec429481c`.
- Workflow: `.github/workflows/team-lite-candidate.yml`, blob `f6c944af6da611e05c5aa125b7b8ac6a0daf96bf`.

No Team Lite candidato, após o gate de sessão `if(!ctx) 401`, a rota faz:

`if(name!=="Ricardo") return 403`

e em seguida seleciona todas as mensagens, apaga todas as mensagens e tenta remover os arquivos correspondentes em `chat-images`. Não chama `admin(name)`.

O contexto de sessão é derivado do token `x-upstatus-token`; `userFromToken` resolve o nome da sessão. A função `admin(name)` consulta o papel armazenado e retorna true somente para `implementation_admin`. Portanto, o achado **não é uma rota anônima nem prova que qualquer usuário possa apagar o chat**: exige uma sessão válida associada à conta Ricardo. O problema é que a autorização por papel é ignorada; se o papel dessa conta for revogado/rebaixado, o endpoint continua permitindo a operação destrutiva.

O Normal candidato exige as duas condições: nome Ricardo **e** `await admin(name)`. O Team Lite UI também mostra o botão e chama a ação apenas por comparação do nome, sem verificar o papel. O runtime Team Lite de produção v15 tem a mesma condição por nome; a fonte implantada de Normal v480 também mantém a condição antiga por nome, enquanto o candidato Normal já a corrige.

**Causa provável da lacuna de CI:** o workflow Team Lite executa `team-lite-candidate-check.mjs`, mas esse teste não afirma o contrato de autorização da rota `/api/chat/clear`. O workflow não executa `scripts/chat-regression.test.mjs`, que é parte da validação Normal. A checagem genérica de `admin(name)`/health não garante que a rota destrutiva use essa função.

**Correção requerida:** exigir no servidor `name === "Ricardo" && await admin(name)`; alinhar a visibilidade/ação da UI ao papel; adicionar teste de regressão Team Lite que prove HTTP 403 para sessão Ricardo cujo papel não seja `implementation_admin`, e sucesso apenas para sessão autorizada. Não executar a rota durante a auditoria.

## Workflow TEST em develop

Arquivo atual: [develop/.github/workflows/deploy-test.yml](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml), blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`.

A branch develop está no commit-base `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`. O workflow ativo ainda contém:
- `push` automático em develop e `workflow_dispatch`;
- secret compartilhado `SUPABASE_PROJECT_ID`;
- Supabase CLI `latest`;
- deploy de `upstatus-test`;
- nenhuma verificação da identidade do projeto de destino.

O valor do secret não foi lido; o destino efetivo não foi determinado. O risco é a ausência de uma garantia técnica de isolamento.

A #84 substitui esse desenho por manual-only, checkout de `github.sha`, validação de branch e SHA, variável dedicada `SUPABASE_TEST_PROJECT_ID`, rejeição explícita de produção/laboratório, Management API preflight e CLI 2.122.1. O Validate passou, mas a correção não está integrada. Não executar o workflow atual de develop.

## Compatibilidade Normal / Team Lite e transporte

Os dois templates candidatos usam `signaling_transport_enabled` com default `false` e endpoint configurável inicialmente vazio:
- Normal template blob `82b044fa0fb01d5b1a30639ec3b4a5cbcc7bd827`.
- Team Lite userscript blob `0e0660a6abc26052e67b9b1832a75fde7bc0b06e`.

A sinalização autenticada está implementada e testada quando habilitada, mas permanece opt-in. O caminho padrão continua dependendo do Realtime legado. Não ativar globalmente antes de TEST full-product, endpoint de produção, autorização, recuperação e rollback estarem validados.

Política de senha dos candidatos: seis caracteres no primeiro setup; quatro no login legado. A produção permanece divergente entre runtimes: upstatus v480 e beta10 v6 exigem seis no setup; upstatus-test v281 e team-lite v15 exigem quatro.

## Supabase — inventário atual

Projetos retornados pela organização (somente dois):
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations até `20261027155438`, 38 Edge Functions ACTIVE.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migrations até `20261107165942`, duas Edge Functions ACTIVE.
- Não existe projeto TEST full-product independente.

### Edge Functions de produção

Todas as 38 funções estão ACTIVE e retornam `verify_jwt=false` no gateway. 36 têm nomes contendo test/beta/backup. Isso não prova ausência de autenticação de aplicação: os runtimes centrais usam sessão customizada `x-upstatus-token`; é necessário inventário rota por rota antes de qualquer desativação.

Funções centrais e SHA implantados:
- `upstatus` v480 — `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-test` v281 — `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`.
- `upstatus-team-lite` v15 — `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10` v6 — `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Inspeção das quatro fontes implantadas confirmou setup legado, estado `needsSetup`, fallback administrativo por nome em caminhos antigos e ausência de consumo do setup invite. Produção não tem colunas/RPC de setup invite, rate limiter de autenticação, rate limiter de signaling nem RPC de read receipts atômicos. Agregado de `public.users`: 5 contas, zero senha vazia/nula, zero papel vazio/nulo e três administradores explícitos. Não há conta atualmente não inicializada nesse snapshot.

### RLS, grants, SECURITY DEFINER e default ACL

Security Advisor observado em 07/11/2026 ~21:28 UTC:
- Produção: 6 WARN (três SECURITY DEFINER executáveis por anon e três por authenticated) e 10 INFO de RLS sem policies; Performance e Health sem findings.
- Laboratório: zero WARN, 17 INFO de RLS sem policies; quatro INFO de índices não utilizados; Health sem findings.

Produção:
- Nove tabelas backend-owned em public têm RLS e grants efetivos de cliente, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE; a tabela `upstatus_visual_config` não tem grants de cliente.
- `realtime.messages`: RLS habilitado, zero policies, anon/authenticated SELECT e INSERT efetivos; sete partições e 50 linhas.
- Três triggers ativos chamam `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users`. As três são SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated/service_role e enviam broadcasts com `private=false`. A função de mensagens publica a linha OLD/NEW completa via `to_jsonb`; remote-state envia metadados de comando/resultado; user-status envia metadados de presença.
- Default ACLs amplos permanecem para postgres em public/storage e supabase_admin em public/graphql/graphql_public.

Laboratório:
- As três funções de broadcast são SECURITY DEFINER, `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role; triggers estão habilitados e payloads foram reduzidos a `{op}`.
- Ainda usam `private=false`.
- `realtime.messages`: RLS habilitado, zero policies, anon/authenticated SELECT/INSERT efetivos, zero partições e zero linhas. Não há comprovação de entrega real do broadcast no laboratório.
- Nenhuma tabela public com RLS retornou grants diretos de anon/authenticated na consulta de catálogo.
- Default ACLs: postgres/public foi reduzido a service_role; postgres/storage e defaults de supabase_admin em public/graphql/graphql_public continuam amplos.

RLS sem policies não prova, por si só, leitura de linhas; os grants são superfície de privilégio excessiva e TRUNCATE não é protegido por RLS. ACL-02 continua bloqueado por falta de privilégio administrativo na sessão disponível.

### Storage

Produção:
- `chat-images`: public=true, limite 20 MiB.
- `profile-images`: public=true, limite 20 MiB.

Upload assinado da #85 passou em testes mockados; não houve upload real. Upload assinado protege escrita, não leitura. Decidir se anexos devem continuar públicos ou migrar para buckets privados/URLs de download assinadas. O laboratório não tem esses buckets. Áudio continua em rota separada `/api/chat/audio` com data URL e precisa de contrato/limite alinhado.

### Fixtures isoladas

Consulta SELECT-only após os workflows:
- users 0; sessions 0; rooms 0; memberships 0; bindings 0; events 0;
- call attempts 0; voice attempts 0; rate limits 0; chat_reads 0; messages 0.
- `realtime.messages`: zero linhas, zero partições.

A auditoria não executou nem limpou fixtures.

## Issues e aceitação manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN, 0/8 critérios físicos. O comentário mais recente registra 0/8. Ainda faltam perda real de internet durante sala/chamada, reconexão sem F5, reentrada, novas chamadas, microfone/display reais e interoperabilidade instalada Normal ↔ Team Lite.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece OPEN, 97 comentários. O corpo atualizado às 17:04 BRT ainda dizia que o Smoke do HEAD #74 estava IN_PROGRESS e listava o Team Lite antigo `2e0ff69`. Desde então, #74 Smoke `42409229487` terminou SUCCESS e #76 avançou para `26122c55` com `42414281711` SUCCESS. Reconciliar corpo/checklist; QA não alterou a issue.

## Próximos gates

1. Corrigir a autorização de `/api/chat/clear` no Team Lite candidato e runtime, alinhar UI e adicionar teste de papel não-admin.
2. Integrar a proteção do deploy TEST em develop; manter o workflow atual sem execução até isso ocorrer.
3. Provisionar TEST full-product com Normal, Team Lite, Realtime e Storage; criar runtime TEST próprio para Team Lite.
4. Validar setup invite pelas rotas HTTP reais, incluindo emissão administrativa, 403 não-admin, entrega privada e ausência de token em logs.
5. Implementar rate limit distribuído e fail-closed para login/setup.
6. Migrar setup legado e autorizações por nome em produção com plano de cutover/rollback.
7. Migrar broadcasts para autorização privada e provar entrega real em ambiente TEST.
8. Corrigir grants/default ACLs por caminho administrativo autorizado; validar impacto em storage e schemas gerenciados.
9. Inventariar consumidores das 36 funções test/beta/backup antes de remover qualquer uma.
10. Decidir privacidade de Storage e executar upload/download real em TEST; alinhar rota de áudio.
11. Completar os oito critérios físicos de #78, reconciliar #79 e obter reviews humanas.
12. Revisar o diff amplo de #74 e a sobreposição com #85 antes de merge.

## Limitações e segurança desta rodada

- Nenhum script local foi executado: não havia checkout/ambiente de edição e teste local conectado aos candidatos. A aprovação automatizada foi verificada por logs de CI existentes; a auditoria fez inspeção de código e catálogo.
- Nenhum teste manual em Tampermonkey foi executado.
- Todas as consultas SQL emitidas foram SELECT-only.
- Nenhuma migration, deploy, Edge Function, secret, flag, role, grant, policy, ACL ou fixture foi alterada.
- Nenhum workflow foi iniciado, repetido ou cancelado manualmente.
- Nenhuma PR foi mesclada; nenhuma issue foi editada.
- Nenhuma branch de engenharia foi modificada.
- A única escrita desta rodada é este novo relatório, criado como arquivo novo na branch QA dedicada. `docs/RELEASE_READINESS.md` foi preservado.
- Sem percentual de conclusão: CI, inspeção estática, teste manual, pendente e bloqueado permanecem categorias separadas.
