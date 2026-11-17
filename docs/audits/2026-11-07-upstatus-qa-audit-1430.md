# UpStatus — auditoria independente de qualidade
**Data:** 2026-11-07 11:30 BRT  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Classificação:** auditoria read-only de GitHub, CI, código e catálogos Supabase. Nenhum teste manual ou mutável foi executado pela QA.

## 1. Método e vocabulário

- **AUTOMATED PASS:** workflow concluído com sucesso no SHA indicado.
- **CODE INSPECTION:** inspeção estática de fonte/configuração ou catálogo; não equivale a teste de runtime.
- **MANUAL PENDING:** exige Tampermonkey, navegador, dispositivo, rede real ou aceite humano.
- **PENDING:** execução ou evidência ainda não concluída.
- **BLOCKED:** dependência ou condição de segurança impede avançar.
- **NOT VERIFIED:** não há evidência suficiente para afirmar o comportamento.

O arquivo principal `docs/RELEASE_READINESS.md` foi lido primeiro nesta branch. Blob SHA atual no início desta rodada: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`. O relatório QA anterior também foi lido: `docs/audits/2026-11-07-upstatus-qa-audit-1328.md`, blob `88d31a002e5134023c8a9717dbb9d0ed49bdfa69`.

## 2. Refs e estado do GitHub

Refs reobtidos por `refs/pull/N/head` e comparação GitHub:

| PR | HEAD completo | Comparação relevante | Estado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | 839 à frente / 0 atrás de master | Open / Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Baseline histórico | Open / Draft |
| [#76 Team Lite atual](https://github.com/Reekyi/UpStatus/pull/76) | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | 251 à frente / 0 atrás de #75 | Open / Draft |
| [#82 QA documental](https://github.com/Reekyi/UpStatus/pull/82) | `348df4e7d024b8336b1133ac191d2b75b5de3d69` | 98 à frente / 0 atrás de master | Open / Draft |
| [#84 guard TEST](https://github.com/Reekyi/UpStatus/pull/84) | `66ccc65af430dfee55560e90e1f832336fff0212` | 29 à frente / 0 atrás de develop | Open / Draft |
| [#85 updater/role candidate](https://github.com/Reekyi/UpStatus/pull/85) | `fc6611809b742cfb826e8cbeb56491ad5c40038b` | 10 à frente / 0 atrás de master | Open / Draft |

As PRs #74, #75, #76, #82, #84 e #85 não têm reviews humanas submetidas nas consultas realizadas. #85 é incluída como evidência adjacente porque tenta corrigir o gate herdado que bloqueia a validação de #82; não substitui o escopo solicitado de #74/#75/#76/#82.

Refs auxiliares observados:
- `master`: `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- Branch QA antes deste relatório: `348df4e7d024b8336b1133ac191d2b75b5de3d69`.

## 3. CI nos HEADs exatos

### Normal #74

- [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089): **AUTOMATED PASS**.
- [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038): **AUTOMATED PASS**.
- Log/checkpoint do candidato registra 19/19 checks não autenticados e 129/129 autenticados.
- Cobertura reportada: WebRTC de chamada/voz/tela, entrega de áudio/vídeo remoto, mesh de três participantes, recuperação/teardown de salas, cancelamento antecipado, rate limit 90 aceitas + 1 HTTP 429, `Retry-After: 60`, read receipts atômicos e enrollment com replay/expiração/concorrência.

### Team Lite #76

- [Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800): **AUTOMATED PASS**.
- Log/checkpoint registra 16/16 checks não autenticados e 103/103 autenticados.
- Cobertura reportada: WebRTC call/voice/screen, mesh de três participantes, recuperação de salas, rate limit/concorrência, read receipts, AUTH-03, updater 3.4.31 e isolamento dos portais Lucca/Ycaro.

### Baseline #75

- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): **PASS histórico** no baseline sem alteração.
- #76 está 251 commits à frente de #75 e zero atrás; não tratar #75 como segundo candidato independente equivalente ao HEAD atual de #76.

### TEST guard #84

- [Validate 42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144): **AUTOMATED PASS**.
- Passaram guard de destino TEST, metadata, pinagem do SHA do evento, escopo de token, upload assinado e Validate geral.
- O run não executou `workflow_dispatch`, Management API preflight ao vivo nem deploy.

### QA #82

