# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-12 20:42 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## 1. Escopo e limites

- Conferidos heads de `master`, QA e `team-lite-official`; PRs #74, #75, #76, #82, #152 e #153; issues #78 e #79; commits, checks, logs e workflows.
- Supabase consultado somente por operações de leitura: metadados de projetos/funções/migrations, Security Advisor e consultas SQL SELECT aos catálogos, Realtime, grants, RLS, funções, triggers e Storage.
- Não havia checkout local. Não executei scripts localmente, testes HTTP de upload/voz, PUT no Storage ou testes físicos no navegador instalado. Os resultados de CI abaixo são logs existentes, não testes executados por esta auditoria.
- Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants ou escrita em banco.
- `docs/RELEASE_READINESS.md` permanece no blob `7cfbd70886df42ce790c078c224b19284a632595`. O endpoint de conteúdo do GitHub devolveu conteúdo vazio para esse arquivo grande; a última leitura integral registrada no checkpoint anterior cobriu 8.409 linhas e encontrou o último checkpoint interno em 08/11/2026 18:30 UTC. O blob não mudou nesta rodada.

## 2. Heads e divergência

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `a7c22b7841202e91c4c71e67a2f9ed63db9aeb5b` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #152 | `7b41b14d02ff196f1ca7e7768d3f93057d3b316d` |
| PR #153 | `71ea47912c291dbaa1b2909e29f2ad10a5f847a7` |

QA está 261 commits à frente e 1 atrás de master. A comparação de conteúdo mostra diferenças documentais em relação a master. Desde o ponto comum `3255712`, QA tem cinco commits; o diff contém somente quatro relatórios de auditoria adicionados.

#152 está 13 commits à frente e 5 atrás da QA. #153 está 19 à frente e 5 atrás da QA. #153 está 7 à frente e 1 atrás de #152; o check de PR validou o merge ref `c691a2dc`, que combina o HEAD #153 `71ea479` com a base #152 `7b41b14`.

## 3. CI e PRs

| PR | HEAD conferido | Evidência | Resultado e limite |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | Ambos SUCCESS; Smoke confirma 136/136 checks autenticados e WebRTC no navegador de CI. A emissão distribuída de setup invite ficou skipped. |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS histórico, mas este run só executou verificação de scripts/metadados; não equivale à suíte completa atual. |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) | SUCCESS; 110/110 integração autenticada, WebRTC call/voice/screen em Chromium, mesh de três participantes, rate limit 90+1/429, convites, recibos e cleanup. Candidata buildVersion 3.4.31. |
| #82 QA | `a7c22b7841202e91c4c71e67a2f9ed63db9aeb5b` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43293983496) | FAILURE: `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`. |
| #152 | `7b41b14d02ff196f1ca7e7768d3f93057d3b316d` | [Push Validate](https://github.com/Reekyi/UpStatus/actions/runs/43298135269) | SUCCESS no build offline e regressões de chat. |
| #153 | `71ea47912c291dbaa1b2909e29f2ad10a5f847a7` | [Push Validate](https://github.com/Reekyi/UpStatus/actions/runs/43298167539), [PR Validate](https://github.com/Reekyi/UpStatus/actions/runs/43298181979) | Ambos SUCCESS. O log do PR confirma checkout do merge ref `c691a2dc`. Teste de upload é estático/offline; não executa PUT real nem inspeciona bytes. |

Não há reviews humanas registradas nas PRs #74, #75, #76, #82, #152 ou #153.

## 4. Achados prioritários

### P1 — A cadeia #152/#153 perdeu o isolamento do build TEST

O `scripts/build.mjs` de #152/#153 fixa `PROJECT="dlfvkawaiqduhlazsszm"` e usa esse mesmo projeto para `upstatus-test`. O `release.json` da candidata Normal continua em 3.4.7, igual ao runtime Normal instalado.

A #74 já contém o guard correto: exige `UPSTATUS_TEST_PROJECT_ID`, rejeita produção e rejeita o projeto de fixtures de sinalização, além de gerar sentinel inerte quando não há projeto configurado. O workflow de TEST também exige `vars.SUPABASE_TEST_PROJECT_ID`, valida a ref e usa CLI 2.122.1.

Essas proteções não foram portadas para #152/#153. O projeto de laboratório existente é de sinalização/autenticação, não um clone full-product. O inventário Supabase mostra somente dois projetos; não há terceiro projeto full-product TEST. Produção contém `upstatus-test` v281.

