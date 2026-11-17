# UpStatus — auditoria independente QA
**Data:** 2026-11-11 22:35 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## 1. Escopo e método

Leitura integral de `docs/RELEASE_READINESS.md` na branch QA: 8.410 linhas, blob `7cfbd70886df42ce790c078c224b19284a632595`. Foram conferidos heads, PRs, commits, workflows e jobs, reviews, código das candidatas, bundles efetivamente implantados, catálogo PostgreSQL, migrations, Edge Functions e Security Advisor.

As consultas SQL foram somente SELECT. Os workflows citados são execuções já existentes; nenhum rerun foi iniciado. Não houve teste local, teste manual em navegador ou teste físico de reconexão nesta rodada. A inspeção de código não foi tratada como exploração reproduzida.

## 2. Heads e governança

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `b6e381e9cbd9d94f4c8ebcb1ff4233f8a31885b6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

A QA está **231 commits à frente e 1 atrás** de master; não foi feito rebase.

PRs abertas, Draft e não merged no snapshot:

| PR | HEAD | Base | Observação |
|---|---|---|---|
| #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | master | Normal / continuidade |
| #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | baseline Team Lite |
| #76 | `4edfbf25476c7c751741b2e14c2c88fdc554f618` | team-lite-official | signaling Team Lite |
| #82 | `b6e381e9cbd9d94f4c8ebcb1ff4233f8a31885b6` | master | documentação QA |
| #131 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | #74 | AUTH-03 Normal |
| #141 | `4dba48196a1a605557ac7a853f6ae4adff0ea555` | master | updater e anexos |
| #142 | `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4` | #141 | API beta10 |
| #143 | `c4a04fa755b877bc76b1372170a26e7b974264e6` | #142 | dispatcher Normal |
| #145 | `bbfda9dfe53f25535c697586fce63917ee674e1f` | #142 | hints de comandos |
| #146 | `71c5ce2f730ade8ee3e8b090498202933809ce5c` | #142 | hints + recuperação após SUBSCRIBED |

A API de branches retornou `protected=false` para master, QA e team-lite-official; a API de rulesets retornou lista vazia. O endpoint detalhado de branch protection retornou 403 para a integração, portanto não foi possível ler os campos internos de required checks. As dez PRs consultadas (#74, #75, #76, #82, #131, #141, #142, #143, #145 e #146) têm zero reviews registrados no endpoint de reviews.

## 3. CI: resultado por HEAD

| PR / HEAD | Workflow existente | Resultado |
|---|---|---|
| #74 | [Signaling Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | SUCCESS |
| #74 | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) | SUCCESS |
| #75 | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS histórico |
| #76 | [Candidate Checks 42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) | SUCCESS |
| #82 | [Validate 43104949494](https://github.com/Reekyi/UpStatus/actions/runs/43104949494) | **FAIL** |
| #131 | [Signaling Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | SUCCESS; 136/136 informado no relatório do candidato |
| #141 | [Validate 43085700956](https://github.com/Reekyi/UpStatus/actions/runs/43085700956) | SUCCESS |
| #142 | [API Candidate Validate 43085494740](https://github.com/Reekyi/UpStatus/actions/runs/43085494740) | SUCCESS |
| #143 | [Dispatcher Guard 43093394788](https://github.com/Reekyi/UpStatus/actions/runs/43093394788) | SUCCESS em **push**; deploy **SKIPPED** |
| #143 | [API Candidate Validate 43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347) | SUCCESS em pull_request |
| #145 | [API Candidate Validate 43100913884](https://github.com/Reekyi/UpStatus/actions/runs/43100913884) | SUCCESS |
| #146 | [API Candidate Validate 43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) | SUCCESS no HEAD exato, evento pull_request |

A #82 falhou no step `Validate build`. A causa é reproduzível pela inspeção estática: `release.json` declara `scriptUrl` em `/functions/v1/upstatus/upstatus.user.js`, e `scripts/validate.mjs` exige esse caminho; porém o `scripts/build.mjs` de master ignora `release.scriptUrl` e monta o updateURL usando a URL API beta10. A #141 candidata passa a derivar o URL do campo de release. O HEAD QA atual ainda não contém essa correção e o Validate falhou em [43104949494](https://github.com/Reekyi/UpStatus/actions/runs/43104949494).

A #143 executou seu próprio Guard por push: os steps de sintaxe, contrato offline e validação completa passaram; o job deploy foi SKIPPED. O Validate PR separado também passou. O workflow de deploy é manual-only, exige SHA/PR/aprovação/versão/ambiente/aceitação e publica API beta10 antes do userscript Normal. Nenhuma publicação foi feita.

A #146 executou somente build e regressões offline. Não é smoke de navegador, teste de rede real ou aceitação física.

## 4. Nova candidata #146: avanço real, integração pendente

A #146 altera quatro arquivos: workflow de candidate validation, teste de contrato, validator e template do userscript. O contrato verifica que:
- `remote_command` e `remote_result` públicos carregam somente hint;
- o comando e o resultado são buscados em endpoints autenticados;
- hints são agrupados em polling com cooldown;
- um hint recebido durante polling ativo é preservado e processado depois;
- a identidade token/membro é conferida antes de executar a resposta;
- a assinatura Realtime agenda reconciliação após `SUBSCRIBED`;
- timers pendentes são limpos quando Realtime para.

O Validate PR passou no SHA exato [71c5ce2](https://github.com/Reekyi/UpStatus/actions/runs/43108250452). Isso é CI offline/contrato, não teste físico.

**A #146 ainda não está no dispatcher.** A comparação entre o HEAD #143 (`c4a04fa`) e #146 (`71c5ce2`) retorna branches divergentes: #146 está 10 commits à frente e 15 atrás. O dispatcher permanece baseado na linha #142 sem a reconciliação da #146. Não publicar a #143 como se já contivesse essa mitigação.

## 5. Bundles implantados: comandos remotos e autenticação

Management API / Edge Function source:

| Runtime | Versão | Source SHA |
|---|---:|---|
| Normal `upstatus` | 480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| Team Lite `upstatus-team-lite` | 15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| API Normal beta10 | 6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| TEST legado | 281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |

Os bundles embutidos são Normal 3.4.7 e Team Lite 3.4.30. A inspeção do userscript extraído dos bundles confirmou que ambos ainda recebem `remote_command` público e chamam `executeRemoteCommand` com o payload. Team Lite verifica a própria sessão/generation local, mas isso não autentica a identidade do emissor. Ambos também registram handlers públicos de `call_signal`, voice-room e screen-share.

A #76 candidata já usa broadcast de comando como hint, mas o transporte autenticado de voz/tela permanece opt-in/desligado por padrão. A função server-mediated existe apenas no laboratório; produção não tem uma função `upstatus-signal` correspondente. Logo, os testes do transporte autenticado no laboratório não comprovam que produção já usa esse caminho.

**AUTH-03:** os três runtimes implantados ainda contêm `POST /api/setup -> login(req,true)`, sem consumo de convite. Produção tem cinco contas, todas com password hash e role preenchidos, mas não tem colunas `setup_token_*`, tabela de rate limit ou RPCs de convite. No laboratório existem quatro colunas de token, `upstatus_setup_invite_rate_limits`, e as RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`, ambas SECURITY INVOKER com search_path vazio. O laboratório tem zero usuários. #131 passou em CI isolado, mas a API #142 e os runtimes de produção ainda não receberam AUTH-03. O rate limit de convite não equivale a rate limit de tentativas de login.