- [Validate 42377839699](https://github.com/Reekyi/UpStatus/actions/runs/42377839699): **FAIL** no step 3, `Validate build`.
- Log exato: `VALIDATION FAILED: production updateURL mismatch`.
- A falha é do contrato do builder/manifesto no baseline master; o commit #82 altera documentação, não o runtime.

### PR #85 — correção adjacente do gate master

- [Validate 42379624982](https://github.com/Reekyi/UpStatus/actions/runs/42379624982): **FAIL** no step 3, `Validate build`.
- Log exato: `CHAT REGRESSION FAILED: files are staged instead of uploaded immediately`.
- As verificações anteriores de updater URL e autorização por papel armazenado passaram; o próximo gate encontrou uma lacuna real de upload/UX. Não enfraquecer a regressão para obter verde.

## 4. Achado prioritário: workflow TEST ativo em develop

**CODE INSPECTION — BLOCKER de release safety.**

Arquivo ativo em develop:
- `.github/workflows/deploy-test.yml`
- Blob SHA: `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`.
- Branch develop observada em `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.

O workflow atual contém:
- `workflow_dispatch` **e** gatilho automático `push` em develop.
- `SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}`.
- Supabase CLI `latest`.
- Deploy de `upstatus-test` usando esse project ID.
- Não há allowlist de projeto, comparação do database host ou rejeição explícita de produção/fixture antes do deploy.

O valor do secret/token não foi lido e o destino efetivo não foi determinado. Portanto, não afirmar que o workflow efetivamente aponta para produção; afirmar que **não impõe controle suficiente para provar que não aponta**. Não executar esse workflow.

Na #84, o workflow candidato tem blob `1ca0c4ef4f633724280b81691471d8acc777edd2` e:
- é manual-only;
- exige branch `develop`;
- faz checkout de `${{ github.sha }}` e compara o SHA local com `GITHUB_SHA`;
- exige `vars.SUPABASE_TEST_PROJECT_ID`;
- rejeita produção e o projeto isolado de fixtures;
- verifica formato/metadata/host do destino;
- usa Supabase CLI pinado;
- implanta somente `upstatus-test`.

A correção passou em #84, mas #84 continua Draft e não foi integrada a develop. Logo, o workflow inseguro continua sendo o arquivo ativo na branch develop.

## 5. Isolamento TEST: guard aprovado, ambiente full-product ausente

Inventário Supabase atual retornou somente dois projetos:
- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe terceiro projeto TEST completo.

O builder Normal na #74 (blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`) e o builder Team Lite na #76 (blob `41fe447508ac3e48cdbf3a7b85446bf7291be004`) usam `UPSTATUS_TEST_PROJECT_ID`, default inerte `00000000000000000000`, rejeitam produção e o projeto de fixtures e derivam API/Realtime do mesmo destino TEST. Essa proteção está aprovada no CI.

O laboratório isolado tem 33 migrations até `20261107061242` e somente duas Edge Functions:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.

É um ambiente de signaling/auth isolado, não um backend full-product para Normal e Team Lite.

**Lacuna Team Lite:** o builder #76 possui `renderTeamLiteFunction()` e gera `upstatus-team-lite`, mas não gera `upstatus-team-lite-test`. O workflow candidato #84 implanta apenas `upstatus-test`. Portanto, os Candidate Checks do Team Lite não validam o runtime completo Team Lite implantado num TEST próprio.

Snapshot SELECT-only de fixtures no laboratório durante esta rodada: users 0, sessions 0, rooms 0, memberships 0, events 0, call attempts 0, voice attempts 0 e rate-limit buckets 0. Nenhuma fixture foi criada ou limpa pela QA.

## 6. Builder Normal: distribuição versus API

A inspeção do builder #74 encontrou uma distinção intencional que deve ser descrita corretamente, não chamada automaticamente de bug:
- `release.json` / UpdateURL distribui o userscript pelo endpoint estável `/functions/v1/upstatus/upstatus.user.js`.
- `CLOUD_SERVER` de produção continua apontando para `upstatus-screen-share-3-1-1-beta10` para preservar compatibilidade do runtime API legado.
- O artefato TEST deriva API, updater, Realtime e fallback de Storage do alvo TEST e desabilita o feed de release de produção.

Essa separação entre endpoint de distribuição e API é explícita no builder. O bloqueio é de **cutover coordenado**: o backend candidato Normal ainda não foi implantado/substituído em produção; não presumir que publicar/atualizar apenas o userscript ativará as mudanças do novo server template. Exigir plano versionado de API, distribuição, Realtime, Storage e rollback.

## 7. PR #85: o próximo gate real depois do updater

A #85 corrige no candidato baseado em master:
- UpdateURL/downloadURL estáveis derivados de `release.json.scriptUrl`;
- isolamento de URLs de atualização no artefato TEST;
- remoção de fallback administrativo por nome e gates de UI/health por papel armazenado.

