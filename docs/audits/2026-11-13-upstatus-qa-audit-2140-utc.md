# Auditoria independente UpStatus — 2026-11-13 21:40 UTC

## Escopo e método

Repositório `Reekyi/UpStatus`; projetos Supabase de produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.

Leitura integral de `docs/RELEASE_READINESS.md` na branch QA: 1.045.105 bytes, 8.410 linhas, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint dentro desse arquivo continua em **2026-11-08 18:30 UTC**. O arquivo foi preservado; esta auditoria é um documento novo.

Classificação: **CI** = workflow existente no SHA informado; **inspeção de código/catálogo** = leitura estática ou SELECT; **manual pending** = navegador/dispositivo humano; **blocked** = dependência ou lacuna confirmada. Nenhum workflow foi iniciado ou repetido pela QA; somente execuções existentes foram lidas.

## Refs e governança

| Ref | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA | `4e404dad9330225801c8413d2254d34789ac7d89` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 | `4e404dad9330225801c8413d2254d34789ac7d89` |
| PR #161 | `557814dc31bed779b84a2094358dc6b2a7e67689` |
| PR #163 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` |
| PR #164 | `f98cd24b3110152dff667d0cc1d88ffb22fe86ff` |

QA está **289 commits à frente e 1 atrás** de master; continua Draft pela PR #82. #74 está 887 à frente e 1 atrás de master. #76 está 386 à frente e 0 atrás de team-lite-official. #75 é a baseline anterior, não substitui #76.

As branches master, develop, team-lite-official e QA retornaram `protected=false`, sem required status checks. PRs #74, #75, #76, #82, #161, #163 e #164 permanecem abertas/Draft e não mescladas. Reviews retornaram vazias em #74, #75, #76, #82, #161, #163 e #164.

## CI observado

| PR / linha | Evidência | Resultado e limite |
|---|---|---|
| #74 Normal, HEAD `dcaf6a0` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | Ambos SUCCESS no HEAD da PR. |
| #75 Team Lite baseline, HEAD `7bbf9b9` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS histórico no HEAD atual; a linha ativa de sinalização é #76. |
| #76 Team Lite, HEAD `83a6cc4` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | SUCCESS; log confirma 110/110 checks autenticados, negociação WebRTC de chamada/voz/tela com faixas remotas, mesh de três membros, teardown, 90 aceitações + 1 HTTP 429 com Retry-After, rate limit de sinalização e convites, consumo atômico de convite e cleanup das fixtures. |
| #82 QA, HEAD `4e404da` | [Validate 43504001763](https://github.com/Reekyi/UpStatus/actions/runs/43504001763) | FAILURE em `production updateURL mismatch`. O job falhou em Validate após construir 3.4.7 / TEST 3.4.7. |
| #161 Normal, HEAD `557814d` | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | Ambos SUCCESS no mesmo SHA; Smoke reporta 136/136 checks autenticados. |
| #163 voz, HEAD `00f357b` | [Validate 43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143), [Voice Contract 43488822237](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) | Ambos SUCCESS. O contrato 409 é offline; não houve chamada HTTP real à Edge Function. |
| #164 upload, HEAD `f98cd24` | [Validate 43507271578](https://github.com/Reekyi/UpStatus/actions/runs/43507271578) | SUCCESS no merge ref `8a762b3` (head #164 + base develop). Log: build 3.0.40 / TEST 3.0.40-beta.22, testes de cliente e servidor com mocks/VM e Validation OK. Não é upload real no Storage. |

## Achado principal — PR #164 não impõe o limite de bytes reais

A #164 está baseada em **develop**, não em #74/#76 nem nas branches oficiais. Ela melhora a paridade de upload assinado e testa o limite declarado de avatar em 2 MiB.

Inspeção do código candidato:

- `signedUploadRoute` escolhe 2 MiB para avatar e 20 MiB para chat, mas valida `p.size` e `p.mime`, valores declarados pelo cliente.
- Gera `createSignedUploadUrl(path,{upsert:true})` e devolve token/URL com `expiresIn:7200`.
- O navegador faz PUT direto ao Storage com `Content-Type` derivado do arquivo e `body:file`; o Edge Function não recebe nem inspeciona os bytes enviados.
- Os testes de cliente/servidor usam VM, mocks de `fetch` e mocks de Storage. Validam formato, metadados, caminho, token, origem e rejeição de tamanho declarado, mas não fazem upload real nem verificam magic bytes.
- `profileRoute` valida origem, bucket `profile-images` e caminho simples, mas não vincula o objeto ao usuário autenticado por `users.id`. O caminho aleatório não contém identidade imutável; o perfil continua gravado por `user_name`.

**Conclusão:** o check de 2 MiB é um limite sobre metadado, não sobre o objeto efetivamente armazenado. A URL assinada não recebe um limite de tamanho no código observado. Em produção, o bucket `profile-images` aceita até 20 MiB; assim, um cliente que declarar tamanho menor pode potencialmente enviar um objeto maior até o limite do bucket. Este é um caminho de bypass plausível confirmado por inspeção de arquitetura, **não explorado nem reproduzido** nesta auditoria. MIME também é declarado pelo cliente e não há inspeção de assinatura do conteúdo.

Recomendação: upload para bucket privado/quarentena, inspeção server-side dos bytes reais (assinatura, MIME e tamanho), finalização autenticada e publicação somente após validação; prefixo/ownership derivado de `users.id`; evitar `upsert:true` e revisar TTL/replay do token. Portar a correção para as linhas Normal e Team Lite somente após fechar esses contratos e testar contra um projeto de Storage isolado.