## 6. Supabase produção: Realtime, RLS, grants e Storage

Snapshot read-only em 2026-11-11:

- `realtime.messages`: **109** registros; todos `private=false`, todos no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Bundles instalados assinam `upstatus-screen-share-live-3-1-1-beta10`; o tópico dos clientes não coincide com o tópico dos triggers.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; anon/authenticated têm SELECT, INSERT e UPDATE.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, e têm EXECUTE para anon e authenticated. O Advisor retornou três WARN para anon, três WARN para authenticated e dez INFO de RLS sem policy.
- `upstatus_broadcast_messages` transmite o registro OLD/NEW (conforme operação) completo em `db_change`; `upstatus_broadcast_remote_state` transmite metadados de comando e resultado; `upstatus_broadcast_users` transmite nome/status/reason/updated_at/sync. Os três broadcasts usam `private=false`.
- Dez tabelas públicas estão com RLS e sem policies. Nove tabelas concedem sete privilégios cada a anon e authenticated: 126 entradas diretas no total, incluindo TRUNCATE. RLS não protege TRUNCATE.
- Default ACL: 24 linhas de catálogo e 300 entradas expandidas no total. Destas, 120 entradas são privilégios para anon/authenticated em public, storage, graphql e graphql_public. O total 300 inclui também grants de owners e papéis internos; não deve ser apresentado como 300 grants de clientes.
- Storage: `chat-images` e `profile-images` públicos, limite de 20 MiB cada, zero policies próprias em `storage.objects`, 188 objetos.
- `public.messages`: 296 registros. Há cinco mensagens `type=document`; todas as cinco têm `file_name` nulo. Os tipos image/audio/video usam `image_url` para referência ao objeto.

