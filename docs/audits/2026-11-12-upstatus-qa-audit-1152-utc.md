# Auditoria independente de qualidade do UpStatus

**Data:** 12/11/2026 08:52 BRT (11:52 UTC)  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`

## Veredito

**NOT READY.** Há baterias automatizadas fortes e candidatas que corrigem partes importantes, mas não existe uma linha única Normal/Team Lite com todas as correções, tópicos Realtime compatíveis, transporte autenticado ativo por padrão e fluxo de publicação integrado. Os bundles instalados ainda usam o processamento legado de comandos e sinais públicos.

Nenhum teste físico foi executado nesta rodada. Nenhuma produção foi alterada.

## 1. Heads e documentação

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `487744942835ce1803445c10731d7dedc250daad` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

A QA está **248 commits à frente e 1 atrás de master**. O documento `docs/RELEASE_READINESS.md` foi lido integralmente pelo Git blob: 8.410 linhas, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint interno é de **08/11/2026 18:30 UTC**, portanto está desatualizado para o estado de 12/11.

O endpoint de rulesets do repositório retorna lista vazia; `master` reporta `protected=false`. A consulta de proteção de `team-lite-official` retornou 403, então esse estado específico não foi confirmado. As PRs auditadas não possuem reviews humanas registradas.

## 2. PRs, heads e CI

| PR | HEAD | Estado/evidência |
|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Draft; Smoke PASS, 136/136; etapa do rate limit de emissão de convite foi skipped |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft; PASS histórico, não é validação recente da linha atual |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Draft; Candidate Checks PASS, 110/110 |
| #82 QA | `487744942835ce1803445c10731d7dedc250daad` | Draft; Validate FAIL: `production updateURL mismatch` |
| #133 Normal AUTH-03 | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` | Smoke PASS, 136/136, incluindo teste distribuído de rate limit |
| #141 staged chat | `4dba48196a1a605557ac7a853f6ae4adff0ea555` | Validate offline PASS |
| #142 API parity | `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4` | Validate offline PASS |
| #143 Normal dispatcher | `c4a04fa755b877bc76b1372170a26e7b974264e6` | Offline guard + Validate PASS; deploy não executado |
| #145/#146 remote status | `bbfda9d` / `71c5ce2` | Validate offline PASS nos heads atuais |
| #147 updater/chat | `fdc727d072008b064fb8f3c4af52067c5da15111` | Candidata single-runtime; integrada pela #151 |
| #149 Team Lite call-source | `77352d2e3b93722d6b69a9eec31a92bb63158230` | Candidate Checks PASS, 110/110 |
| #151 admin/chat | `60b686aefc1e5ae01197a8be8c7956ef9cc56bd3` | Full Validate PASS, mas não cobre AUTH-03 nem reconcilia upload assinado |

