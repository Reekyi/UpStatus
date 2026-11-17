# Auditoria independente de qualidade do UpStatus

**Data:** 2026-11-15 17:41 UTC  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Recomendação:** **NOT READY**.

## 1. Método e limites

- Leitura de `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`. O arquivo contém 8.422 linhas e aproximadamente 1,05 MB; a última seção histórica de revalidação encontrada é de 15/11 às 06:30 UTC. Este relatório complementa o documento sem reescrevê-lo.
- GitHub: heads, comparações, arquivos, diffs, comentários, reviews e logs de Actions.
- Supabase: inventário de projetos/functions/migrations, Advisors, fontes das Edge Functions, catálogos PostgreSQL e logs. Todas as consultas SQL executadas nesta auditoria foram SELECT-only.
- Nenhum teste de produto foi executado nesta execução. Foram inspecionados resultados de CI existentes. Não havia checkout local nem navegador Tampermonkey/dispositivos para teste manual.
- Nenhum secret foi lido. Nenhuma migration, deploy, merge, release, flag, permissão ou publicação foi alterada.

## 2. Heads reais

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `9adc810976e8f629cc3109667aae072c48e125ce` |

Comparações:
- QA: 342 commits à frente e 1 atrás de master.
- PR #74: 887 à frente e 1 atrás de master.
- PR #75: 59 à frente e 0 atrás de team-lite-official.
- PR #76: 386 à frente e 0 atrás de team-lite-official.

A QA é também o HEAD da PR #82. O relatório foi criado como arquivo novo nesta branch, sem substituir arquivo existente.

## 3. PRs obrigatórias e evidência de CI

| PR | HEAD atual | Evidência observada | Estado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | A candidata corrige o build para usar `release.json.scriptUrl`; não foi localizado run independente no HEAD atual. A base foi exercitada no stack da #161. | Draft; sem review |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), PASS histórico. | Draft; baseline superada pela #76 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881), todos os passos concluídos com sucesso. | Draft; sem review |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `9adc810976e8f629cc3109667aae072c48e125ce` | Validate [43736464423](https://github.com/Reekyi/UpStatus/actions/runs/43736464423), FAIL em `scripts/validate.mjs:26`. | Draft; docs-only |

A #82 altera 189 arquivos, todos documentais. O run 43736464423 validou o merge ref `1bbef6580338006df65cfa6c63f44a00fd2fbabb`, construiu PROD 3.4.7 / TEST 3.4.7 e falhou com `production updateURL mismatch`.

### Candidatas auxiliares relevantes