O Validate [42379624982](https://github.com/Reekyi/UpStatus/actions/runs/42379624982) passou os gates de updater/role e falhou na regressão de anexos.

Inspeção estática do HEAD #85:
- O userscript contém `uploadFileDirect` e chama `/api/chat/upload-url` e `/api/profile/avatar-upload-url`.
- Seleção de arquivo e paste ainda chamam `sendChatMedia` imediatamente.
- Não encontrei `setPendingAttachment` nem `updateLinkPreview` no cliente #85.
- O server template #85 não contém `signedUploadRoute` nem as rotas de upload assinadas correspondentes.
- A regressão `scripts/chat-regression.test.mjs` exige staging do anexo, preview removível e paste que mantenha o arquivo pendente.

O erro é um contrato cliente/servidor incompleto, não um teste obsoleto. A correção segura deve portar UX de anexo pendente e rota server-side assinada em conjunto, com validação de origem, bucket, path, MIME, tamanho e token. Não remover a asserção.

## 8. Supabase produção: Edge Functions e AUTH

Projeto `dlfvkawaiqduhlazsszm`:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- 7 migrations até `20261027155438`.
- 38 Edge Functions ACTIVE; as 38 reportam `verify_jwt=false`. Isso, isoladamente, não prova ausência de autenticação, pois as funções core usam sessão customizada; exige inventário por rota.
- O inventário contém diversas funções antigas de teste/beta/backup ainda ACTIVE. Não desativar indiscriminadamente sem mapa de consumidores/rollback.

Funções core e SHA implantados:
- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-test` v281, SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`.
- `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Inspeção das quatro fontes implantadas confirmou `GET /api/account?name=...` com `needsSetup` e `POST /api/setup` chamando o fluxo antigo. Normal, Team Lite, TEST e beta10 ainda usam fallback de papel administrativo por allowlist de nome quando o papel está vazio. Isso é risco latente de provisionamento; não é evidência de conta atualmente reivindicável.

Agregado SELECT-only de `public.users`: 5 contas, 0 password_hash NULL/vazio, 0 role NULL/vazio e 3 papéis `implementation_admin`.

Produção não possui:
- `consume_upstatus_setup_invite`;
- tabela/RPC de rate limit de autenticação;
- `consume_upstatus_signal_rate_limit`;
- `merge_chat_read_receipts`.

AUTH-03 nos candidatos tem convite 256-bit, hash SHA-256, expiração de 15 minutos, consumo atômico e proteção contra replay/concorrência. Porém, o teste atual usa service_role e RPC direta; emissão HTTP por admin, 403 para não-admin, entrega privada do token e ausência de token em logs continuam pendentes. AUTH-02: rate limit específico de login/setup ausente nos dois projetos.

Política de senha candidata: Normal exige 6 no novo setup e aceita 4 no login; Team Lite aceita 4 no setup e login. O login cruzado é compatível para contas antigas de 4–5 caracteres; a política de criação continua divergente e precisa de decisão explícita.

## 9. RLS, grants, SECURITY DEFINER e Realtime

### Produção

Nove tabelas backend-owned public permanecem RLS-enabled, com zero policies e privilégios efetivos para anon/authenticated incluindo SELECT, INSERT, UPDATE, DELETE e TRUNCATE:
`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`. `upstatus_visual_config` não tem esses grants de cliente.

Zero policies não prova acesso direto às linhas via PostgREST. Entretanto, TRUNCATE não é protegido por RLS e os grants de cliente são desnecessários para tabelas backend-owned.

`realtime.messages`: RLS enabled, zero policies, anon/authenticated SELECT/INSERT efetivos.

Três funções de broadcast e triggers seguem ativos:
- `upstatus_broadcast_messages()`: SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated/service_role; publica o registro OLD/NEW completo via `to_jsonb` no tópico `db_change`, com `private=false`.
- `upstatus_broadcast_remote_state()`: SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated; publica sender/target/status/reason/error e metadados de comando/resultado, também `private=false`.
- `upstatus_broadcast_users()`: SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated; publica nome/status/reason/update metadata, também `private=false`.

Os três triggers estão habilitados. A exposição de conteúdo de chat pelo broadcast público é **BLOCKER de segurança RT-01**. A mudança para Realtime privado não pode ser apenas `private=true`: precisa de desenho de autenticação compatível com o token customizado UpStatus, políticas em `realtime.messages`, teste de cliente e rollback.

Security Advisor de produção observado às 14:29:46Z:
- 3 WARN para SECURITY DEFINER executável por anon;
- 3 WARN para authenticated;
- 10 INFO para RLS sem policy.
Performance e Health sem findings nesta consulta.

### Projeto isolado

As tabelas backend-owned public têm RLS e zero policies, sem grants de cliente verificados para anon/authenticated. As três RPCs candidatas — setup invite, signaling rate limit e merge chat receipts — existem como SECURITY INVOKER, search_path vazio, EXECUTE apenas para service_role. O projeto isolado tem 17 INFO de RLS sem policy, 4 INFO de índices não utilizados e zero WARN de SECURITY DEFINER; Health sem findings.

Entretanto, `realtime.messages` continua com RLS, zero policies e grants de SELECT/INSERT para anon/authenticated. Broadcasts do laboratório continuam `private=false`, embora os payloads tenham sido minimizados para hints.

### ACL-02

Default ACLs de produção continuam amplos:
- defaults de postgres em public e storage concedem privilégios a anon/authenticated/service_role;
- defaults de supabase_admin em public, graphql e graphql_public também mantêm grants amplos.

Catálogo confirmou `supabase_admin` superuser e `postgres` não-superuser, sem membership em supabase_admin. ACL-02 permanece **BLOCKED** para a sessão atual; exige caminho administrativo autorizado e revisão dos impactos. Nenhum ACL foi alterado.

## 10. Issues e aceitação manual

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 8 critérios de aceite continuam desmarcados. Último checkpoint relevante consultado é 07:00 BRT. Permanecem MANUAL PENDING: queda real de rede por ~10s e retorno sem F5 em Normal/Team Lite, reentrada em sala, nova chamada, áudio bidirecional, múltiplas quedas, microfone/display capture reais, perfis Tampermonkey separados e ausência de peers/pollers órfãos.
- [#79 release](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 94 comentários. O corpo principal ainda tem revalidação 08:59 BRT; comentário de engenharia mais recente consultado, 11:02 BRT, registra #85 em `fc661180` e falha real de upload pendente. Atualizar o corpo/checklist depois de resolver os gates, não marcar release pronta.

Nenhum teste físico foi executado pela QA nesta rodada.

## 11. Próximos gates, por prioridade

1. **Imediato:** integrar/revisar a proteção do workflow TEST antes de qualquer execução; não executar o workflow atual de develop.
2. Provisionar projeto TEST full-product dedicado, com identidade/host verificados e custos/autorizações aprovados.
3. Criar runtime e workflow TEST específicos para Team Lite.
4. Corrigir #85 implementando staging de anexos e signed-upload server/client completos; manter regressões estritas.
5. Manter separação explícita entre endpoint de distribuição Normal e API beta10 até um cutover coordenado com versão, Realtime, Storage e rollback.
6. Completar testes HTTP reais de emissão/consumo AUTH-03 e rate limit distribuído de login/setup.
7. Migrar produção do setup antigo/name-based admin somente após TEST e rollback revisados.
8. Eliminar broadcasts públicos de conteúdo/metadados e implementar autorização Realtime compatível com o cliente.
9. Revogar grants de cliente e resolver default ACL/ACL-02 por caminho administrativo autorizado.
10. Inventariar rotas/autenticação das 38 Edge Functions e dependências das funções beta/backup antes de qualquer desativação.
11. Completar #78 no Tampermonkey/navegador e atualizar #79 com evidências e reviews humanas.

## 12. Veredito

- Normal #74: **AUTOMATED PASS** no HEAD exato.
- Team Lite #76: **AUTOMATED PASS** no HEAD exato.
- #75: PASS histórico do baseline.
- #84: guard TEST **AUTOMATED PASS**, mas ainda Draft e não integrado a develop.
- #82: Validate falha no contrato de updater herdado de master.
- #85: updater/role gates avançaram, mas Validate falha em contrato de upload parcial.
- Segurança de produção, TEST full-product, cutover, reviews humanas e aceitação física: **BLOCKED/PENDING**.

**Não liberar.** Manter PRs candidatas em Draft. Não atribuir percentual.

## 13. Registro de segurança

- Todas as consultas SQL desta rodada foram SELECT-only.
- Nenhuma migration aplicada.
- Nenhum deploy ou alteração de Edge Function.
- Nenhum secret/token foi lido.
- Nenhuma flag, role, grant, policy ou ACL foi alterada.
- Nenhuma fixture criada, atualizada ou removida; o snapshot isolado estava zerado.
- Nenhum workflow disparado, repetido ou cancelado manualmente; apenas logs de execuções existentes foram consultados.
- Nenhuma branch de engenharia foi modificada.
- Única escrita: este relatório novo na branch QA dedicada.
- Sem percentual de conclusão.
