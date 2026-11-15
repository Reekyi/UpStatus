# UpStatus — Auditoria independente QA
**Data:** 2026-11-15 08:30 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Veredito:** **NOT READY**

## Escopo e método

Revalidei a versão de `docs/RELEASE_READINESS.md` na branch QA indicada, os heads reais, PRs #74/#75/#76/#82, Issues #78/#79, workflows, checks, runtimes implantados e catálogos dos projetos Supabase de produção e laboratório.

Classificação usada:
- **CI PASS/FAIL:** resultado de workflow associado ao SHA exato indicado.
- **CODE INSPECTION:** leitura estática de workflow, código implantado ou catálogo.
- **MANUAL PENDING:** exige navegador/dispositivo real ou aceite humano.
- **BLOCKED:** dependência ou condição de release não resolvida.
- **NOT VERIFIED:** não há evidência suficiente.

Não há checkout Git local nesta execução (`/workspace`, `/workspaces`, `/repo` e `/app` ausentes). Portanto, não executei testes locais, não fiz build, não usei navegador/Tampermonkey e não alego correção de produto. As consultas Supabase foram SELECT/catálogo somente.

## 1. Documento de prontidão e refs reais

A versão de `docs/RELEASE_READINESS.md` foi lida na branch QA. O arquivo tem aproximadamente 1,046,356 caracteres e 8,423 linhas, começa com a data-base 2026-11-04 e contém snapshots históricos. A última seção de auditoria visível no arquivo é 2026-11-15 06:30 UTC; há um relatório separado de 07:43 UTC. Para evitar substituir um documento grande e alterações concorrentes, esta rodada foi registrada em arquivo novo.

| Ref | HEAD | Proteção |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | `protected=false` |
| `develop` | `6b33e1e...` | `protected=false` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | `protected=false` |
| `qa/release-readiness-2026-11-04-master` | `17dccbf40272fefc9047ac9bc1b3b188cdf351d2` | `protected=false` |
| `qa/release-readiness-2026-11-04` | `8f8b5fb3f01750907fb3e78f425ace4ffb45afab` | `protected=false` |

Nenhum repository ruleset foi retornado. Existem duas branches QA com nomes semelhantes; esta auditoria usa somente `qa/release-readiness-2026-11-04-master`.

Comparação QA → master: 332 commits à frente e 1 atrás. As 180 alterações listadas são Markdown; não há arquivos de runtime entre elas.

## 2. PRs prioritárias e CI

| PR | HEAD | Relação com base | Evidência exata | Classificação |
|---|---|---:|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 à frente / 1 atrás de master | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | **CI PASS** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 à frente / 0 atrás de team-lite-official | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico** |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | 386 à frente / 0 atrás de team-lite-official | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | **CI PASS** |
| #82 QA | `17dccbf40272fefc9047ac9bc1b3b188cdf351d2` | 332 à frente / 1 atrás de master | [Validate 43691310973](https://github.com/Reekyi/UpStatus/actions/runs/43691310973) | **CI FAIL** |

Detalhes:
- #74: Validate e Smoke concluíram com sucesso no HEAD consultado. O Smoke cobre WebRTC/voz/tela, mesh de três participantes, teardown e rate limits. A etapa de rate limit de emissão de convites foi ignorada; não classificá-la como aprovada.
- #76: Candidate Checks passou no HEAD consultado. Inclui Chromium com IIFE completo/stubs Tampermonkey, transporte autenticado candidato, recuperação de voz/tela, rate limits e setup invites.
- #75 é ancestral histórico de #76; não contar os dois como entregas independentes nem integrar ambos separadamente.
- #82 falhou em `scripts/validate.mjs:26`: `production updateURL mismatch`. O PR é documental: a comparação QA/master mostra somente arquivos Markdown. O workflow de Validate ignora alterações em docs; o novo commit documental não demonstra validação de runtime.
- As quatro PRs prioritárias não possuem review humana submetida. CI não equivale a aprovação.

## 3. Candidatas complementares relevantes