Evidências:
- [#74 Smoke 136/136](https://github.com/Reekyi/UpStatus/actions/runs/42753434336)
- [#76 Candidate Checks 110/110](https://github.com/Reekyi/UpStatus/actions/runs/43124413080)
- [#82 Validate FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43202954452)
- [#133 Normal AUTH-03 136/136](https://github.com/Reekyi/UpStatus/actions/runs/42804903887)
- [#141 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43085700956)
- [#142 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43085494740)
- [#143 dispatcher guard](https://github.com/Reekyi/UpStatus/actions/runs/43093687347)
- [#149 Team Lite 110/110](https://github.com/Reekyi/UpStatus/actions/runs/43173176232)
- [#151 Full Validate](https://github.com/Reekyi/UpStatus/actions/runs/43196245858)

Os resultados acima são CI. Os testes de navegador e banco usam o laboratório isolado; não equivalem a aceitação física no Sale Smartly/Tampermonkey.

## 3. Conflito de arquitetura Normal

Há duas linhas concorrentes:

### Dual-runtime (#141/#142/#143)

- Distribuição do userscript em `upstatus`.
- API permanece em `upstatus-screen-share-3-1-1-beta10`.
- Build separa `PROD_FUNCTION` de `PROD_API_FUNCTION`.
- `updateURL` e `downloadURL` vêm de `release.json.scriptUrl`.
- #142 restaura `/api/chat/upload-url` e `/api/profile/avatar-upload-url`, com validação de tamanho/tipo e URL assinada.
- #143 despacha primeiro beta10 e depois upstatus, com CLI fixada, SHA exato, PR aprovado, projeto/organização esperados e confirmação manual. O job de deploy não foi executado.

### Single-runtime (#133/#147/#151)

- API e distribuição passam a apontar para `upstatus`.
- #133 inclui signed upload routes e AUTH-03.
- #151 remove o fallback administrativo nominal e passa no Validate completo.
- Porém o template da #147/#151 não contém `signedUploadRoute`, `/api/chat/upload-url` nem `/api/profile/avatar-upload-url`. Usá-lo como API sem portar os handlers presentes em #133/#142 pode regredir upload de anexos/avatar.
- #151 ainda não exige `setupToken` em `POST /api/setup`; uma conta já marcada como admin, mas sem senha, preservaria o papel no primeiro setup.

**Conclusão:** não misturar #142/#143 com #147/#151 sem escolher explicitamente um modelo e reconciliar o template. #133 contém convite obrigatório, rate limit e upload assinado, mas ainda precisa receber a UI staged de chat da linha #141/#151 e passar novamente pela suíte completa.

## 4. Compatibilidade Normal / Team Lite e sinalização

Os candidatos não estão alinhados em todos os pontos:

- Normal #142 usa o tópico `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite #149 usa o tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Normal #133 e Team Lite #149 usam o tópico legado comum.
- Os clientes instalados Normal e Team Lite usam beta10, enquanto os triggers SQL ainda publicam no tópico legado.

No Normal #133 e Team Lite #149, `signaling_transport_enabled` continua false por padrão e o endpoint autenticado começa vazio. Com a flag desligada, os listeners públicos continuam sendo a via de sinalização. Quando habilitado, o código passa a exigir proveniência autenticada fora do payload e limita os broadcasts públicos a avisos de descoberta.

A #149 remove a confiança em `_authenticatedTransport` fornecido pelo próprio payload, usando um argumento de origem separado. Isso é uma melhoria real, mas não é ativação segura por padrão. O endpoint `upstatus-signal-test` v32 existe apenas no laboratório; não há função server-mediated equivalente implantada em produção.

## 5. Bundles e Edge Functions instalados

Inspeção direta e decodificação dos bundles de produção:

| Runtime | Versão da Edge Function | Userscript embutido | API usada pelo cliente |
|---|---:|---:|---|
| Normal delivery `upstatus` | v480 | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` v6 |
| Team Lite `upstatus-team-lite` | v15 | 3.4.30 | `upstatus-team-lite` |
| TEST | v281 | — | Está dentro do projeto de produção |

Nos bundles instalados, Normal e Team Lite ainda:
- executam `remote_command` diretamente a partir do broadcast;
- aceitam `call_signal` sem autenticar a origem fora do payload;
- processam eventos públicos de voz e salas de compartilhamento;
- não configuram Realtime privado com `private:true` e `setAuth()`.

O primeiro setup implantado ainda não exige convite e mantém fallback administrativo por nome. As cinco contas atuais estão configuradas (3 admins, 2 usuários; nenhuma sem senha), então não foi encontrada conta atualmente vazia; o risco é latente no fluxo de provisionamento.

As 38 Edge Functions de produção reportam `verify_jwt=false`. Isso não prova ausência de autenticação: os endpoints principais usam sessão/token próprio, que precisa ser validado por handler.

## 6. Supabase: Realtime, RLS, grants, ACL e Storage

### Realtime

Snapshot read-only:
- 109 linhas persistidas com `private=false` no tópico legado.
- 57 `user_status`, 40 `db_change`, 6 `remote_command`, 6 `remote_result`.
- Clientes instalados assinam beta10, não o tópico usado pelos triggers.
- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; SELECT/INSERT/UPDATE concedidos a anon/authenticated.

Os três triggers `upstatus_broadcast_*` são SECURITY DEFINER, têm `search_path=public` e EXECUTE para anon/authenticated. O Security Advisor aponta 6 WARN (três funções para cada papel) e 10 INFO de RLS sem policy. O Advisor classifica as funções como expostas via RPC; não foi feita chamada HTTP de exploração.

O trigger `upstatus_broadcast_messages` publica OLD/NEW completo no evento `db_change`, incluindo conteúdo da linha. A migration `20261103170000_minimize_public_status_broadcasts.sql` altera somente os broadcasts de status e estado remoto; não remove o payload completo de mensagens.

### RLS e grants

| Schema | Grants diretos a anon/auth |
|---|---:|
| public | 126 |
| storage | 32 |
| realtime | 8 |
| **Total** | **166** |

Em `public`, 10 tabelas têm RLS sem policies; 9 têm grants diretos a papéis clientes e 9 incluem TRUNCATE. RLS não filtra TRUNCATE. Não foi tentada exploração.

Default ACL de produção: 120 entradas expandidas para anon/auth, incluindo defaults de postgres em public/storage e supabase_admin em public/graphql/graphql_public. No laboratório, public tables não têm grants diretos aos papéis clientes, mas permanecem defaults amplos em storage e em schemas criados por supabase_admin.

### Storage e mensagens

- Dois buckets públicos: `chat-images` (168 objetos) e `profile-images` (20).
- Limite de 20 MiB por bucket.
- Zero policies próprias em `storage.objects`.
- 296 mensagens; 296 com `file_name` nulo.

## 7. AUTH-03 e proveniência das migrations

Produção:
- 7 migrations no ledger.
- Sem colunas `setup_token_*`.
- Sem tabela `upstatus_setup_invite_rate_limits`.
- Sem RPC `consume_upstatus_setup_invite` e sem RPC de rate limit.

Candidatos Normal #133 e Team Lite #76:
- Migration `20261109230000_setup_invite_rate_limit.sql`: Git blob SHA idêntico `ab73b5cd8200147a449327d21798eef588834d50`.
- Test migration: Git blob SHA idêntico `bd12f37dc464c3b1ab322494914d0763fa733d49`.
- Normal 136/136 e Team Lite 110/110.

Ressalva de execução: o ledger do laboratório registra `20261110000612_setup_invite_rate_limit_contract_test_20261109`, mas não registra a migration de produção `20261109230000`. A tabela/RPC do laboratório vêm da migration test-only em `supabase/test-migrations`; portanto os testes validam o contrato isolado, mas não demonstram que o arquivo de produção foi aplicado pelo fluxo normal de migrations.

Proveniência histórica:
- Produção tem 7 migrations.
- Três fontes originais têm Git blob verificado no manifesto #127.
- Quatro fontes foram recuperadas como statements do ledger em #135, não como arquivos originais byte a byte.
- O dispatcher #143 exige `provenance=git-blob-verified` e SHA de 40 hex; falha fechado para as quatro fontes `ledger-recovered-only`.

A branch Supabase `main` está `MIGRATIONS_FAILED`; preview está `ACTIVE_HEALTHY`.

## 8. Ambiente de teste

Existem dois projetos Supabase:
- Produção: 38 Edge Functions, 7 migrations.
- Laboratório: 2 Edge Functions (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3), 39 migrations.

O laboratório foi conferido: zero linhas nas 15 tabelas de fixtures consultadas, zero buckets/objetos Storage e zero mensagens Realtime. Não existe terceiro projeto full-product TEST; `upstatus-test` v281 está no projeto de produção.

## 9. Workflows e governança de publicação

- Workflow oficial Team Lite em `team-lite-official` usa CLI `latest` e executa `supabase functions deploy upstatus`, o slug Normal. Não executar.
- #125 propõe dispatcher Team Lite no default branch, SHA/PR/review/version exatos, confirmação explícita e CLI 2.122.1; deploy único para `upstatus-team-lite`.
- #128 adiciona allowlist de revisores.
- #129 transforma o workflow legado em bloqueio fail-closed.
- #125/#128/#129 continuam Draft; #129 ainda não foi incorporada à branch oficial.
- #143 propõe dispatcher Normal dual-runtime com SHA/PR/review/versão/projeto exatos, CLI 2.122.1 e deploy beta10 antes de upstatus. É manual; o deploy foi skipped nos checks de PR.
- O preflight #143 exige fontes originais de todas as sete migrations e branch main saudável; com o estado atual, deve bloquear.
- `master` está desprotegida e o endpoint de rulesets retorna zero regras. Não há reviews humanas nas PRs auditadas.

## 10. Aceitação manual e issues

- Issue #78: 0/8 critérios físicos aprovados. Não foram executados queda real de internet, reconexão sem F5, microfone real, permissões reais de tela ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79: checklist 16 itens marcados e 19 abertos. O comentário dedicado QA foi atualizado no comentário existente `6744331652`; o comentário da Engenharia `6744711778` foi preservado.

## 11. Prioridades

1. Escolher dual-runtime (#142/#143) ou single-runtime (#133/#147) e integrar tudo em uma única linha.
2. Portar AUTH-03 e remoção completa do fallback nominal para o template escolhido.
3. Preservar signed upload routes e a UI staged de chat na mesma versão.
4. Alinhar o tópico Normal/Team Lite e ativar transporte autenticado por padrão; não manter fallback público como autoridade.
5. Remover payload completo de `db_change`, restringir SECURITY DEFINER/RPC, grants e Default ACL.
6. Recuperar as quatro fontes SQL originais; aplicar a migration AUTH-03 de produção no laboratório pelo fluxo de migrations, não apenas a test migration.
7. Incorporar o guard Team Lite e corrigir o workflow oficial antes de qualquer dispatch.
8. Corrigir Validate da QA.
9. Executar os oito testes físicos da #78 e obter aprovação humana.

## 12. Limites desta execução

Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags ou operação destrutiva. As únicas escritas foram este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.
