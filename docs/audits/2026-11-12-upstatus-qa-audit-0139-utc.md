# Auditoria independente UpStatus QA — 2026-11-12 0139 UTC

## Escopo e segurança

Revalidação read-only de GitHub e Supabase para UpStatus Normal e Team Lite: readiness, heads, PRs #74/#75/#76/#82 e linhas relacionadas (#89/#131/#141/#142/#143/#145/#146), Issues #78/#79, workflows, bundles implantados, RLS/grants/SECURITY DEFINER, Realtime, Edge Functions, Storage e migrations.

- Nenhuma escrita em produção; SQL executado somente com SELECT/catálogo.
- Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva.
- Nenhum teste manual no Tampermonkey/navegador do usuário foi executado.
- A única escrita desta execução é este relatório novo na branch QA dedicada.

## Readiness e heads reais

Li o conteúdo atual de `docs/RELEASE_READINESS.md` na branch QA: 8.410 linhas. O último checkpoint interno do documento é de 2026-11-08 18:30 UTC; portanto o documento principal não contém as revalidações desta execução.

| Ref | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `6c3c5f6a11738fd9ed726a1bf6823edcbb0eef34` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `c4dee8d2c502499de5f95932ac14a90cffb56196` |
| PR #82 | `6c3c5f6a11738fd9ed726a1bf6823edcbb0eef34` |
| PR #89 | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` |
| PR #131 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| PR #141 | `4dba48196a1a605557ac7a853f6ae4adff0ea555` |
| PR #142 | `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4` |
| PR #143 | `c4a04fa755b877bc76b1372170a26e7b974264e6` |
| PR #145 | `bbfda9dfe53f25535c697586fce63917ee674e1f` |
| PR #146 | `71c5ce2f730ade8ee3e8b090498202933809ce5c` |

QA está 234 commits à frente e 1 atrás de master. #74 está 883 à frente e 1 atrás de master; #75 está 59 à frente de team-lite-official; #76 está 384 à frente. #143 e #146 divergiram: #143 está 10 commits à frente e 15 atrás de #146. #143 está 15 à frente e 2 atrás de #142; #146 está 8 à frente de #142. Não fiz rebase nem tentei reconciliar essas branches.

master, QA e team-lite-official retornam `protected=false`. As PRs examinadas permanecem abertas/Draft e não encontrei reviews humanas em #74/#75/#76/#82/#89/#131/#141/#142/#143/#145/#146.

## CI — resultados nos HEADs exatos

| PR | Run | Resultado observado |
|---|---|---|
| #74 | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) + [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS; no Smoke, rate limit de emissão de convite foi SKIPPED |
| #75 | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico do baseline |
| #76 | [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) | PASS, 110/110 verificações autenticadas; Chromium entregou áudio de chamada/voz e vídeo de tela e aprovou teardown |
| #82 | [Validate 43128290928](https://github.com/Reekyi/UpStatus/actions/runs/43128290928) | FAIL: `production updateURL mismatch` |
| #89 | [Cutover Guard 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | PASS do guard; não é teste HTTP de enrollment |
| #131 | [Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | PASS, 136/136 verificações autenticadas; rate limit distribuído de emissão executado |
| #141 | [Validate 43085700956](https://github.com/Reekyi/UpStatus/actions/runs/43085700956) | PASS |
| #142 | [API Validate 43085494740](https://github.com/Reekyi/UpStatus/actions/runs/43085494740) | PASS |
| #143 | [API Validate 43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347) | PASS; não é o guard específico do dispatcher |
| #143 | [Dispatcher push guard 43093394788](https://github.com/Reekyi/UpStatus/actions/runs/43093394788) | PASS em evento push |
| #145 | [Validate 43100913884](https://github.com/Reekyi/UpStatus/actions/runs/43100913884) | PASS |
| #146 | [Validate 43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) | PASS |

A falha estática de Team Lite citada em execução anterior foi superada no HEAD atual #76: o run 43124413080 passou 110/110. Não é bloqueador atual. Esses testes são CI isolado/Chromium, não aceitação manual com Tampermonkey e permissões reais.

### Causa da falha de Validate na QA

Na QA, `scripts/build.mjs` define a URL de produção como `cloud + "/upstatus.user.js"`, sendo `cloud` o runtime API beta10. O `release.json` já aponta corretamente para `/functions/v1/upstatus/upstatus.user.js`, e `scripts/validate.mjs` exige esse endpoint de distribuição. O build da QA ignora `release.json.scriptUrl`, gerando o updateURL errado. A linha candidata #142 separa `PROD_FUNCTION=upstatus` de `PROD_API_FUNCTION=upstatus-screen-share-3-1-1-beta10` e usa `release.scriptUrl`; a correção ainda não está em master/QA.