- [#129 — desativar dispatcher legado Team Lite](https://github.com/Reekyi/UpStatus/pull/129): Draft. O workflow candidato remove secrets, CLI e comando de deploy do workflow legado, substituindo-o por guard fail-closed. O guard offline no HEAD `f48a2d9` passou em [42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545). Sem review humana.
- [#125 — dispatcher Team Lite no master](https://github.com/Reekyi/UpStatus/pull/125): Draft. Guard offline [42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306) passou e o job de deploy foi **SKIPPED**; Validate geral [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) falhou pelo contrato de updateURL herdado do master. O dispatcher exige SHA atual, PR mesclada/aprovada por outra pessoa, checks completos, versão exata e confirmação explícita. Não despachar.
- [#127 — proveniência de migrations](https://github.com/Reekyi/UpStatus/pull/127): Draft. Checks offline de proveniência [42615124790](https://github.com/Reekyi/UpStatus/actions/runs/42615124790) e [42615130073](https://github.com/Reekyi/UpStatus/actions/runs/42615130073) passaram. A própria PR preserva o bloqueio dos quatro SQLs originais ausentes.
- #129, #125 e #127 não têm review humana submetida.

## 4. Workflows e cadeia de publicação

**CODE INSPECTION:** o workflow oficial Team Lite em `team-lite-official` ainda usa `supabase functions deploy upstatus`, que é o slug Normal, não `upstatus-team-lite`. Também usa CLI `latest` e não prova de forma consistente projeto/SHA/manifesto Team Lite. O manifesto raiz e o manifesto Team Lite têm versões distintas (3.4.7 e 3.4.30).

A #129 é uma contenção candidata que desabilita o caminho legado. A #125 é um dispatcher candidato mais seguro, mas continua Draft, sem aprovação e com Validate geral falhando. Não executei workflow_dispatch nem deploy.

O Normal também exige corte coordenado: o userscript distribuído por `upstatus` ainda aponta a API para o runtime legado beta10. Publicar somente `upstatus` não atualiza automaticamente `upstatus-screen-share-3-1-1-beta10`.

## 5. Supabase: projetos, funções e migrations

Projetos encontrados na organização:
- Produção `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003.
- Não há terceiro projeto Full-Product TEST.
- Branch gerenciada `main` de produção: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

Produção tem 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false` no gateway. Isso não prova, isoladamente, ausência de autenticação: os handlers principais usam token de sessão próprio. O inventário contém dois runtimes centrais e 36 nomes históricos de test/beta/backup. `upstatus-test` v281 continua ACTIVE em produção.

Laboratório tem duas funções de teste e 39 migrations, mas zero usuários, sessões, mensagens, perfis, buckets e objetos de produto. Não é Full-Product TEST.

Produção tem 7 migrations no ledger. Quatro arquivos SQL já aplicados continuam ausentes em `master`, na branch QA e no candidato Normal consultado (404 nos quatro caminhos):
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruir esses arquivos a partir do schema atual. #127 mantém o preflight bloqueado até recuperar as fontes originais e sua proveniência.

## 6. Disponibilidade: HTTP 402

Janela consultada: 2026-11-14 08:25:15 UTC a 2026-11-15 08:25:15 UTC.

Produção: **94 respostas HTTP 402** (88 em `function_edge_logs`, 6 no gateway Realtime):
- Normal userscript: 21 GET + 1 HEAD.
- Team Lite userscript: 24 GET + 1 HEAD.
- API beta10 chat: 21.
- API beta10 remote-status: 10.
- API beta10 status: 10.
- WebSocket Realtime: 6.

Última ocorrência observada: 2026-11-14 20:57:39 UTC.

Laboratório: **19 respostas HTTP 402** em `upstatus-signal-test`, concentradas em 2026-11-14 17:10:45 UTC.

Os logs provam os códigos e as rotas, mas não identificam a causa financeira/operacional nem comprovam recuperação. Ausência de novos 402 depois do último evento não é prova de recuperação sem tráfego bem-sucedido. Investigar Usage/Billing e saúde do projeto antes de iniciar novos Smokes.

## 7. Realtime, RLS, grants e SECURITY DEFINER

### Realtime

Produção: 106 registros observados em `realtime.messages`, todos `private=false`, no tópico `upstatus-live-6f5e7b31-...`:
- 72 `user_status`
- 26 `db_change`
- 4 `remote_command`
- 4 `remote_result`

A função implantada `upstatus_broadcast_messages()` usa `to_jsonb(OLD/NEW)` e transmite a linha completa por `realtime.send(..., false)`. As funções de remote-state e users também publicam em canal público. Os clientes Normal/Team Lite não usam `private:true` nem `realtime.setAuth()`; os tópicos do trigger e dos clientes também divergem.

Laboratório: os três triggers enviam somente `{op: TG_OP}`, têm `search_path` vazio e EXECUTE restrito a service_role. Porém continuam com `private=false`; RT-01 não está concluído.

### RLS e grants

Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas backend-owned com privilégios efetivos amplos para anon e authenticated, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE.
- 18 privilégios TRUNCATE efetivos somados entre os dois papéis.
- `realtime.messages`: RLS true, zero policies, SELECT/INSERT efetivos para anon/authenticated.

As três funções de broadcast são SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated/service_role. Não foi demonstrada invocação direta das funções trigger-only; os grants de cliente continuam desnecessários, e o payload público de mensagens é o risco concreto.

Laboratório: tabelas públicas consultadas sem grants efetivos diretos para anon/authenticated. Ainda há Default ACL de Storage para papéis de cliente e permissões de Realtime; as policies de `storage.objects` e `realtime.messages` são zero.

### Storage

Produção:
- `chat-images`: público, 168 objetos, limite 20 MiB.
- `profile-images`: público, 20 objetos, limite 20 MiB.
- Zero policies próprias em `storage.objects`.

O fluxo `signedUploadRoute` valida MIME/tamanho declarados pelo cliente, mas não inspeciona os bytes antes de emitir a URL assinada. `sniffMime()` retorna o MIME declarado quando não reconhece a assinatura. **CODE INSPECTION**, não exploit reproduzido.

## 8. AUTH-03 e compatibilidade Normal/Team Lite

Snapshot de produção:
- 5 usuários da aplicação; 0 sem senha; 0 sem papel.
- 0 registros em `auth.users`.
- 319 sessões, 302 mensagens, 6 chat reads.
- Zero colunas `setup_token_*`, zero RPC/tabela de convite e rate limit de setup/sinalização consultados.

Código implantado:
- Normal exige senha mínima de 6 caracteres; Team Lite exige 4.
- `GET /api/account?name=` revela `needsSetup` sem autenticação.
- `POST /api/setup` chama `login(req,true)` sem convite único.
- Primeiro setup pode atribuir papel administrativo por fallback nominal.
- `POST /api/chat/clear` verifica somente o nome Ricardo, sem papel administrativo persistido.
- Upload assinado usa MIME e tamanho informados pelo cliente.

Os cinco usuários atuais estão configurados; isso não elimina o risco do fluxo de onboarding futuro. AUTH-03 permanece BLOCKED.

## 9. Aceitação manual

- Issue #78: **0/8** critérios marcados. Reconexão Normal/Team Lite sem F5, reentrada em sala, nova chamada, áudio real, captura real de tela e interoperabilidade instalada continuam MANUAL PENDING.
- Issue #79: checklist histórico **16/35**.
- Não havia checkout local nem navegador Tampermonkey nesta execução. Nenhum teste manual foi realizado; nenhum Smoke foi iniciado por causa da indisponibilidade observada.

## 10. Gates e recomendação

| Gate | Estado QA | Evidência |
|---|---|---|
| RT-01 | **blocked** | [Security Advisor](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm/advisors/security) |
| TEST-ISOLATION | **blocked** | [Laboratório](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb) e logs HTTP 402 |
| MIGRATION-PROVENANCE | **blocked** | [#127](https://github.com/Reekyi/UpStatus/pull/127) e quatro caminhos 404 em master |
| AUTH-03 | **blocked** | [Functions produção](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm/functions) |
| ACL-STORAGE | **blocked** | [Security Advisor](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm/advisors/security) e [Storage](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm/storage/buckets) |
| RECONNECT | **pending** | [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) |
| HUMAN-REVIEW | **pending** | PRs [#74](https://github.com/Reekyi/UpStatus/pull/74), [#76](https://github.com/Reekyi/UpStatus/pull/76), [#129](https://github.com/Reekyi/UpStatus/pull/129) e [#125](https://github.com/Reekyi/UpStatus/pull/125) sem review submetida |

**Recomendação: NOT READY.** Prioridade imediata: (1) investigar 402 e comprovar recuperação; (2) manter desabilitado o dispatcher legado Team Lite e corrigir o corte de publicação; (3) tornar Realtime privado/autorizado e remover payloads completos; (4) corrigir AUTH-03 e hardening de grants/Storage; (5) recuperar SQLs originais e criar Full-Product TEST; (6) executar aceitação física e obter aprovação humana.

Nenhuma escrita Supabase, migration, deploy, merge, release, alteração de secrets/flags/permissões ou publicação de userscript foi realizada. O único artefato novo desta execução é este relatório documental na branch QA dedicada.
