# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-12 19:45 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## 1. Escopo e limites

- Leitura integral de `docs/RELEASE_READINESS.md` na branch QA: 8.409 linhas de conteúdo; último checkpoint interno encontrado em 08/11/2026 às 18:30 UTC.
- Conferidos refs, PRs, workflows, logs de jobs, issues e comentários do Control Center.
- Supabase consultado somente por leitura: catálogos PostgreSQL, grants, RLS, funções, migrations, Edge Functions, advisors e metadados de projetos.
- Não havia checkout local disponível. Não executei scripts localmente, navegador, chamadas HTTP de voz/upload nem testes físicos. Os resultados de CI abaixo são logs existentes, não testes executados nesta auditoria.
- Nenhuma escrita em produção, migration, deploy, release, secret, flag ou permissão foi realizada.

## 2. Heads e divergência

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `de49c6d3d2bfc2205e73e0e95c2231230bd969f2` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

QA está **260 commits à frente e 1 atrás** de master; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Master e QA aparecem sem proteção de branch na consulta de branches. Não encontrei reviews humanas nas PRs principais nem nas novas candidatas #128, #129, #152 e #153.

A #152 está 12 commits à frente e 4 atrás da QA atual. A #153 está empilhada sobre a #152, com 6 commits à frente e zero atrás de sua base. Não fiz rebase.

## 3. PRs obrigatórias e CI