### Guard do dispatcher

O workflow `.github/workflows/deploy-production.yml` da #143 tem `pull_request.branches: [master]`, mas #143 usa como base a branch #142. Por isso o guard próprio do dispatcher não executa como check de PR nessa PR empilhada. O run 43093394788 foi PASS em push. O run 43093687347 é o Validate do workflow de API candidata, não o guard do dispatcher.

## Segurança de comandos e sinalização — inspeção estática

Decodifiquei os userscripts embutidos nas Edge Functions implantadas:

- Normal `upstatus` v480 contém userscript 3.4.7.
- Team Lite `upstatus-team-lite` v15 contém userscript 3.4.30.
- API `upstatus-screen-share-3-1-1-beta10` v6 contém userscript beta8 3.1.1-beta8.

Nos bundles instalados Normal e Team Lite:
- o listener de `remote_command` encaminha o comando recebido para `executeRemoteCommand` quando `target===member`;
- Team Lite verifica a sessão local/geração de autenticação, mas isso não autentica o remetente do broadcast;
- `call_signal`, voice-room e screen-share passam payloads recebidos aos handlers sem prova de identidade/membership emitida pelo servidor;
- não há `private:true` nem `realtime.setAuth()` no cliente.

O backend possui `GET /api/remote-status` com sessão customizada e consulta de resultado restrita a admin, mas o listener público instalado executa o payload diretamente, contornando esse caminho autenticado. Isso é um caminho de confused deputy por inspeção estática; não publiquei broadcast, não injetei SDP/ICE e não reproduzi exploração. A configuração de Dashboard “Allow public access” não foi exposta pelo conector, então acesso externo efetivo não foi demonstrado.

A #146 corrige somente o fluxo Normal de remote-command/remote-result: broadcast passa a ser wake-up e o comando vem por polling autenticado. O teste de contrato exige que o handler não leia payload nem execute comando. A correção não está na #143: as branches divergiram. A #146 não implementa transporte autenticado de voz/tela.

A candidata Team Lite #76 contém adapter de sinalização autenticada, mas `signalTransportFlag` inicia false e o endpoint inicia vazio. Quando desligada, o código mantém fallback Realtime público. A candidata Normal #146 não contém adapter equivalente para voz/tela. Portanto, nenhuma das duas linhas está pronta para tornar a sinalização de mídia privada por padrão.

## Realtime, PostgreSQL, RLS e grants — SELECT/catalog-only

Snapshot atual de produção `dlfvkawaiqduhlazsszm`:

- 109 linhas em `realtime.messages`, todas `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Triggers do banco publicam no tópico legado; os userscripts Normal/Team Lite instalados assinam `upstatus-screen-share-live-3-1-1-beta10`.
- A candidata Team Lite #76 usa o tópico legado; a candidata Normal #146, pelo build #142, usa beta10. Se combinadas sem reconciliação, as candidatas também não compartilham o mesmo tópico.
- O runtime beta10 v6 embute artefato beta8 com tópico beta8, outro resíduo de versão.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.
- 10 tabelas públicas com RLS e zero policies; nove têm grants diretos amplos a anon/authenticated, incluindo DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. RLS não protege TRUNCATE; não tentei executá-lo.
- 24 entradas Default ACL, totalizando 75 itens expandidos; defaults amplos permanecem em schemas public/storage/GraphQL.
- Advisor de segurança produção: 6 WARN (3 funções x 2 papéis) e 10 INFO de RLS sem policy. Laboratório: 18 INFO e zero WARN.
- `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated e emitem com `private=false`. Mensagens usam `to_jsonb(OLD/NEW)` completo; remote-state envia metadados de comando/resultado; user-status envia nome/status/reason/sync. As funções retornam trigger; não classifiquei isso como RPC comum invocável, mas os grants continuam desnecessários e o broadcast público é o risco confirmado.

## AUTH-03 e Edge Functions

Produção:
- cinco usuários; zero sem password hash e zero sem role;
- zero colunas `setup_token_*`;
- ausentes tabela de rate limit de convite e RPCs de consumo/limitação;
- Normal, Team Lite e API beta10 ainda encaminham `POST /api/setup` para `login(req,true)`, sem token de convite;
- o handler de login inspecionado não tem rate limit de tentativas de login.

