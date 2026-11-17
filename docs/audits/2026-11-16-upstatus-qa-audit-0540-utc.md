# Auditoria independente UpStatus — 2026-11-16 05:40 UTC

## Parecer

**NOT READY.** Nenhuma recomendação de release nesta rodada.

Escopo revalidado: GitHub (branches, PRs, commits, workflows, checks, reviews e issues), Supabase produção e laboratório (migrations, branches, Edge Functions, logs, RLS, grants, policies, SECURITY DEFINER, default ACLs, Realtime e Storage). Todas as consultas ao banco foram SELECT-only. Não houve teste físico, merge, deploy, migration, release ou publicação.

O snapshot anterior em `docs/RELEASE_READINESS.md` terminava em **2026-11-15 06:30 UTC** e estava desatualizado para esta revalidação.

## 1. Heads e divergência

| Ref | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| qa/release-readiness-2026-11-04-master | `456de382d4fcb26104a022cfd620a6847ca8903f` |

Comparação QA → master: **358 commits à frente, 1 atrás**; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`.

A API de branch protection retornou 403 para as branches. O endpoint de rulesets do repositório retornou lista vazia. Portanto, **não é possível afirmar que as branches estão desprotegidas**; a configuração de proteção não pôde ser verificada com a permissão disponível.

## 2. PRs e CI

Todos os PRs abaixo continuam abertos e Draft; as consultas de reviews retornaram listas vazias para as candidatas examinadas.

| PR | Base → HEAD | Evidência no HEAD atual | Leitura QA |
|---|---|---|---|
| #74 Normal | master → `dcaf6a0` | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) success | PASS histórico no HEAD da PR; não é master integrado |
| #75 Team Lite | team-lite-official → `7bbf9b9` | sem novo run no HEAD atual | baseline histórico; não tratar como validação nova |
| #76 Team Lite | team-lite-official → `83a6cc4` | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) success | PASS automatizado no HEAD da PR; aceitação física continua pendente |
| #82 QA | master → `456de38` | Validate [43805255036](https://github.com/Reekyi/UpStatus/actions/runs/43805255036) failure | falha de updateURL |
| #161 Normal | `chore/continuity-foundation` → `557814d` | Validate [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e Smoke [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) success | rate limit/convites e troca do alvo de API candidatos; não integrado com #167 |
| #167 Normal | master → `d25b3fb` | Validate [43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392) success | anexos pendentes, upload assinado e updater; sem Smoke |
| #168 Normal | #161 → `c6de3eb` | Validate [43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) success | Retry-After 900; sem Smoke |
| #170 Normal | master → `693039e` | Validate [43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686) failure | contrato de anexos incompatível com #167 |
| #174 develop | develop → `277dd7b` | Validate [43802407509](https://github.com/Reekyi/UpStatus/actions/runs/43802407509) success | backport do helper de upload; testes de contrato, não transferência real |
| #175 develop | develop → `d20187c` | regressão dedicada [43808590208](https://github.com/Reekyi/UpStatus/actions/runs/43808590208) success; Validate geral [43808590131](https://github.com/Reekyi/UpStatus/actions/runs/43808590131) failure | papel administrativo corrigido em teste isolado; validação completa bloqueada pela ausência do helper de upload de #174 |

### Integração ainda ausente

As linhas de trabalho estão separadas:

- #167 parte de master e corrige updater metadata, anexos pendentes, upload assinado e autorização do chat.
- #161 parte da linha #74 e altera o alvo da API Normal para `upstatus`, adicionando setup-invite e rate limit.
- #168 depende de #161 e acrescenta Retry-After.
- #174 e #175 são backports separados em develop.

Não existe evidência de Validate + Smoke para um único HEAD contendo todas essas correções.

A #170 falha porque ainda espera upload imediato, enquanto #167 usa anexos pendentes. Não remover a regressão para forçar CI verde.

### Falha #82

Em master, `release.json` declara versão **3.4.7** e `scriptUrl` em `/functions/v1/upstatus/upstatus.user.js`. Porém, `scripts/build.mjs` ainda monta o `CLOUD_SERVER` Normal em `upstatus-screen-share-3-1-1-beta10` e deriva o updateURL desse host. O build gerado diverge de `release.json`, causando `production updateURL mismatch`.

A #167 corrige a separação do updateURL, mas mantém a API beta10 para cutover coordenado. A #161 muda a API para `upstatus`, mas ainda não foi integrada com #167. O manifesto permanece 3.4.7; não há bump que garanta atualização dos clientes já instalados em 3.4.7.

## 3. Novas candidatas develop: #174 e #175

### #174 — upload assinado no cliente

Validate passou no HEAD `277dd7b`. O diff adiciona o helper cliente para pedir autorização e enviar diretamente ao Storage. O teste valida o contrato com mocks. Não houve upload real, verificação dos bytes armazenados ou teste de interoperabilidade.

O seletor/backport cobre imagem e vídeo; não oferece o fluxo de documento no cliente desta PR, embora o servidor aceite MIME de documentos.

### #175 — papel administrativo persistido

O teste dedicado passou. O candidato deixa de promover usuário por nome e exige o papel persistido `implementation_admin` para a limpeza global do chat. O Validate completo falha porque o develop ainda não contém o helper cliente de upload esperado por `scripts/validate.mjs`; #174 está em PR separada.

#175 não adiciona setup-token/convite nem as RPCs de rate limit. É correção parcial de autorização, não conclusão de AUTH-03.

## 4. Workflows

Arquivos oficiais inspecionados:

- [Master deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml)
- [Develop deploy-test.yml](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml)
- [Team Lite deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml)

Achados:

1. Master é manual (`workflow_dispatch`) e usa ambiente production, mas utiliza `SUPABASE_PROJECT_ID` genérico, Supabase CLI `latest` e guarda fixa em versão 3.4.7.
2. Team Lite usa CLI `latest`, project ID genérico e executa `supabase functions deploy upstatus`, o slug Normal. Se acionado com as credenciais atuais, o workflow não publica a função Team Lite correta.
3. Develop TEST dispara também em push e utiliza o mesmo nome genérico de secret para project ID. Não há allowlist explícita do ref/projeto de teste no workflow.
4. `scripts/build.mjs` de master ainda apaga recursivamente a pasta `supabase/functions/upstatus` antes de reescrever `index.ts`; #167 remove essa remoção para preservar arquivos auxiliares.
5. Branch protection não pôde ser confirmada: endpoint 403; rulesets do repositório retornaram vazio. Não declarar branches `protected=false` sem leitura autorizada.

## 5. Runtimes Edge Function e compatibilidade

Projetos Supabase:

| Projeto | Estado | PostgreSQL | Migrations |
|---|---|---|---:|
| UpStatus produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 |
| upstatus-security-test `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 39 |

