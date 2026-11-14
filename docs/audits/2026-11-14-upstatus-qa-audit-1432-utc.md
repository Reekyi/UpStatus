# Auditoria independente de QA do UpStatus — 14/11/2026 14:33 UTC

## Veredito

**NOT READY — não liberar.** A revalidação confirma que os candidatos Normal/Team Lite têm CI relevante, mas a produção continua com Realtime público, grants/ACLs excessivos, Storage público, autenticação de primeiro acesso legada e ausência de Full-Product TEST. A validação da QA falha no HEAD atual; a falha do updater está no builder, não no header atualmente servido pelo Normal.

## Método e limites

- GitHub: leitura de refs, PRs, diffs, workflows, runs, reviews e arquivos.
- Supabase: Management API, fontes de Edge Functions, migrations, Advisors e SQL somente SELECT/catálogo.
- Nenhum teste manual, exploração de Realtime, script de fixture ou workflow foi iniciado pela QA.
- Sem checkout Git local; o relatório foi criado como arquivo novo pela Contents API na branch QA, sem substituir arquivo existente.
- Nenhuma produção foi alterada.

## Heads e PRs

| Referência | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA / #82 | `bdb9be28b0ed0b2b364993bb2a489e0ce49b5dc7` |

QA está 309 commits à frente e 1 atrás de master. O diff da #82 contém 162 arquivos, todos documentais. master, team-lite-official e QA estão sem proteção de branch.