- [#161](https://github.com/Reekyi/UpStatus/pull/161), HEAD `557814dc31bed779b84a2094358dc6b2a7e67689`: Validate [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e Smoke [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445), PASS. O Smoke concluiu 19/19 verificações não autenticadas e 136/136 autenticadas, incluindo consumo atômico de convite e rate limit distribuído de setup-invite.
- [#163](https://github.com/Reekyi/UpStatus/pull/163), HEAD `00f357b0f5921d1995bb52c7b50f53ef8276e334`: contrato HTTP 409 [43488594110](https://github.com/Reekyi/UpStatus/actions/runs/43488594110) e Validate [43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143), PASS. É teste offline; a função implantada no laboratório continua v32 sem o mapeamento `VOICE_ATTEMPT_ALREADY_ACTIVE`.
- [#164](https://github.com/Reekyi/UpStatus/pull/164), HEAD `a27ced56564f3d18948c70138c6d6b2a1f2d0907`: Validate [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609), PASS. Upload/Storage são mocks; não houve upload real.

Reviews GitHub: zero reviews submetidas nas PRs #74, #75, #76, #82, #161, #163 e #164. PASS de CI não é aprovação humana nem autorização de release.

## 4. Build, manifestos e workflows

### Correção de auditoria sobre os manifestos

O `master/release.json` está em **3.4.7 estável**, com `preRelease` vazio e `scriptUrl` apontando para `/functions/v1/upstatus/upstatus.user.js`. A afirmação anterior de que o manifesto raiz de master era beta.22 estava incorreta: **beta.22 está no `release.json` raiz da branch `team-lite-official`**. O manifesto próprio `team-lite/release.json` declara buildVersion 3.4.30 estável.

### Causa reproduzida do Validate #82

No master, `scripts/build.mjs` ainda constrói o URL de atualização Normal a partir do endpoint legado `upstatus-screen-share-3-1-1-beta10` e não usa `release.json.scriptUrl`. O validator exige `/upstatus/upstatus.user.js`. Isso explica o FAIL do run 43736464423.

A candidata #74 já altera o build para ler `release.scriptUrl` e exigir correspondência exata com o endpoint Normal. A candidata #161 também muda o `CLOUD_SERVER` da API Normal para `upstatus`, realizando o cutover do endpoint. Essas correções continuam fora de master. A #161 ainda exige decisão de versionamento: a versão do manifest continua 3.4.7, igual à versão instalada.

### Workflows atuais

- [Master deploy-production](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml): manual (`workflow_dispatch`), environment production, trava versão 3.4.7, CLI `latest`, deploy do slug `upstatus`.
- [Team Lite deploy-production](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml): lê o manifesto raiz da branch Team Lite, que está em beta.22 e falha no guard de prerelease; se o guard fosse removido sem corrigir o comando, ainda publicaria `upstatus`, não `upstatus-team-lite`. CLI `latest`.
- [Develop deploy-test](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml): dispara em push para develop e workflow_dispatch; usa o secret genérico `SUPABASE_PROJECT_ID`, CLI `latest` e não valida o ref contra uma allowlist de projeto TEST. O valor do secret não foi lido, portanto o destino efetivo não foi afirmado.

## 5. Runtimes instalados e compatibilidade

Fontes dos Edge Functions implantados e userscripts embutidos foram inspecionadas:

| Cliente | Userscript servido | API realmente usada | Runtime API |
|---|---|---|---|
| Normal | 3.4.7, servido por `upstatus` v480 | `upstatus-screen-share-3-1-1-beta10` | v6, código interno 3.1.1-beta8 |
| Team Lite | 3.4.30 | `upstatus-team-lite` | v15, código interno 3.4.30 |

O userscript Normal tem updater/download em `upstatus`, mas seu `CLOUD_SERVER` continua apontando para beta10. O API backend efetivamente chamado pelo cliente Normal é, portanto, muito mais antigo que o userscript. O cache local de sessão observado nos handlers principais é de 30 segundos.

Nos runtimes de produção:
- `/api/setup` aceita primeiro setup sem convite de uso único.
- `/api/account` revela `needsSetup` sem autenticação.
- O fallback de papel administrativo atribui `implementation_admin` a nomes conhecidos quando o papel está vazio.
- `/api/chat/clear` verifica somente `name === "Ricardo"`, sem exigir o papel persistido `implementation_admin`.
- Normal exige senha mínima de 6 caracteres; Team Lite exige 4, tanto no setup quanto no login.

As candidatas melhoram o contrato: Team Lite #76 usa `setup ? 6 : 4`, token de primeiro acesso, preservação literal de papel e chat-clear exigindo Ricardo **e** papel administrativo. A #161 adiciona rate limit distribuído ao Normal. Essas mudanças não estão nos runtimes instalados.

A validação de MIME implantada ainda retorna o MIME declarado pelo cliente quando não reconhece a assinatura dos bytes. Não foi reproduzido exploit; é inspeção de código.

## 6. Realtime

Snapshot de produção em `realtime.messages`: **106 eventos, todos `private=false`**:
- 72 `user_status`
- 26 `db_change`
- 4 `remote_command`
- 4 `remote_result`

Os dois userscripts instalados assinam o tópico público `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` ou `realtime.setAuth()`.

Os triggers PostgreSQL de produção enviam para outro tópico: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, também com `private=false`. Há, portanto, uma divergência objetiva entre o tópico dos triggers e o tópico dos clientes.

A função de broadcast de mensagens envia o registro OLD/NEW completo com `to_jsonb`. A função de remote-state publica campos de comandos e resultados. As três funções de broadcast são SECURITY DEFINER, usam `search_path=public` e têm EXECUTE para PUBLIC, anon, authenticated e service_role. O Security Advisor reporta 3 WARN para anon e 3 WARN para authenticated.

No laboratório, os broadcasts minimizam o payload para `{op: TG_OP}`, usam `search_path` vazio e EXECUTE somente para service_role, mas continuam com `private=false` e o tópico `upstatus-live-...`. RT-01 continua bloqueado.

## 7. RLS, grants, ACL e Storage

### Produção

- 10 tabelas public com RLS habilitado e sem policies.
- 9 tabelas public com grants diretos para anon/authenticated: 126 linhas de privilégios.
- 18 grants TRUNCATE distribuídos nessas 9 tabelas. RLS não bloqueia TRUNCATE.
- 24 registros de default ACL; 15 incluem anon/authenticated.
- Dois buckets públicos: `chat-images` e `profile-images`, ambos com limite de 20 MiB.
- 188 objetos Storage e zero policies próprias em `storage.objects`.

RLS sem policy não prova, por si só, que cada privilégio SELECT/INSERT seja efetivo; os grants continuam sendo uma superfície desnecessária e TRUNCATE não é protegido por RLS.

### Laboratório

- 18 tabelas public com RLS e sem policies.
- Zero grants diretos anon/authenticated nas tabelas public.
- 25 registros de default ACL; 12 incluem anon/authenticated, principalmente em objetos de supabase_admin nos schemas public/graphql/graphql_public e Storage.
- Três funções SECURITY DEFINER de broadcast com `search_path` vazio e EXECUTE restrito a service_role.
- Zero buckets e zero objetos Storage.

O laboratório está melhor nas ACLs explícitas das tabelas public, mas os default ACLs de supabase_admin ainda são amplos para objetos futuros.

## 8. Edge Functions, migrations e projetos

- Produção: 38 Edge Functions ACTIVE; laboratório: 2 ACTIVE. Todas reportam `verify_jwt=false` na configuração da plataforma. Os handlers principais inspecionados implementam autenticação própria por `x-upstatus-token`, hash SHA-256, expiração e cache de 30 segundos. Isso não substitui uma revisão rota a rota das funções legadas/test/backup, também ativas.
- Produção: `upstatus` v480, `upstatus-test` v281, `upstatus-team-lite` v15 e beta10 v6.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Produção possui 7 migrations no ledger. A branch gerenciada `main` está em `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`.
- Laboratório possui 39 migrations e nenhuma branch gerenciada.
- A tabela `public.upstatus_setup_invite_rate_limits` e a RPC `consume_upstatus_setup_invite_rate_limit(p_bucket_key text, p_limit integer, p_window_seconds integer)` existem no laboratório. A RPC é SECURITY INVOKER, usa `search_path` vazio e EXECUTE apenas para service_role. Tabela e RPC não existem em produção.
- Os quatro SQLs originais abaixo retornam 404 tanto em master quanto na QA, embora suas versões constem no ledger de produção:
  1. `20261023154754_create_upstatus_visual_config.sql`
  2. `20261026195855_add_chat_message_file_name.sql`
  3. `20261027154329_allow_chat_document_mime_types.sql`
  4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

O laboratório é um ambiente de sinalização/auth, não Full-Product TEST: não possui buckets nem fixtures completos de usuários, mensagens, sessões, salas e memberships.

## 9. HTTP 402 e disponibilidade

Janela consultada: 2026-11-14 17:34:21 UTC a 2026-11-15 17:34:21 UTC.

Produção registrou **64 respostas HTTP 402**:
- 21 chat
- 10 status
- 10 remote-status
- 9 download Normal
- 8 download Team Lite
- 6 WebSocket Realtime

A primeira ocorrência desta janela foi às 17:36:31 UTC e a última às 20:57:39 UTC de 14/11. Não há logs de Edge Function posteriores nesse recorte. Isso não comprova recuperação, pois pode representar ausência de tráfego. A causa dos 402 não foi identificada.

Laboratório: zero HTTP 402 na janela consultada, mas também não houve `function_edge_logs` na janela. Um run de CI anterior, [43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747), registrou `exceed_edge_functions_invocations_quota`; é evidência histórica de restrição por quota, não prova de que a restrição continua ou foi resolvida. Nenhum dado de Usage/Billing foi acessado.

## 10. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos marcados. Reconexão Normal e Team Lite sem F5, reentrada, chamadas após reconexão, ausência de peers/pollers órfãos, regressão automatizada e teste manual continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16 caixas marcadas e 19 desmarcadas no corpo atual. Isso é contagem de checklist, não percentual de prontidão.
- Nenhum teste manual foi realizado nesta auditoria. Os resultados CI citados são execuções anteriores inspecionadas, não testes repetidos nesta execução.
- Nenhuma das PRs obrigatórias ou candidatas auxiliares tem review humana submetida.

## 11. Gates

| Gate | Estado | Evidência resumida |
|---|---|---|
| RT-01 | BLOCKED | 106 eventos públicos, tópico de trigger diferente do tópico do cliente |
| TEST-ISOLATION | BLOCKED | Laboratório sem produto completo, sem buckets e sem projeto Full-Product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais ausentes; produção main em MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Rate limit de setup-invite ausente em produção; existe apenas no laboratório/candidata |
| ACL-STORAGE | BLOCKED | Grants amplos, default ACLs de cliente, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | Issue #78 continua 0/8; sem confirmação física sem F5 |
| HUMAN-REVIEW | PENDING | Zero reviews; nenhuma autorização explícita de Ricardo |

## 12. Veredito e próximos passos

**NOT READY.** Ordem recomendada:
1. Corrigir a divergência `build.mjs` / `release.json.scriptUrl` no master, preservando o contrato de API e o endpoint de atualização.
2. Planejar o cutover Normal para `upstatus` com version bump, migration de rate limit e rollback revisados; não publicar o handler isoladamente.
3. Corrigir o workflow Team Lite para usar o manifesto Team Lite e o slug `upstatus-team-lite`.
4. Restringir o workflow TEST a um projeto TEST explicitamente permitido e fixar a versão da CLI.
5. Migrar Realtime para tópico privado/autorizado e alinhar os tópicos de triggers e clientes.
6. Integrar AUTH-03 nos dois runtimes e corrigir chat-clear para exigir identidade e papel persistido.
7. Revisar grants/default ACLs, SECURITY DEFINER, Storage e validação de bytes de anexos.
8. Recuperar os quatro SQLs originais, reconciliar o ledger e resolver MIGRATIONS_FAILED.
9. Provisionar Full-Product TEST e executar os testes físicos de rede, microfone, tela e interoperabilidade Normal/Team Lite.
10. Obter review humana e autorização explícita antes de qualquer release.

**Integridade desta execução:** nenhuma alteração em produção. Nenhum merge, deploy, migration, release, publicação de userscript, secret, flag ou permissão foi executado. A única escrita no repositório é este relatório novo na branch QA.