Branch gerenciada `main` da produção: **MIGRATIONS_FAILED**; preview do branch: ACTIVE_HEALTHY. Laboratório sem branches Supabase.

Produção tem 38 Edge Functions ACTIVE; laboratório tem 2. Todas as funções listadas reportam `verify_jwt=false`. Isso não prova acesso anônimo: os handlers principais usam token próprio `x-upstatus-token`. Mesmo assim, a superfície de cada função pública precisa de revisão individual; há funções antigas, backups e TEST ainda ACTIVE.

Runtimes principais:

| Runtime | Versão | API usada pelo userscript embutido |
|---|---:|---|
| Normal `upstatus` | v480 | `upstatus-screen-share-3-1-1-beta10` |
| Team Lite `upstatus-team-lite` | v15 | `upstatus-team-lite` |
| Normal beta10 | v6 | legado |
| TEST Normal | v281 | teste |

Os userscripts embutidos foram decodificados diretamente das Edge Functions:

| Cliente instalado | Versão | updateURL | API | Realtime topic | Upload assinado | Realtime privado |
|---|---|---|---|---|---|---|
| Normal | 3.4.7 | função `upstatus` | beta10 | `upstatus-screen-share-live-3-1-1-beta10` | helper e rotas presentes | não; sem `private:true`/ `setAuth()` |
| Team Lite | 3.4.30 | raw GitHub team-lite-official | função própria | `upstatus-screen-share-live-3-1-1-beta10` | helper e rotas presentes | não; sem `private:true`/ `setAuth()` |

**Correção da auditoria anterior:** os dois bundles instalados já contêm helper de upload assinado e chamam `/api/chat/upload-url` e `/api/profile/avatar-upload-url`. A pendência não é ausência do helper cliente.

