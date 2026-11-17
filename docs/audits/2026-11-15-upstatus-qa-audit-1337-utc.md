# UpStatus — auditoria independente QA

**Executada em:** 2026-11-15T13:38:16.282Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção:** Supabase `dlfvkawaiqduhlazsszm`  
**Laboratório:** Supabase `bfpjtfqlnypisxljoxkb`

## Parecer

**NOT READY.** Os candidatos #74 e #76 têm CI positivo nos HEADs atuais, mas a produção continua com Realtime público, AUTH-03 ausente, permissões amplas e cadeia de publicação Team Lite incorreta. O Validate da #82 falhou no HEAD atual. Os erros HTTP 402 estão confirmados nos logs, mas não há causa ou recuperação comprovadas. Não houve teste manual.

## Método e limites

- Leitura de `docs/RELEASE_READINESS.md` na branch QA. O arquivo tem 8.423 linhas e o último checkpoint interno é 2026-11-15 06:30 UTC; este relatório registra a revalidação posterior.
- GitHub: leitura de refs, PRs, diffs, reviews, Actions e logs.
- Supabase: SELECT-only, catálogos, migrations, funções, advisors e logs de 24 horas.
- Não foram disparados workflows nem repetidos Smokes, para evitar concorrência sobre o projeto de fixtures compartilhado.
- Não existe checkout local: `/workspace`, `/workspaces`, `/repo` e `/app` ausentes. Nenhum teste local ou manual em navegador/Tampermonkey foi executado.

## Heads e governança

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `c10225135503bd7c7ad28e653b266b684e7cfa1c` |

QA está **338 commits à frente e 1 atrás** de master. O HEAD QA atual é o commit documental do relatório das 12:43 UTC. Não foi feito rebase nem incorporação automática do commit master-only.

A API de repository rulesets retornou lista vazia. O endpoint clássico de branch protection respondeu 403 para a integração; portanto, a proteção clássica das branches fica **NOT VERIFIED**, não “desativada”.