Candidatos:
- #89 implementa convite de primeiro acesso, mas não inclui o rate limit de emissão;
- #131 inclui o rate limit e passou 136/136;
- #76 inclui convite + rate limit e passou 110/110;
- Git blob SHA da migration `20261109230000_setup_invite_rate_limit.sql` é idêntico entre #76 e #131: `ab73b5cd8200147a449327d21798eef588834d50`;
- Git blob SHA do teste é idêntico: `ba22efb520cc0c23078a1395b207b62a96078231`;
- API #142 ainda não incorpora AUTH-03. As branches #89 e #131 também são historicamente divergentes; não fazer cherry-pick cego.

Produção tem 38/38 Edge Functions ACTIVE, todas reportando `verify_jwt=false`; os handlers principais usam sessão customizada `x-upstatus-token`, então esse atributo isolado não prova ausência de auth. Slugs/versões relevantes: `upstatus` v480, `upstatus-team-lite` v15, beta10 v6 e `upstatus-test` v281 dentro do próprio projeto de produção. Não existe `upstatus-signal` em produção. Laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

## Chat e Storage

Produção tem 296 mensagens: 241 text, 22 system, 17 image, 7 audio, 5 document e 4 video. A coluna `file_name` está nula em todas as 296 linhas. O runtime beta10 v6 inspecionado não contém persistência de `file_name`; a candidata #141 adiciona a evolução de chat/upload, mas não está implantada.

Storage:
- `chat-images`: público, 20 MiB, 168 objetos;
- `profile-images`: público, 20 MiB, 20 objetos;
- zero policies próprias em `storage.objects`.

O runtime beta10 v6 ainda usa rota legada de upload com limite de imagem de 25 MiB, acima do limite de 20 MiB do bucket. Não executei upload.

## Ambientes, migrations e issues

- A organização tem somente dois projetos: produção `dlfvkawaiqduhlazsszm` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations) e laboratório `bfpjtfqlnypisxljoxkb` (ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations).
- O laboratório está vazio nas tabelas principais consultadas (`users`, `messages`, `upstatus_state`, `realtime.messages`), mas não é um terceiro projeto full-product TEST.
- Branch Supabase `main` continua `MIGRATIONS_FAILED`; preview está ACTIVE_HEALTHY.
- Dispatcher #143 lista sete migrations históricas, três com Git blob SHA verificado e quatro `ledger-recovered-only`; exige os arquivos originais e falha fechado. Não inclui a migration AUTH-03 `20261109230000_setup_invite_rate_limit`.
- Workflow oficial Team Lite em `team-lite-official` continua usando CLI `latest` e `supabase functions deploy upstatus`, não `upstatus-team-lite`; não despachar.
- Issue #78 está OPEN com 0/8 critérios físicos marcados. Não houve perda de rede real, reentrada sem F5, Tampermonkey, permissões reais de microfone/tela ou interoperabilidade instalada.
- Issue #79 continua OPEN. O corpo principal ainda contém checklist antigo; o comentário dedicado QA é a referência atualizada. O comentário QA existente foi atualizado, sem duplicata e sem alterar o comentário da Engenharia.

## Gates desta execução

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | broadcasts públicos, tópico divergente e sinalização de mídia sem transporte autenticado default |
| TEST-ISOLATION | blocked | laboratório limpo, mas não há projeto full-product TEST separado |
| MIGRATION-PROVENANCE | blocked | quatro SQLs sem blob original; AUTH-03 ausente do manifesto do dispatcher |
| AUTH-03 | in_progress | candidatos #76/#131 passam e têm migration/teste idênticos; API e produção ainda não integradas |
| ACL-STORAGE | blocked | grants/default ACL amplos e buckets públicos sem policies próprias |
| RECONNECT | pending | CI cobre teardown/recovery, mas Issue #78 exige teste físico sem F5 |
| HUMAN-REVIEW | pending | PRs Draft e sem aprovação humana/autorização de release |

## Próximos passos recomendados

1. Reconciliar #146 com #143 e garantir que o guard do dispatcher execute como check de PR para a branch-base #142.
2. Tornar sinalização de voz/tela privada e autenticada por padrão em Normal e Team Lite; alinhar tópicos com os triggers e minimizar payloads.
3. Integrar AUTH-03 na API Normal e Team Lite, mantendo rate limit de emissão e avaliando rate limit de login.
4. Recuperar os quatro SQLs originais e adicionar migrations AUTH-03 ao manifesto, com revisão da sequência de cutover.
5. Corrigir grants/Default ACL/Storage com plano revisado, criar TEST full-product e corrigir o build/Validate da QA.
6. Só então executar os oito testes físicos da #78 e solicitar aprovação humana.

**Recomendação de release: NOT READY.** Nenhuma alteração de produção foi realizada; nenhuma ação de Ricardo é necessária nesta execução.