O servidor implantado ainda valida MIME e tamanho declarados, gera URL assinada e confirma token/caminho retornado pelo Storage, mas não inspeciona os bytes reais. Diferente disso, #167 acrescenta validação de origem HTTPS, caminho, token e URL pública no candidato. A validação de #167 é offline/mocked e não foi implantada.

Os dois runtimes implantados ainda têm:
- `GET /api/account` que informa `needsSetup`;
- `POST /api/setup` sem setup-token/convite;
- fallback de papel administrativo por nome quando o papel está vazio (Ricardo/Lohan/Guilherme);
- limpeza global do chat autorizada por `name === "Ricardo"`, sem conferir papel persistido;
- senha mínima de 6 caracteres no Normal e 4 no Team Lite.

Produção possui 5 usuários; consulta agregada encontrou 0 com hash de senha vazio e 0 com papel vazio. Isso não reproduz tomada de conta, mas não elimina o fluxo legado de setup sem convite nem a autorização por nome.

Os runtimes Normal e Team Lite não contêm rota de signaling server-mediated. `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 existem somente no laboratório.

## 6. RLS, grants, SECURITY DEFINER e Storage

Consultas SELECT-only ao catálogo:

### Schema public

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Tabelas public | 10 | 18 |
| Tabelas com RLS habilitado e sem policies | 10 | 18 |
| Tabelas public com grants diretos para anon/authenticated | 9 | 0 |
| Tabelas public com TRUNCATE para anon/authenticated | 9 | 0 |

RLS sem policies bloqueia operações por linha, mas não remove o privilégio concedido e **não protege TRUNCATE**. A tabela restante sem grants diretos em produção é `upstatus_visual_config`.

### Realtime e Storage

Em ambos os projetos, `realtime.messages` e `storage.objects` têm RLS habilitado, FORCE RLS desabilitado e zero policies próprias. No snapshot de produção, anon/authenticated possuem SELECT/INSERT/UPDATE em `realtime.messages` e SELECT/INSERT/UPDATE/DELETE em `storage.objects`. No laboratório, os grants equivalentes também permanecem.

Buckets de produção:
- `chat-images`: público, 168 objetos, limite 20 MiB.
- `profile-images`: público, 20 objetos, limite 20 MiB.

Não existem policies próprias em `storage.objects`. Buckets públicos permitem download por URL pública; isso não prova acesso indevido a um objeto específico nem substitui a revisão dos grants.

### SECURITY DEFINER

Produção:
- `upstatus_broadcast_messages`
- `upstatus_broadcast_remote_state`
- `upstatus_broadcast_users`

As três são SECURITY DEFINER, `search_path=public` e EXECUTE para anon/authenticated/service_role. São funções trigger-returning; a concessão ampla é desnecessária e o Advisor as sinaliza. A função de mensagens usa `to_jsonb(CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END)` e envia o registro completo por `realtime.send(..., false)`.

Laboratório: as três usam `search_path=""`, EXECUTE negado a anon/authenticated e permitido a service_role.

Default ACLs ainda são amplas em produção para anon/authenticated em public e storage e em objetos de schemas gerenciados public/graphql/graphql_public. O laboratório restringiu os defaults de postgres em public a postgres/service_role, mas ainda conserva defaults amplos de Storage e de supabase_admin em public/graphql. Default ACLs são templates para objetos futuros; não equivalem, por si só, a grants efetivos em cada objeto existente.

## 7. Realtime

Consulta dos últimos 14 dias em produção:

| Evento | private=false |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_command | 4 |
| remote_result | 4 |
| **Total** | **106** |

Todos os 106 registros estão com `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Último registro observado: 2026-11-13 20:52:22 UTC.

Os dois bundles instalados assinam `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` e sem `setAuth()`. O tópico dos clientes diverge do tópico dos triggers, um risco adicional de entrega/compatibilidade.

A configuração pública está confirmada; **não foi reproduzida assinatura por terceiro externo nem demonstrada exploração**. O payload de `db_change` contém o registro OLD/NEW completo, portanto pode incluir conteúdo e metadados de mensagens.

## 8. Migrations, isolamento e logs

- Produção: 7 migrations no ledger; branch `main` em MIGRATIONS_FAILED.
- Laboratório: 39 migrations; 0 usuários, 0 mensagens, 0 buckets e 0 objetos Storage.
- Quatro SQLs originais ainda ausentes no repositório master/QA: visual_config, chat_message_file_name, chat_document_mime_types e upload_limits_20mb.
- Não reconstruir esses SQLs por inferência.
- Projeto laboratório ACTIVE_HEALTHY, mas sem fixtures de produto e sem dados para validar integração ponta a ponta.