**Conclusão:** o Validate verde da #153 não prova isolamento do TEST. Não integrar #152/#153 antes de portar o guard da #74 e provisionar/configurar um projeto full-product separado.

### P1 — Comandos remotos e sinalização continuam em canal público nos bundles instalados

Edge Functions instaladas:
- Normal `upstatus` v480, userscript 3.4.7.
- Team Lite `upstatus-team-lite` v15, userscript 3.4.30.
- Ambos atualizados pela última vez em 29/10/2026.

Os dois bundles assinam `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` e sem `setAuth()`. Ambos registram listeners para `remote_command` e `call_signal`. O Normal encaminha diretamente o payload recebido a `executeRemoteCommand`; Team Lite verifica sessão/geração local, mas não autentica independentemente o emissor. O executor sincroniza o status no Sale Smartly, envia atualização ao backend e pode recarregar a página do Sale Smartly.

A recepção de `call_signal` também não comprova a identidade do remetente no transporte. Isso permite tentativa de sinalização/convite forjado; não foi realizado teste de exploração.

### P1 — Tópico de broadcast do banco diverge do tópico dos clientes

Consulta SELECT em produção encontrou 125 mensagens persistidas, todas `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- `db_change`: 46
- `user_status`: 67
- `remote_command`: 6
- `remote_result`: 6

Os bundles instalados assinam beta10, não esse tópico legado. Existe divergência de contrato entre triggers e clientes; pode quebrar ou atrasar notificações trigger-driven, embora haja caminhos de polling em parte do produto. Não afirmo perda total de atualização sem teste runtime.

O trigger `upstatus_broadcast_messages` transmite o registro OLD/NEW completo. Os três triggers são SECURITY DEFINER, `search_path=public`, com EXECUTE efetivo para anon e authenticated. O Security Advisor emitiu três WARN para anon e três WARN para authenticated.

### P1/P2 — Upload assinado da #153 está presente, mas ainda não tem hardening suficiente

A #153 restaura `signedUploadRoute` no server template e as rotas:
- `POST /api/chat/upload-url`
- `POST /api/profile/avatar-upload-url`

O handler exige sessão, allowlist de MIME declarado e tamanho declarado de até 20 MiB, gera caminho aleatório e cria signed upload URL com `upsert:true`. A validação do avatar restringe origin, bucket público e caminho canônico.

Lacunas confirmadas por inspeção:
- Não inspeciona assinatura/conteúdo real dos bytes; MIME e tamanho vêm do cliente.
- Não há rate limit/quota específico na emissão dos tickets.
- O caminho não é vinculado ao usuário autenticado.
- `profileRoute` aceita qualquer objeto canônico de uma única parte no bucket público `profile-images`, sem provar ownership do objeto.
- O teste `signed-upload-parity.test.mjs` verifica presença/contratos por assertions estáticas; não executa Deno handler, Storage PUT, leitura posterior ou abuso concorrente.

A correção estrutural da ausência das rotas é válida, mas a segurança e o comportamento runtime permanecem pendentes.

### P0 — Workflow oficial Team Lite ainda pode publicar o backend Normal

O workflow atual `.github/workflows/deploy-production.yml` em `team-lite-official` continua manual, usa secrets de produção, Supabase CLI `latest`, não valida a ref selecionada e executa `supabase functions deploy upstatus`. Esse slug é o backend Normal, não `upstatus-team-lite`.

#129 propõe desativar esse caminho com guard read-only; #128 propõe dispatcher novo com SHA exato, review humana allowlisted e confirmação explícita. Ambas estão abertas, sem reviews e não foram integradas. A variável `UPSTATUS_RELEASE_REVIEWERS` e os required reviewers do environment `production` ainda não foram verificados/configurados. Nenhum workflow de deploy foi executado.

### P1 — Mapper HTTP de voz não acompanha a RPC

A Edge Function de laboratório `upstatus-signal-test` v32 não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. A RPC retorna esse código, mas o mapper só reconhece `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`; o fallback é 500. A divergência foi confirmada estaticamente. Nenhuma chamada HTTP real foi feita.

## 5. Supabase — fotografia read-only

### Produção `dlfvkawaiqduhlazsszm`

Projeto ACTIVE_HEALTHY. Migrations registradas: 7. Branch gerenciada `main`: `MIGRATIONS_FAILED`; preview ACTIVE_HEALTHY.

- 10 tabelas public com RLS habilitado e sem policies.
- 9 tabelas public com grants diretos amplos a anon e authenticated; incluem DELETE, INSERT, SELECT, UPDATE, TRIGGER, REFERENCES e TRUNCATE.
- 166 grants diretos anon/authenticated em public/storage/realtime; 18 privilégios TRUNCATE.
- 120 entradas de privilégios em Default ACL para papéis clientes.
- `realtime.messages`: RLS habilitado, zero policies, FORCE RLS desabilitado; SELECT/INSERT/UPDATE concedidos a anon/authenticated.
- Três funções de broadcast SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated.
- Storage: buckets públicos `chat-images` (168 objetos) e `profile-images` (20 objetos), limite de 20 MiB cada, zero policies próprias em `storage.objects`.
- AUTH-03 ausente: zero colunas `setup_token_*`, zero tabelas de rate limit e zero rotinas de convite.

### Laboratório `bfpjtfqlnypisxljoxkb`

Projeto ACTIVE_HEALTHY, separado, mas restrito a fixtures de sinalização/autenticação; não é ambiente full-product TEST.

- 38 migrations; zero mensagens em Realtime; nenhum bucket ou objeto Storage.
- 18 tabelas public com RLS sem policies; zero grants diretos anon/authenticated em public.
- 40 grants anon/authenticated em schemas realtime/storage; 96 entradas Default ACL para papéis clientes.
- Três triggers com `search_path=""`, sem EXECUTE para anon/authenticated e payload reduzido; ainda enviam com `private=false`.
- AUTH-03 presente no laboratório: quatro colunas setup_token, duas tabelas de rate limit e duas rotinas de convite.
- `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