Evidência: [comparação QA com master](https://github.com/Reekyi/UpStatus/compare/9d40461babcec8eb8686c2a04be9c675df7da381...c10225135503bd7c7ad28e653b266b684e7cfa1c).

## PRs solicitadas: HEAD exato e CI

| PR | HEAD | Evidência exata | Resultado |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | Ambos SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS histórico |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | SUCCESS |
| #82 QA | `c10225135503bd7c7ad28e653b266b684e7cfa1c` | [Validate 43715406565](https://github.com/Reekyi/UpStatus/actions/runs/43715406565) | FAILURE |

### Leitura dos resultados

- **#74:** 136/136 verificações autenticadas passaram; o Smoke também confirmou WebRTC de chamada, voz e tela, malha de três participantes, teardown, 90 sinais aceitos + 1 rejeitado com HTTP 429 e teste concorrente de recibos. A etapa **“Verify distributed setup-invite issuance rate limit” foi SKIPPED**. A inspeção do template Normal confirma que `issueSetupInvite` não chama `consume_upstatus_setup_invite_rate_limit`.
- **#76:** 110/110 verificações autenticadas passaram. O job validou Chromium/WebRTC de chamada, voz e tela, mesh de três participantes, teardown, rate limit distribuído, recibos atômicos e rate limit concorrente de emissão de setup invites no laboratório.
- **#75:** é baseline histórica e está substituída para o trabalho atual pela #76; não contar como entrega independente.
- **#82:** falha exata em `scripts/validate.mjs:26`: `VALIDATION FAILED: production updateURL mismatch`. O log mostra build 3.4.7 e saída 1. A PR é documental, mas permanece com Validate vermelho no HEAD atual.

As quatro PRs estão abertas e Draft. As consultas de reviews retornaram **zero reviews submetidas** para #74, #75, #76 e #82.

## Candidatas relacionadas mais recentes

Estas PRs não substituem as quatro PRs solicitadas e continuam sem aprovação humana:

- [#164](https://github.com/Reekyi/UpStatus/pull/164), HEAD `a27ced56564f3d18948c70138f6d6b2a1f2d0907`: Validate [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) SUCCESS. Restaura helper de upload e move avatar para validação server-side com limite de 2 MiB, identidade imutável e rejeição de MP4 declarado como JPEG. **Mitigação parcial:** o upload assinado de anexos de chat continua direto; o `sniffMime` ainda retorna o MIME declarado para tipos não reconhecidos/documentais. Os testes de servidor são VM/mock, não upload real no Storage.
- [#167](https://github.com/Reekyi/UpStatus/pull/167), HEAD `d100b0820dd7f98e2b78a98e6b6f8c09f13b1867`: Validate [43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) SUCCESS. Corrige contrato de `release.json.scriptUrl` e anexos pendentes; mantém explicitamente a API Normal em beta10 até cutover coordenado. É candidata, não correção integrada da #82.
- [#165](https://github.com/Reekyi/UpStatus/pull/165): guard focado [43619801133](https://github.com/Reekyi/UpStatus/actions/runs/43619801133) SUCCESS. Move a proveniência autenticada de call-signal para argumento fora do payload.
- [#166](https://github.com/Reekyi/UpStatus/pull/166): guard focado [43624572780](https://github.com/Reekyi/UpStatus/actions/runs/43624572780) SUCCESS. Faz o mesmo limite no Team Lite.

#165/#166 removem o marcador controlável `_authenticatedTransport` e restringem hints públicos quando o transporte autenticado está habilitado. Isso **não** torna o transporte default: a flag permanece desligada por padrão nas candidatas, e a produção continua no runtime legado. Nenhuma das PRs #164–#167 tem review submetida.

## Workflows e cadeia de publicação

### Team Lite produção

[Workflow oficial em `team-lite-official`](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml):

- Lê `./release.json` da raiz: versão 3.0.40, `preRelease=beta.22`.
- O manifesto próprio Team Lite declara buildVersion 3.4.30 e channel stable.
- O guard atual deve rejeitar a publicação porque o manifesto raiz está em pré-release.
- Instala Supabase CLI `latest`.
- Obtém projeto de `secrets.SUPABASE_PROJECT_ID`, sem comparar com ID esperado.
- Executa `supabase functions deploy upstatus`, o slug Normal, não `upstatus-team-lite`.

**Não despachar.** Mesmo após corrigir o manifesto, o slug continua errado.

### TEST em develop

[Workflow TEST](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml):

- Dispara em push para `develop` e manualmente.
- Usa `SUPABASE_PROJECT_ID` vindo de secret; não há allowlist/asserção do ID do laboratório.
- Instala CLI `latest`.
- Publica `upstatus-test`.

O valor do secret não foi lido; portanto, o destino efetivo não foi inferido. A ausência de verificação do projeto esperado é um risco de governança.

### Normal produção

O workflow de master é manual e restringe o manifesto a 3.4.7 estável, mas também usa CLI `latest` e o projeto vem de secret sem comparação explícita com o projeto esperado. A #167 corrige o contrato do updater, não resolve sozinha o cutover API beta10 nem esses controles de destino.

## Supabase — disponibilidade

Janela consultada: **2026-11-14T13:30:00Z a 2026-11-15T13:30:00Z**.

- Produção: **94 HTTP 402** — 88 em `function_edge_logs` e 6 em `edge_logs`.
- Laboratório: **19 HTTP 402** em `function_edge_logs`.
- Em produção, os 402 atingiram os downloads Normal/Team Lite, API beta10 de chat/status/remote-status e gateway Realtime.
- Último 402 de produção: **2026-11-14T20:57:39.868Z**. Último do laboratório: **2026-11-14T17:10:45.818Z**.
- Não há logs Edge posteriores a 20:58 UTC na janela consultada; isso não prova recuperação nem que os serviços voltaram a receber tráfego.

A causa dos 402 não foi comprovada. Não atribuir automaticamente a quota/billing. Exige investigação de Usage/Billing e comprovação de disponibilidade antes de Smokes integrados.

## Supabase — projetos, migrations e Edge Functions

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Projeto | `dlfvkawaiqduhlazsszm` | `bfpjtfqlnypisxljoxkb` |
| Estado do projeto | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| Migrations | 7 | 39 |
| Edge Functions | 38 ACTIVE | 2 ACTIVE |
| Usuários/sessões/mensagens | 5 / 319 / 302 | 0 / 0 / 0 |
| Buckets/objetos Storage | 2 / 188 | 0 / 0 |

A branch gerenciada `main` de produção acompanha Git `master`, mas está `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`.

As quatro migrations aplicadas em produção continuam sem fonte original em master/QA:

1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruir SQL a partir do schema.

As 38 Edge Functions de produção reportam `verify_jwt=false` na plataforma. Isso não prova que todas sejam anônimas: os handlers principais usam autenticação própria `x-upstatus-token`. O inventário inclui os dois runtimes principais, o beta10 legado e 35 funções históricas test/beta/backup. Não foi feita auditoria rota-a-rota das 38.

- Normal: `upstatus` v480, userscript embutido 3.4.7.
- Team Lite: `upstatus-team-lite` v15, userscript embutido 3.4.30.
- Normal API legado: `upstatus-screen-share-3-1-1-beta10` v6.
- `upstatus-test` v281 (3.3.28) continua ACTIVE em produção.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- O código v32 não contém mapeamento explícito para `VOICE_ATTEMPT_ALREADY_ACTIVE` como HTTP 409; confirmar o contrato antes de depender dele.

## AUTH-03 e compatibilidade

SELECTs de produção confirmam zero colunas `setup_token_*` e zero RPC `consume_upstatus_setup_invite`. Os runtimes Normal e Team Lite ainda fazem `POST /api/setup` diretamente para `login(req,true)`; `/api/account` revela `needsSetup`. A limpeza do chat ainda verifica somente `name === "Ricardo"`, sem exigir papel administrativo persistido.

A inspeção dos candidatos mostra diferença de paridade:
- Normal #74: `issueSetupInvite` não chama `consume_upstatus_setup_invite_rate_limit`; o Smoke ignora o teste de emissão.
- Team Lite #76: chama a RPC e o Candidate Checks valida rate limit distribuído no projeto isolado.

Os candidatos não estão implantados; produção permanece no fluxo legado.

## RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- 10 tabelas `public` com RLS e sem policies.
- 126 linhas de grants diretos para anon/authenticated em 9 tabelas public.
- 18 grants TRUNCATE (9 tabelas para cada papel).
- 24 entradas em `pg_default_acl`.
- Três funções de broadcast SECURITY DEFINER, `search_path=public`, EXECUTE para anon e authenticated.
- Security Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO.
- `realtime.messages`: 6 grants de cliente e zero policies.
- Storage: `chat-images` e `profile-images` públicos; 188 objetos e zero policies próprias em `storage.objects`.

RLS sem policies em tabelas backend-owned não prova, isoladamente, leitura/escrita efetiva; os grants são desnecessários e TRUNCATE não é protegido por RLS.

### Laboratório

- 18 tabelas public com RLS e sem policies.
- Zero grants diretos de anon/authenticated em tabelas public.
- Seis grants de cliente em `realtime.messages`.
- 25 default ACLs.
- Zero bucket/objeto Storage.
- Nenhuma função SECURITY DEFINER de public com EXECUTE para cliente.
- Security Advisor: 18 INFO e zero WARN.

O laboratório é de sinalização/auth, não Full-Product TEST.

### Realtime

SELECT em `realtime.messages` encontrou **106 linhas nos últimos 14 dias**, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:

- 72 `user_status`
- 26 `db_change`
- 4 `remote_result`
- 4 `remote_command`

As três funções de trigger foram inspecionadas diretamente:
- `upstatus_broadcast_messages()`: SECURITY DEFINER, `search_path=public`, EXECUTE de clientes, serializa OLD/NEW via `to_jsonb` e chama `realtime.send(..., false)`.
- `upstatus_broadcast_remote_state()`: SECURITY DEFINER, EXECUTE de clientes, broadcast público.
- `upstatus_broadcast_users()`: SECURITY DEFINER, EXECUTE de clientes, broadcast público.

Os userscripts embutidos nos runtimes Normal/Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`, também sem `private:true` ou `setAuth()`. O tópico dos clientes não coincide com o tópico dos triggers. A contagem de catálogo não prova entrega a assinantes nem exploração externa; o caminho público e o payload completo estão confirmados por inspeção.

## Issues e aceitação física

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios de aceitação; reconexão Normal/Team Lite sem F5, chamadas reais, áudio, participantes e browser manual pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16 marcados e 19 desmarcados. É checklist histórico, não percentual de prontidão.
- Nenhum teste físico/manual foi executado. Não há checkout local nem navegador/Tampermonkey/dispositivos nesta execução.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Runtimes e triggers ainda públicos; transporte seguro não é default nem implantado |
| TEST-ISOLATION | BLOCKED | Laboratório sem fixtures Full-Product e com 402 históricos |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais ausentes; main=MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Produção sem setup token/RPC; Normal candidato sem rate limit de emissão |
| ACL-STORAGE | BLOCKED | Grants/ACL amplos, funções SECURITY DEFINER e buckets públicos sem policies |
| RECONNECT | PENDING | Exige teste físico sem F5 e confirmação humana |
| HUMAN-REVIEW | PENDING | PRs Draft e sem reviews; sem autorização explícita de release |

## Próximas ações

1. Investigar causa dos 402 com Usage/Billing e comprovar recuperação.
2. Corrigir workflow Team Lite: manifesto próprio, slug correto, projeto fixo/validado, CLI pinada, SHA e preflight.
3. Fixar o projeto esperado no workflow TEST e falhar fechado se o secret apontar para outro projeto.
4. Completar rate limit de emissão no Normal e testar admin/não-admin em ambiente isolado.
5. Projetar Realtime privado/server-mediated com identidade, membership, replay/expiry e rate limit no servidor; rollout coordenado para Normal e Team Lite.
6. Endurecer RLS/grants/default ACL/SECURITY DEFINER e decidir Storage privado/quarentena; não considerar #164 solução completa para bytes de anexos de chat.
7. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
8. Provisionar Full-Product TEST e concluir os testes físicos da #78.
9. Obter review humana e autorização explícita antes de qualquer release.

## Registro de segurança

Todas as consultas SQL foram SELECT-only. Não houve execução de workflows, escrita de fixtures, upload, merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL, ou operação destrutiva. A única escrita desta rodada é este novo relatório na branch QA e a atualização do comentário QA dedicado na Issue #79. O comentário da Engenharia foi preservado.