Consulta de logs no período 2026-11-15 05:36 UTC a 2026-11-16 05:36 UTC encontrou somente:
- produção: 72 pgbouncer_logs, 23 postgres_logs;
- laboratório: 72 pgbouncer_logs, 19 postgres_logs.

Não havia fonte Edge/Function suficiente; não calcular HTTP 402 nem declarar recuperação.

## 9. Issues e aceitação manual

- Issue #78 tem 28 comentários; a evidência mais recente disponível é de 2026-11-08 e mantém os 8 critérios físicos pendentes (0/8). Não apareceu confirmação nova de Ricardo.
- Reconexão Normal e Team Lite sem F5, reentrada em sala, novas chamadas, microfone/display reais e interoperabilidade instalada continuam pendentes.
- Nenhum teste manual foi executado nesta rodada: não havia sessão Tampermonkey/Sale Smartly autenticada nem dispositivos reais.
- Issue #79 recebeu checkpoint QA no comentário dedicado existente; comentário da Engenharia preservado.

## 10. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | 106 eventos públicos, sem policies e clientes sem private/auth |
| TEST-ISOLATION | blocked | laboratório sem fixtures/Storage e workflow TEST sem allowlist explícita |
| MIGRATION-PROVENANCE | blocked | quatro SQLs originais ausentes; branch main MIGRATIONS_FAILED |
| AUTH-03 | blocked | produção sem convite/RPC de rate limit e com fallback por nome |
| ACL-STORAGE | blocked | grants excessivos, default ACLs amplas, buckets públicos e sem policies |
| RECONNECT | pending | sem teste físico confirmado por Ricardo |
| HUMAN-REVIEW | pending | PRs Draft, sem reviews; sem autorização explícita de release |

## 11. Próximos passos recomendados

1. Integrar #167 + #161 + #168 em um único candidato Normal e executar Validate + Smoke no mesmo HEAD.
2. Incrementar a versão estável e alinhar updateURL, API e manifesto no cutover.
3. Corrigir o workflow Team Lite para publicar `upstatus-team-lite`; fixar versão da CLI e validar project ID por allowlist.
4. Integrar o helper #174 e a autorização #175 em develop; executar Validate completo depois da integração.
5. Completar AUTH-03 nos dois produtos, com convite obrigatório e rate limit; manter autorização por papel persistido.
6. Tornar Realtime privado, aplicar policies e alinhar tópicos; minimizar payloads de broadcast.
7. Revisar grants efetivos, TRUNCATE, default ACLs e SECURITY DEFINER; decidir privacidade e policies de Storage.
8. Recuperar os quatro SQLs originais, diagnosticar MIGRATIONS_FAILED e provisionar Full-Product TEST.
9. Executar os oito testes físicos e obter aprovação humana antes de release.

## Integridade desta execução

- GitHub e Supabase usados para inspeção; consultas SQL somente SELECT.
- Nenhuma alteração em produção, laboratório, secrets, flags, roles ou permissões.
- Nenhum merge, deploy, migration, release ou publicação de userscript.
- Nenhum teste físico ou local alegado.
- Única escrita no GitHub: este relatório novo na branch QA e atualização do comentário QA existente na Issue #79.


## Follow-up de CI após o commit documental — 2026-11-16 05:50 UTC

O novo commit documental `9d1f2723b0a14f45b1f3318367020cbc96effe08` atualizou o HEAD da branch QA e da PR #82. O workflow disparou no merge ref `aebf95db26416b0e73263b426261adf2ab6f8219` e **falhou novamente** no passo Validate:

- Run [43812737507](https://github.com/Reekyi/UpStatus/actions/runs/43812737507)
- Erro exato: `VALIDATION FAILED: production updateURL mismatch`
- Build observado: `Built UpStatus 3.4.7 / TEST 3.4.7`

Portanto, a falha #82 não está limitada ao HEAD anterior `456de382`: ela foi reproduzida no merge ref que inclui o relatório QA. A branch QA agora está 359 commits à frente e 1 atrás de master. Nenhum código de produto foi alterado para provocar ou contornar a falha; o commit foi apenas documentação.