| PR | HEAD observado | Resultado atual observado |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336): PASS no HEAD atual |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Candidate Checks [43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080): PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `de49c6d3d2bfc2205e73e0e95c2231230bd969f2` | Validate [43282383059](https://github.com/Reekyi/UpStatus/actions/runs/43282383059): FAIL |
| [#152 updater/chat](https://github.com/Reekyi/UpStatus/pull/152) | `ed43e2336a54c4fc4b4c1b75db580ae06d1ebf8d` | Push [43264733860](https://github.com/Reekyi/UpStatus/actions/runs/43264733860) e PR [43265009470](https://github.com/Reekyi/UpStatus/actions/runs/43265009470): PASS |
| [#153 signed-upload parity](https://github.com/Reekyi/UpStatus/pull/153) | `78b3f4e4bd598d5c7cab8e20a83959af3839120a` | Push [43286319294](https://github.com/Reekyi/UpStatus/actions/runs/43286319294): PASS no HEAD exato |

### Falha persistente da QA

O job da #82 executou `node scripts/validate.mjs`, construiu PROD 3.4.7 / TEST 3.4.7 e falhou em `scripts/validate.mjs:26`:

`VALIDATION FAILED: production updateURL mismatch`

Log: [run 43282383059](https://github.com/Reekyi/UpStatus/actions/runs/43282383059). Não removi assertions nem fiz rerun.

### PR #152

A correção de updater e as regressões de chat passaram. O run de PR testou o merge ref `82a7487d` (merge de `ed43e23` sobre `4c591e8`); o push run também passou no HEAD `ed43e23`. A versão gerada continua 3.4.7, igual à Normal instalada. A PR permanece Draft e não inclui AUTH-03 nem a restauração do backend de upload assinada, que chegou pela PR seguinte.

### PR #153: avanço real e ressalvas

A #153 adiciona `signedUploadRoute` e os POSTs `/api/chat/upload-url` e `/api/profile/avatar-upload-url` a `src/server/index.template.ts`. Também adiciona `scripts/signed-upload-parity.test.mjs` ao Validate. O log do push no SHA atual confirma:

- `QA release target, updater-channel and chat-role contracts PASS`;
- `Chat regression tests passed`;
- `Signed upload parity passed`;
- `Validation OK: PROD 3.4.7 / TEST 3.4.7`.

Log: [43286319294](https://github.com/Reekyi/UpStatus/actions/runs/43286319294).

O teste é **estático**: verifica strings, dispatch das rotas, campos do ticket, PUT, MIME allowlist, tamanho declarado e que as rotas ficam depois do guard de sessão. Não executa upload real no Storage nem valida os bytes recebidos.

A PR #153 continua Draft e sem review. Seu workflow adiciona a branch ao gatilho `push`, mas o gatilho `pull_request` continua limitado à base QA. Como a base da #153 é a branch da #152, não há check de PR/merge-ref para essa candidata; há somente o push PASS no HEAD.

Hardening pendente da implementação:
- O servidor valida MIME e tamanho **declarados** pelo cliente, não a assinatura dos bytes nem o tamanho real após o upload.
- O limite assinado é 20 MiB tanto para chat quanto para avatar; o fallback antigo de avatar por Data URL limita 2 MiB. Definir e testar um limite de avatar consistente.
- O caminho do objeto não é vinculado explicitamente ao usuário autenticado; a rota de avatar aceita qualquer URL canônica no bucket público `profile-images`. Avaliar vínculo/ownership.
- O caminho legado de imagem por Data URL ainda aceita até 25 MiB, enquanto o bucket `chat-images` limita 20 MiB.

A #153 corrige a ausência de rotas no template, mas não fecha esses pontos nem substitui uma integração runtime.

### Guards de publicação Team Lite

- [#129](https://github.com/Reekyi/UpStatus/pull/129): o guard de desativação do workflow legado passou em push e PR no HEAD `f48a2d9`, run [42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545). A branch oficial ainda mantém o workflow perigoso até integração/review.
- [#128](https://github.com/Reekyi/UpStatus/pull/128): o verificador de aprovação humana vinculada ao SHA exato passou em [42994078899](https://github.com/Reekyi/UpStatus/actions/runs/42994078899). Exige a variável `UPSTATUS_RELEASE_REVIEWERS` configurada pelo proprietário e falha fechado se ausente. A configuração de required reviewers do environment permanece não verificada; o PR pai #125 ainda tem Validate FAIL [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421). #128 e #129 permanecem Draft.

## 4. Edge Functions e compatibilidade instalada

Produção está ACTIVE_HEALTHY. As funções principais observadas:
- `upstatus`: v480, `verify_jwt=false`;
- `upstatus-team-lite`: v15, `verify_jwt=false`;
- `upstatus-test`: v281 no próprio projeto de produção;
- `upstatus-screen-share-3-1-1-beta10`: v6.

Os handlers principais usam sessão própria; `verify_jwt=false` isoladamente não prova endpoint aberto. Porém, os userscripts embutidos nos bundles Normal e Team Lite ainda assinam o tópico beta10 e escutam broadcasts `remote_command`, `call_signal`, voz e tela. O Normal executa o objeto `command` recebido quando o alvo coincide; Team Lite também verifica sua sessão local/generation, mas não comprova independentemente a identidade do emissor. Não encontrei `private:true` nem `setAuth()` nesses bundles.

## 5. Supabase produção: segurança e Realtime

Consultas SQL sequenciais, exclusivamente SELECT, no projeto `dlfvkawaiqduhlazsszm` confirmaram:

### Realtime

- 119 mensagens persistidas, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Distribuição: 67 `user_status`, 40 `db_change`, 6 `remote_command`, 6 `remote_result`.
- Os userscripts instalados assinam `upstatus-screen-share-live-3-1-1-beta10`: tópico divergente dos triggers.
- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; SELECT/INSERT/UPDATE concedidos a anon e authenticated.

### SECURITY DEFINER e grants de função

Correção importante em relação ao checkpoint intermediário: **o hardening observado está no laboratório, não na produção**. A reconsulta sequencial e isolada do projeto de produção confirmou que as três funções `upstatus_broadcast_*` continuam:

- SECURITY DEFINER;
- `search_path=public`;
- EXECUTE concedido a PUBLIC, anon e authenticated;
- `upstatus_broadcast_messages` transmite OLD/NEW completo;
- `upstatus_broadcast_remote_state` transmite campos de command/result;
- `upstatus_broadcast_users` transmite name/status/reason/updated_at/sync.

O Security Advisor de produção reporta 3 WARN de função SECURITY DEFINER executável por anon, 3 WARN para authenticated e 10 INFO de RLS sem policies. A leitura direta do catálogo confirma os grants.

### RLS, grants, Default ACL e Storage

- 10 tabelas public com RLS habilitado e zero policies.
- 9 dessas tabelas têm grants diretos para anon/authenticated, incluindo SELECT/INSERT/UPDATE/DELETE e TRUNCATE. TRUNCATE não é protegido por RLS.
- Default ACLs amplas para anon/authenticated em objetos futuros de postgres (public/storage) e supabase_admin (public/graphql/graphql_public), incluindo EXECUTE em funções e privilégios amplos de tabela, além de sequência.
- Buckets `chat-images` e `profile-images` são públicos, limite 20 MiB, com 168 e 20 objetos respectivamente.
- Zero policies próprias em `storage.objects`.

### AUTH-03 e migrations

Produção não possui colunas `setup_token_*`, tabela de rate limit nem RPC de consumo de convite. O ledger de produção contém 7 migrations.

A branch gerenciada Supabase `main` está em `MIGRATIONS_FAILED`; o preview aparece ACTIVE_HEALTHY. Os quatro arquivos SQL originais ausentes em master continuam sem proveniência byte a byte:
1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

A recuperação de statements do ledger não substitui os arquivos originais.

## 6. Laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`) está ACTIVE_HEALTHY e é separado da produção.

- 38 migrations.
- 18 tabelas public com RLS e sem policies, mas zero grants diretos equivalentes para anon/authenticated nas tabelas public consultadas.
- Zero buckets, zero objetos Storage e zero mensagens Realtime.
- AUTH-03: quatro colunas `setup_token_*`, tabelas de rate limit e RPC de consumo presentes.
- Os três triggers `upstatus_broadcast_*` ainda são SECURITY DEFINER, mas usam `search_path=''`, ACL limitada a postgres/service_role e payload reduzido a `{op}`. Ainda enviam com `private=false`.
- Default ACLs ainda são amplas em Storage e objetos de supabase_admin (public/graphql/graphql_public).

O isolamento do projeto de segurança está comprovado. Porém, não existe terceiro projeto full-product TEST independente; `upstatus-test` v281 permanece dentro do projeto de produção.

### Contrato HTTP de voz no laboratório

A Edge Function `upstatus-signal-test` v32 ainda não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para 409; o código cai no fallback 500. A RPC PostgreSQL retorna esse código. O helper offline da candidata espera 409. **Não executei request HTTP real**: é divergência estática entre RPC, helper e função implantada, não resposta reproduzida em rede.

## 7. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados. Sem evidência de reconexão Normal/Team Lite sem F5, reentrada de voz, microfone, permissões reais de tela ou interoperabilidade instalada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16 itens marcados e 19 pendentes no corpo. Comentário QA dedicado `6744331652` e comentário da Engenharia `6744711778` preservados; exatamente um marcador de cada tipo.

## 8. Gates e recomendação

| Gate | Estado | Evidência principal |
|---|---|---|
| RT-01 | **blocked** | 119 eventos public, tópico divergente, funções e listeners ainda públicos |
| TEST-ISOLATION | **done** | projeto de segurança separado, vazio e usado pelos testes isolados |
| MIGRATION-PROVENANCE | **blocked** | quatro SQLs originais ausentes; main `MIGRATIONS_FAILED` |
| AUTH-03 | **blocked** | estruturas existem no laboratório, mas não em produção |
| ACL-STORAGE | **blocked** | grants/Default ACL amplos e buckets públicos |
| RECONNECT | **pending** | 0/8 testes físicos; aguarda teste real sem F5 |
| HUMAN-REVIEW | **pending** | PRs Draft, sem review humana e sem autorização de release |

**Recomendação: NOT READY.** Não existe candidata única integrada, com transporte privado/autorizado, permissões saneadas, migrations reproduzíveis, testes físicos aprovados e aprovação humana.

## 9. Próximas ações recomendadas

1. Adicionar check de `pull_request` para a base #152 na workflow da #153 e validar o merge ref.
2. Endurecer upload: verificar bytes/tamanho efetivos, definir limite específico de avatar e avaliar ownership do objeto; depois fazer teste runtime no laboratório.
3. Integrar #152/#153 à QA somente após reconciliação dos commits e revisão da cadeia completa.
4. Alinhar o tópico Normal/Team Lite e migrar broadcasts para transporte privado/autorizado; remover confiança em `remote_command` público.
5. Aplicar mudanças de SECURITY DEFINER, RLS, grants e Default ACL por migrations revisadas e rastreáveis.
6. Recuperar os quatro SQLs originais e resolver `MIGRATIONS_FAILED`.
7. Integrar o guard #129 antes de qualquer dispatch Team Lite; manter o dispatcher #128 fail-closed até allowlist e required reviewers serem configurados.
8. Executar os oito critérios físicos e obter aprovação humana no SHA final.

**Limite operacional:** nenhum teste manual ou HTTP foi executado nesta rodada; nenhum deploy, merge, migration, release ou alteração de produção ocorreu. As únicas escritas desta execução são este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.