## Produção instalada — Edge Functions e autenticação

Inventário read-only:

- Produção: `upstatus` v480 (SHA `bb2713ce…`), `upstatus-team-lite` v15 (SHA `2c13414a…`), `upstatus-test` v281 e `upstatus-screen-share-3-1-1-beta10` v6.
- Laboratório: `upstatus-signal-test` v32 (SHA `f893360a…`) e `upstatus-signal-e2e-once` v3.
- Não existe `upstatus-signal` em produção. Há somente dois projetos Supabase; o laboratório não tem buckets de chat/perfil e não é Full-Product TEST.
- As 38 Edge Functions listadas em produção reportam `verify_jwt=false`. Os handlers core usam sessão própria via `x-upstatus-token`; isso não equivale a JWT do Supabase e exige revisão de autenticação rota a rota.

Inspeção das funções instaladas Normal/Team Lite:

- `POST /api/setup` chama o fluxo de setup sem exigir `setupToken` ou convite.
- Quando a role está vazia, o fallback atribui `implementation_admin` a Ricardo, Lohan e Guilherme por nome.
- Não foi encontrado rate limit de tentativas de login nos handlers. O rate limit candidato de setup-invite não protege o endpoint de senha.
- Normal exige 6 caracteres no login; Team Lite exige 4.
- Sessões e perfis usam `user_name`; `upstatus_sessions` e `upstatus_profiles` não possuem `user_id`.
- Produção tem 5 usuários, zero password_hash vazios, zero roles vazias e nenhum nome duplicado atualmente. Isso não remove o risco estrutural: `users.name` não é chave imutável nem tem constraint UNIQUE.

Os handlers de upload instalados em Normal e Team Lite ainda usam limite de **20 MiB para avatar e chat**. A regra de 2 MiB da #164 não está nos runtimes instalados.

## Supabase — snapshot read-only

### Realtime

- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; anon e authenticated têm SELECT/INSERT/UPDATE efetivos.
- 106 registros nos últimos 14 dias, todos `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- O transporte privado/autorizado ainda não está ativo nos bundles instalados. Não foi feita exploração nem publicação de mensagens de teste.

### RLS, grants, SECURITY DEFINER e Storage

Produção:

- 10 tabelas em `public` com RLS e zero policies; 9 delas concedem a anon/authenticated SELECT, INSERT, UPDATE e TRUNCATE efetivos. RLS não protege TRUNCATE.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, com `search_path=public` e ACL contendo PUBLIC, anon, authenticated e service_role. O Security Advisor reporta 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. As funções são trigger-returning; não foi demonstrada chamada RPC direta nesta auditoria.
- Default ACLs continuam amplas para anon/authenticated em public (postgres e supabase_admin), storage e schemas GraphQL.
- `chat-images`: público, 20 MiB, 168 objetos. `profile-images`: público, 20 MiB, 20 objetos. Zero policies em `storage.objects`.

Laboratório:

- 18 tabelas public com RLS e zero policies; nenhuma concede SELECT/INSERT direto a anon/authenticated.
- As três funções broadcast SECURITY DEFINER usam `search_path=""` e ACL limitada a postgres/service_role.
- Zero buckets Storage. Security Advisor: 18 INFO de RLS sem policy e nenhum WARN.

### Migrations

- Ledger de produção: 7 migrations.
- Ledger do laboratório: 39 migrations.
- `master/supabase/migrations`: somente 3 SQLs canônicos. Quatro versões do ledger de produção não têm arquivo canônico correspondente em master; proveniência continua pendente.
- Nenhuma migration foi aplicada nesta auditoria.

Uma consulta SELECT inicial usou por engano a coluna `password`, inexistente; falhou sem mutação. A consulta corrigida usou `password_hash` e confirmou os cinco usuários sem hashes/roles vazios.

## Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos. Últimos comentários de aceitação são de 08/11; não há confirmação nova de reconexão física sem F5.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, corpo mantém 16/35 itens marcados. O comentário dedicado QA foi atualizado no lugar; o comentário da Engenharia foi preservado.
- Nenhum teste manual Tampermonkey, microfone/dispositivo real, captura de tela real, queda de rede ou interoperabilidade instalada foi executado.

## Bloqueadores e próximos passos

1. Fechar validação de bytes reais, limite efetivo de Storage, ownership de avatar por `users.id`, TTL e overwrite na #164.
2. Portar upload validado para Normal e Team Lite, sem presumir que a branch develop altera os produtos.
3. Implementar rate limit de login, convite de primeiro acesso e identidade por `users.id`; remover fallback administrativo por nome.
4. Migrar Realtime para transporte privado/autorizado e reduzir payloads públicos.
5. Corrigir grants, Default ACL, SECURITY DEFINER e Storage com plano revisado.
6. Recuperar os quatro SQLs históricos ou registrar exceção formal de proveniência.
7. Corrigir o Validate herdado da #82 sem remover assertions; preservar checks no SHA exato.
8. Provisionar Full-Product TEST somente após cotação e autorização explícitas.
9. Executar os oito testes físicos da #78 e obter review humana/autorizaçao de release.

**Veredito: NOT READY.**

Nenhuma escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva ocorreu. Todas as consultas SQL bem-sucedidas foram SELECT-only. Nenhum workflow foi iniciado ou repetido pela QA. A única escrita desta auditoria é este novo documento na branch QA dedicada.