Os quatro SQLs originais abaixo retornam 404 em master:
1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

O ledger remoto não substitui a recuperação byte a byte dessas fontes.

## 6. Aceitação manual e issues

- Issue #78 permanece em 0/8 critérios físicos. Os comentários mais recentes disponíveis não registram teste instalado posterior a 08/11. Não houve confirmação de reconexão sem F5, permissões reais de microfone/tela ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 mantém um comentário QA e um comentário da Engenharia. O comentário da Engenharia foi preservado; o comentário QA existente foi atualizado, sem duplicatas.

## 7. Gates reavaliados

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | blocked | 125 mensagens persistidas, todas públicas; clientes sem private/auth; [produção](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm) |
| TEST-ISOLATION | blocked | #152/#153 usam projeto de produção para TEST; laboratório não é full-product; [#74 guard](https://github.com/Reekyi/UpStatus/pull/74), [#153](https://github.com/Reekyi/UpStatus/pull/153) |
| MIGRATION-PROVENANCE | blocked | quatro SQLs 404, produção 7 migrations e main MIGRATIONS_FAILED; [migrations](https://github.com/Reekyi/UpStatus/tree/master/supabase/migrations) |
| AUTH-03 | blocked | estruturas ausentes em produção e presentes somente no laboratório; [produção](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm), [laboratório](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb) |
| ACL-STORAGE | blocked | grants, Default ACL, RLS, SECURITY DEFINER e buckets públicos; [produção](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm) |
| RECONNECT | pending | 0/8 critérios físicos em [#78](https://github.com/Reekyi/UpStatus/issues/78) |
| HUMAN-REVIEW | pending | sem review humana em [#153](https://github.com/Reekyi/UpStatus/pull/153) e sem autorização de release |

## 8. Próximas ações

1. Portar para #152/#153 o guard TEST da #74 e provisionar um projeto full-product separado; não usar produção nem o laboratório de sinalização.
2. Completar upload assinado com validação de bytes, limite real, rate limit/quota e ownership por usuário; testar Deno + Storage real em projeto isolado.
3. Tornar Realtime privado/autorizado, remover confiança em remote_command público e autenticar participantes de voz/tela.
4. Alinhar tópico dos triggers e dos dois clientes, com testes de entrega ponta a ponta.
5. Integrar #129/#128 somente após revisão independente e configuração de allowlist/environment; manter dispatch bloqueado.
6. Corrigir mapper HTTP 409 no helper implantável e testar endpoint real no laboratório.
7. Recuperar os quatro SQLs originais e resolver MIGRATIONS_FAILED.
8. Revisar grants, Default ACL, RLS, SECURITY DEFINER e Storage.
9. Executar os oito critérios físicos e obter aprovação humana vinculada ao SHA final.

**Veredito: NOT READY.** Nenhum percentual de conclusão foi calculado nesta auditoria.