| PR | HEAD conhecido | Estado | CI |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | Open / Draft | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) PASS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Open / Draft | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `bdb9be28b0ed0b2b364993bb2a489e0ce49b5dc7` | Open / Draft | Validate [43601366792](https://github.com/Reekyi/UpStatus/actions/runs/43601366792) FAIL |

Não encontrei reviews humanas nas quatro PRs obrigatórias.

PR #74 altera 90 arquivos (83 fora de docs) e seu branch está 887 commits à frente / 1 atrás de master. PR #76 altera 57 arquivos e seu branch de candidato está 386 commits à frente de team-lite-official. Exigem revisão explícita de ancestry/merge-base; CI verde não substitui isso.

### Candidatos adicionais

- #89 AUTH-03: guard de cutover PASS [42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509), mas produção não recebeu migrations.
- #133 Normal: validação e Smoke PASS [42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) / [42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887).
- #149 Team Lite: source guard e Candidate Checks PASS [43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) / [43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232).
- #157 Team Lite avatar: PASS [43333849082](https://github.com/Reekyi/UpStatus/actions/runs/43333849082).
- #164 avatar Normal: Validate PASS [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609); testes de Storage usam mocks.
- #158 separação de updater/API: Validate FAIL [43363857861](https://github.com/Reekyi/UpStatus/actions/runs/43363857861), com regressão de anexos do chat: os arquivos ficam staged em vez de serem enviados imediatamente.

Candidatos continuam isolados; não são evidência de código integrado ou implantado.

## Correção importante: updateURL Normal

O userscript realmente servido por `upstatus` v480 está na versão 3.4.7 e seu header contém:

`@updateURL .../functions/v1/upstatus/upstatus.user.js`

A URL de API embutida no cliente continua sendo beta10. Portanto, o header instalado está correto.

A falha de CI é no builder de master:
- `scripts/build.mjs:42-43` define `cloud` como endpoint beta10 e deriva `updateUrl=cloud+"/upstatus.user.js"`.
- `scripts/validate.mjs:26` exige `/upstatus/upstatus.user.js`.
- `release.json` já declara `scriptUrl` com o endpoint estável `/upstatus/upstatus.user.js`.

A #158 tenta separar a URL de atualização da URL da API, mas seu Validate falha na regressão de upload imediato do chat. Não enfraquecer o teste; reconciliar o fluxo e validar no SHA exato.

## Runtimes Edge Function e compatibilidade

Fontes implantadas decodificadas:

| Função | Versão | Userscript/API |
|---|---:|---|
| `upstatus` | v480 | Normal 3.4.7; distribuição/updateURL estável; API cliente ainda beta10 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | API legada; bundle interno beta8 |
| `upstatus-team-lite` | v15 | Team Lite 3.4.30 |
| `upstatus-test` | v281 | TEST dentro do projeto de produção |

Todos os 38 Edge Functions de produção reportam `verify_jwt=false`; o laboratório tem duas funções: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não existe endpoint server-mediated `upstatus-signal` em produção. `verify_jwt=false` não prova, sozinho, ausência de autenticação: os handlers principais validam sessão própria via `x-upstatus-token`; cada rota ainda precisa de revisão individual.

Team Lite instalado anuncia updateURL para o arquivo raw da branch `team-lite-official`, não para um artefato de release imutável.

## Realtime — bloqueador de segurança

Os bundles efetivamente implantados mostram:
- Normal e Team Lite criam `channel(UP_REALTIME_TOPIC)` com publishable key, sem `private:true` e sem `realtime.setAuth()`.
- Ambos assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Normal processa `remote_command` e chama `executeRemoteCommand` sem autenticar o emissor nem exigir sessão local no listener.
- Team Lite exige sessão local atual, mas não prova a identidade do publicador.
- `executeRemoteCommand` pode executar `syncSaleSmartly(c.status)`, registrar o resultado com a sessão local e recarregar a página.
- `call_signal`, voz e screen-share também recebem payloads sem prova criptográfica de origem/membership.

Os três triggers PostgreSQL publicam em outro tópico, `upstatus-live-6f5e7b31-...`, com `private=false`:
- `upstatus_broadcast_messages` publica `to_jsonb(OLD/NEW)` completo.
- `upstatus_broadcast_remote_state` publica comandos/resultados.
- `upstatus_broadcast_users` publica status/metadados.

O tópico do banco não coincide com o tópico dos clientes; eventos observados no tópico dos triggers não comprovam entrega aos clientes. A configuração Dashboard de acesso público não foi consultada e não houve exploração externa. O risco é um caminho de confiança não autenticada confirmado estaticamente, não uma exploração reproduzida.

Os candidatos #74/#76 deixam transporte autenticado opt-in/desligado por padrão; sem cutover coordenado, o transporte legado permanece ativo. #133/#149 melhoram a proveniência do evento no cliente, mas ainda não estão integradas nem implantadas.

## PostgreSQL, RLS, grants e SECURITY DEFINER

Consulta SELECT-only atual:
- 10 tabelas public com RLS e sem policies.
- 126 linhas de grants diretos para anon/authenticated em 9 tabelas; 18 grants TRUNCATE. RLS não protege TRUNCATE.
- 24 registros em `pg_default_acl`, contendo 75 entradas ACL (corrige a contagem anterior de 120 entradas).
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; anon/authenticated têm SELECT e INSERT efetivos.
- Três funções SECURITY DEFINER de broadcast, retorno `trigger`, `search_path=public` e EXECUTE amplo para anon/authenticated. O Advisor alerta; invocação direta via PostgREST não foi demonstrada para funções que retornam trigger.

Security Advisor:
- Produção: 6 WARN (3 funções × anon/authenticated) e 10 INFO de RLS sem policy.
- Laboratório: 18 INFO de RLS sem policy, sem WARN reportado.

## Storage e upload

Produção:
- `chat-images`: público, 20 MiB, 168 objetos.
- `profile-images`: público, 20 MiB, 20 objetos.
- Zero policies próprias em `storage.objects`.

Os runtimes beta10 e Team Lite aceitam `avatarUrl` sob o prefixo público do bucket e atualizam perfil por `user_name`, sem verificar ownership do objeto por `users.id`. O caminho de upload assinado valida MIME/tamanho declarados e gera signed URL com `upsert:true`; os bytes finais não são inspecionados pelo servidor nesse caminho. O cliente tem validação local, que não é fronteira de segurança.

O handler de upload via dataUrl faz sniff de bytes, mas o cliente instalado usa o fluxo signed-upload. O caminho mais rígido da função de distribuição Normal não deve ser confundido com o endpoint beta10 efetivamente chamado pelo cliente.

## AUTH-03, migrations e isolamento

Produção tem 5 usuários, 319 sessões e 5 perfis. `users.id` existe, mas `upstatus_sessions` e `upstatus_profiles` só guardam `user_name`; não há `user_id`, colunas `setup_token_*`, tabela de convite ou RPC de consumo de convite. O primeiro setup legado permanece no runtime. #89 passa no guard candidato, mas não aplica nada à produção.

Migrations: produção 7; laboratório 39. PR #135 arquiva quatro statements em `docs/migration-recovery/`, não no diretório executável `supabase/migrations/`; proveniência original/histórico Git continua incompleto. Branch Supabase `main` está `MIGRATIONS_FAILED`, com preview `ACTIVE_HEALTHY`.

Só existem produção e laboratório parcial. O laboratório não é Full-Product TEST: zero usuários, sessões, perfis, salas, memberships, eventos, buckets e objetos. `upstatus-test` v281 está dentro do projeto de produção.

## Issues e testes manuais

- [#78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios físicos; última atualização 08/11. Sem evidência nova de reconexão instalada sem F5, microfone/display reais ou interoperabilidade Normal ↔ Team Lite.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, corpo 16/35 marcados e 19 pendentes.
- Nenhum teste manual foi realizado nesta execução. CI de Playwright/Chromium e API isolada não equivale a Tampermonkey instalado com permissões reais.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime público, sem autenticação do canal/emissor e sem endpoint server-mediated em produção |
| TEST-ISOLATION | blocked | Laboratório parcial, sem Storage/fixtures de produto |
| MIGRATION-PROVENANCE | in_progress | Statements arquivados, fontes/proveniência originais ainda não restauradas |
| AUTH-03 | blocked | Produção sem setup-invite e sem user_id em sessão/perfil |
| ACL-STORAGE | blocked | Grants/Default ACL amplos e buckets públicos sem policies |
| RECONNECT | pending | 0/8 testes físicos; depende de navegador real |
| HUMAN-REVIEW | pending | PRs obrigatórias sem reviews humanas |

## Ações necessárias

1. Corrigir o transporte Realtime no servidor e remover o fallback público sensível, com validação de token, sala, membership, destinatário, expiração, replay e rate limit.
2. Corrigir o builder separando URL de updater e URL de API; reconciliar #158 sem quebrar upload imediato do chat.
3. Corrigir o workflow oficial Team Lite: hoje executa `supabase functions deploy upstatus`, usa CLI latest e secret de projeto genérico; não despachar.
4. Integrar e revalidar #133/#149/#157/#164 nas linhas oficiais.
5. Completar AUTH-03 e revisar rotas com `verify_jwt=false`.
6. Endurecer grants/Default ACL e decidir Storage privado; validar upload/download real.
7. Recuperar proveniência das migrations, diagnosticar `MIGRATIONS_FAILED` e provisionar Full-Product TEST após autorização de custo.
8. Executar os oito testes físicos da #78 e obter reviews humanas.

## Segurança da execução

Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs, exploração de Realtime, teste físico ou operação destrutiva. A única escrita foi este novo relatório documental na branch QA.