O achado de comando remoto é inspeção estática de código e payload; não houve publicação de broadcast, injeção de sinalização ou exploração externa.

## 7. Migrations, ambiente e Edge Functions

- Produção: sete migrations; branch Supabase `main` em `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Laboratório: 39 migrations; projeto `ACTIVE_HEALTHY`; sem development branches; zero fixtures de aplicação nas categorias auditadas.
- Organização tem apenas dois projetos: produção e `upstatus-security-test`. Não há terceiro projeto full-product TEST. O laboratório é isolado, mas não substitui um ambiente de aceitação full-product.
- Produção tem 38 Edge Functions; laboratório tem duas (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3). As funções relevantes reportam `verify_jwt=false`; isso não foi classificado isoladamente como ausência de autenticação porque os handlers principais verificam sessão customizada.
- O helper de sinalização do laboratório não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409; mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409. Não foi feita requisição HTTP real.
- Quatro arquivos SQL históricos continuam sem proveniência Git original. A #135 recupera statements do ledger, não os arquivos originais byte a byte.
- O dispatcher #143 exige sete migrations-base e exige arquivos SQL com Git blob SHA verificado. Três fontes estão verificadas; quatro estão marcadas `ledger-recovered-only`. `assertRequiredNormalProductionMigrationFiles` rejeita as quatro e informa que statements recuperados do ledger não são fontes originais. **Esse bloqueio é fail-closed e correto.** Quando AUTH-03 for integrado à linha #142/#143, a migration de rate limit de convite também terá de entrar no manifesto e nos testes do dispatcher.
- `release.json` permanece em 3.4.7. O dispatcher exige versão estável maior que a versão atual para release; nenhuma versão nova foi escolhida.

## 8. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): critérios físicos permanecem **0/8**. Não houve perda real de internet, recuperação sem F5, reentrada em sala, chamada nova, microfone/display capture real ou interoperabilidade instalada nesta rodada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): comentário QA existente atualizado; comentário da Engenharia preservado; sem comentário QA duplicado. JSON do Control Center foi atualizado com status intermediário e será finalizado com este relatório.

## 9. Gates QA

| Gate | Estado | Justificativa |
|---|---|---|
| RT-01 | blocked | Realtime continua público, tópico divergente e permissões sem hardening |
| TEST-ISOLATION | blocked | laboratório isolado existe, mas não há terceiro ambiente full-product TEST |
| MIGRATION-PROVENANCE | blocked | quatro fontes originais não têm Git blob proveniência; dispatcher rejeita |
| AUTH-03 | in_progress | candidato e schema de laboratório existem; API/produção ainda usam setup antigo |
| ACL-STORAGE | blocked | grants diretos, Default ACL e buckets públicos permanecem |
| RECONNECT | pending | #146 tem regressão offline para SUBSCRIBED/polling; aceitação física #78 continua 0/8 |
| HUMAN-REVIEW | pending | nenhuma review registrada nas PRs auditadas e nenhuma autorização humana de release |

## 10. Próximas ações recomendadas

1. Reconciliar #146 com #143 sem perder o guard de release; executar Validate PR e Guard no mesmo HEAD integrado.
2. Integrar AUTH-03 no template/API Normal e Team Lite, atualizar o manifesto de migrations e preservar a paridade dos contratos.
3. Tornar voz/tela server-mediated e privado por padrão antes de remover os listeners públicos; não habilitar flags sem backend correspondente em produção.
4. Alinhar os tópicos Realtime e restringir broadcasts a hints não autoritativos.
5. Recuperar proveniência original dos quatro SQLs; não substituir origem por statements reconstruídos do ledger.
6. Endurecer grants, Default ACL e Storage com plano coordenado e teste isolado.
7. Criar projeto full-product TEST independente.
8. Corrigir o contrato build/updateURL no master e validar novo HEAD QA.
9. Só então executar aceitação física Normal e Team Lite sem F5 e obter aprovação humana explícita.

## 11. Segurança da execução

Nenhuma alteração em produção. Todas as consultas SQL foram SELECT-only. Nenhuma migration, alteração de grant/policy/ACL, secret, flag, role, deploy, merge, release, publicação de userscript, rerun de workflow ou teste manual foi executado. A única escrita de repositório desta rodada é este relatório novo na branch QA dedicada; a única escrita no GitHub Issues é a atualização do comentário QA existente na #79. O comentário da Engenharia foi preservado.
