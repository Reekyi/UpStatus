# Auditoria independente UpStatus — 2026-11-11 19:35 UTC

## Escopo e método

Revisão read-only do GitHub `Reekyi/UpStatus` e Supabase de produção `dlfvkawaiqduhlazsszm`, com laboratório `bfpjtfqlnypisxljoxkb`. Foram inspecionados refs/PRs, arquivos e patches, workflows e logs já existentes, issues #78/#79, Edge Function sources implantadas, migrations, catálogos PostgreSQL, grants, ACLs, RLS, funções e Advisor.

Nenhum teste novo foi iniciado. Nenhum rerun foi disparado. Não houve alteração de código de produto, produção, migrations, secrets, flags, grants, policies, Storage, merge, deploy, release ou publicação de userscript. Todas as consultas SQL foram SELECT/catalog-only. A única escrita desta execução é este relatório na branch QA.

## Refs reais

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `cb89a30abd26b35aa72d0cb316589f798dfed0ee` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `4edfbf25476c7c751741b2e14c2c88fdc554f618` |
| PR #82 / QA | `cb89a30abd26b35aa72d0cb316589f798dfed0ee` |
| PR #131 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| PR #141 | `4dba48196a1a605557ac7a853f6ae4adff0ea555` |
| PR #142 | `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4` |
| PR #143 | `34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa` |

A QA está 227 commits à frente e 1 atrás de master, com merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. #74 está 883 à frente/1 atrás de master; #82 está 227/1. #131 está exatamente 1 commit à frente de #74. #76 está 321 commits à frente e 0 atrás de #75. A cadeia Normal está divergente: #142 está 12 à frente/1 atrás do HEAD atual de #141; #143 está 13 à frente/2 atrás do HEAD atual de #142. Não fazer cherry-pick cego.

### Documento de prontidão

Li integralmente `docs/RELEASE_READINESS.md` na branch QA: 8.410 linhas, 1.045.105 caracteres. O último snapshot interno do documento é de 08/11/2026, 18:30 UTC; portanto está desatualizado frente às evidências desta rodada. O documento original não foi alterado.

### Governança GitHub

A consulta dos próprios objetos de branch retornou `protected=false` e required checks desligados para `master`, `team-lite-official` e QA. O endpoint de rulesets retornou lista vazia. Não há proteção efetiva dessas três branches. O endpoint específico de proteção detalhada retorna 403 para a integração, mas o campo `protected=false` do branch object é explícito.

Histórico de reviews retornou zero reviews para #74, #75, #76, #82, #131, #141, #142 e #143. HUMAN-REVIEW permanece pendente.

## CI observado nos HEADs exatos

| PR/HEAD | Evidência | Resultado observado |
|---|---|---|
| #74 `fb878537` | [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336), [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) | Ambos PASS. Smoke executou consumo atômico one-time de convite, mas **pulou** o teste de rate limit de emissão de convite. |
| #75 `7bbf9b90` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; baseline ancestral de #76, não candidato independente atual. |
| #76 `4edfbf25` | [Candidate Checks 42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) | PASS. Logs: 16/16 não autenticados, 11/11 contrato HTTP isolado, 110/110 autenticados; WebRTC de chamada/voz/tela, mesh de três membros, rate limit de convites, recuperação e cleanup. |
| #82 `cb89a30` | [Validate 43079031009](https://github.com/Reekyi/UpStatus/actions/runs/43079031009) | FAIL em `production updateURL mismatch`; build gerou 3.4.7/3.4.7 e falhou em `scripts/validate.mjs:26`. |
| #131 `17169a30` | [Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | PASS. Logs: 19/19 não autenticados e 136/136 autenticados; rate limit de convites concorrente passou no laboratório; Chromium validou WebRTC de chamada/voz/tela e mesh; cleanup confirmado. |
| #135 `98e96cfe` | [Validate 42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) | FAIL herdado em Validate. PR documental, não executou SQL; statements recuperados ficam fora de `supabase/migrations`. |
| #141 `4dba481` | [Validate 43085700956](https://github.com/Reekyi/UpStatus/actions/runs/43085700956) | PASS no HEAD atual. |
| #142/#143 `2ffb8d9` / `34cbf58` | [Normal Beta10 API Candidate Validate 43085494740](https://github.com/Reekyi/UpStatus/actions/runs/43085494740) | PASS no HEAD atual de #142 e no HEAD de #143. O workflow de #142 cobre PRs cujo base é #141 ou #142 e executa `scripts/validate.mjs`, que inclui o contrato do dispatcher. O workflow próprio do dispatcher só filtra PR com base master; não foi esse o check observado para o PR empilhado #143. Nenhum deploy ocorreu. |

Os resultados acima são CI existente consultado, não testes executados pela QA nesta rodada. Não há teste manual de navegador/Tampermonkey nesta execução.

## AUTH-03 — candidata boa, integração incompleta

#131 adiciona ao Normal:
- token de primeiro acesso de 256 bits, hash no banco, consumo one-time e expiração;
- RPC distribuída de rate limit por administrador, cinco emissões/900 segundos;
- HTTP 429 ao exceder o limite e 503 fail-closed se o limitador falhar;
- migration com SECURITY INVOKER, `search_path = ''`, RLS e EXECUTE restrito a service_role.

Os arquivos de migration e teste `20261109230000_setup_invite_rate_limit.sql` e `..._test.sql` foram comparados por conteúdo entre #131 e #76 e são idênticos. O CI de ambos executou o teste de concorrência e cleanup no laboratório.

**Lacuna de integração:** a API Normal #142 não contém `setup_token`, `consume_upstatus_setup_invite` nem `consume_upstatus_setup_invite_rate_limit`. Seu `POST /api/setup` ainda chama `login(req,true)`, mas o login dessa linha não valida token. A #131 contém a validação do token e a rota de emissão, porém não está integrada ao stack #141/#142. Nenhum rate limit de tentativas de login foi encontrado nos candidatos inspecionados.

Os runtimes implantados também permanecem antigos:
- produção `upstatus` v480, atualizado em 29/10;
- `upstatus-team-lite` v15, atualizado em 29/10;
- beta10 `upstatus-screen-share-3-1-1-beta10` v6, atualizado em 27/10.

Nos três, o código servido mantém `POST /api/setup -> login(req,true)`; não há `setup_token_*` nem RPC de rate limit. A produção tem 5 contas, 0 sem password_hash e 0 sem papel, então não foi observada conta atualmente desconfigurada; o fluxo legado continua sendo risco para provisionamento futuro.

## Realtime, voz e tela

### Produção — consulta read-only

- `realtime.messages`: 105 linhas persistidas, todas `private=false`.
- Grupos: 53 `user_status`, 40 `db_change`, 6 `remote_command`, 6 `remote_result`.
- Todos no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- RLS habilitado, FORCE RLS desligado, zero policies; anon/authenticated têm SELECT, INSERT e UPDATE.
- Os três triggers chamam funções SECURITY DEFINER com `search_path=public`, retornam `trigger` e têm EXECUTE para anon/authenticated/service_role. `upstatus_broadcast_messages` envia OLD/NEW completo; as funções de estado e usuário enviam metadados.
- Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. O Advisor lista as funções como SECURITY DEFINER executáveis; por retornarem `trigger` e estarem anexadas a triggers, não afirmo exploração RPC direta. Os grants continuam desnecessários e o broadcast público é o risco concreto.

### Divergência de tópico entre runtimes e candidatos

- Os runtimes implantados Normal v480 e Team Lite v15 embutem `upstatus-screen-share-live-3-1-1-beta10`.
- Os triggers de produção publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os builds de #74 e #76 usam o tópico legado `upstatus-live-...`, que coincide com os triggers.
- Os builds de #141/#142 mudaram `PROD_TOPIC` para `upstatus-screen-share-live-3-1-1-beta10`, que não coincide com os triggers atuais.

Logo, o stack Normal #141/#142 e os runtimes atuais não estão alinhados aos triggers de produção; #74/#76 usam outro contrato. Não houve teste de entrega em navegador, então classifico como incompatibilidade estática comprovada, com impacto de eventos potencialmente perdidos/stale, não como falha reproduzida.

### Transporte autenticado ainda não é default

Nos candidatos #74/#76, `signaling_transport_enabled` defaulta para false e `signaling_transport_endpoint` é vazio por padrão. Quando desligado, voz e screen-share continuam usando broadcast público. O transporte server-mediated existe como caminho opt-in, mas não há função equivalente implantada em produção; `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 existem somente no laboratório. Os clientes não configuram `private:true` nem `realtime.setAuth()`.

Melhoria real: #74/#76 reduzem `remote_command` a wake-up/poll e tratam `remote_result` como hint, em vez de executar o comando recebido diretamente. Isso não fecha a exposição de voz/tela enquanto o transporte seguro permanece desativado por padrão.

## RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas públicas com RLS e sem policies;
- 9 tabelas concedem a anon e authenticated os mesmos 7 privilégios: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE (126 linhas de grants);
- 120 entradas de Default ACL para anon/authenticated: 48 em public, 24 em storage, 24 em graphql e 24 em graphql_public;
- buckets `chat-images` e `profile-images` públicos, limite 20 MiB cada; zero policies próprias em `storage.objects`.

Laboratório:
- 18 tabelas públicas RLS sem policies;
- zero grants diretos para anon/authenticated nas tabelas públicas auditadas;
- 24 entradas de Default ACL em public;
- `realtime.messages` vazio, RLS true, zero policies, FORCE RLS false e grants SELECT/INSERT/UPDATE para anon/authenticated;
- zero buckets e zero fixtures nas tabelas users, messages, sessions, rooms, memberships, events, bindings, signal/setup rate limits, call/voice attempts e chat_reads.

O stack #142 usa signed upload e valida MIME/tamanho declarados antes de criar URL assinada. Inspeção estática encontrou também no caminho legado `sniffMime` retorno do MIME declarado quando a assinatura não é reconhecida; `mediaRoute` aceita imagem até 25 MiB, enquanto o bucket limita 20 MiB. Não houve upload real; classificar como risco/contrato a testar, não como exploração comprovada.

## Migrations e Edge Functions

- Produção: 7 migrations no ledger; branch Supabase `main` está `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Laboratório: 39 migrations, branch list vazia.
- Os quatro SQLs históricos seguem 404 em master: visual config, file_name, MIME de documentos e limite de upload.
- #135 arquiva os statements recuperados do ledger em `docs/migration-recovery/`; a própria PR declara corretamente que não são os arquivos originais byte a byte, não contêm comentários/formatação original e não devem ir para `supabase/migrations` sem aprovação. Seu Validate falha por erro herdado de updater.
- O dispatcher #143 exige somente as sete migrations históricas e omite `20261109230000_setup_invite_rate_limit`; também não valida hashes/proveniência de todos os SQLs locais. Se #131 for integrada sem atualizar o preflight, a migration necessária ao runtime não será exigida.
- `release.json` em master e #143 continua 3.4.7; o dispatcher exige versão estável superior à versão atual 3.4.7. O projeto Supabase main está MIGRATIONS_FAILED, então o preflight deve falhar fechado.
- Produção lista 38 Edge Functions; laboratório, 2. As funções-chave amostradas reportam `verify_jwt=false`, mas handlers inspecionados usam autenticação customizada; não classificar esse flag isoladamente como ausência de auth.
- `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT`/ROOM_FULL para 409, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`. Sem chamada HTTP real nesta rodada.

## Issues

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, 0/8 critérios físicos marcados. Não houve teste físico de queda de internet, retorno sem F5, reentrada, chamadas após reconexão, microfone/tela ou interoperabilidade instalada Normal ↔ Team Lite.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta. O corpo principal ainda contém snapshots antigos de 07/11; o comentário QA dedicado foi atualizado nesta execução, sem criar duplicata e sem alterar o comentário da Engenharia.

## Gates

| Gate | Estado QA | Evidência |
|---|---|---|
| RT-01 | blocked | 105 broadcasts públicos, topic mismatch, RLS sem policy e transporte seguro opt-in |
| TEST-ISOLATION | blocked | só dois projetos; laboratório é fixture-only, não full-product TEST |
| MIGRATION-PROVENANCE | blocked | quatro SQLs originais ausentes; #135 é recuperação de statement; #143 omite migration de rate limit |
| AUTH-03 | in_progress | #131/#76 passam no laboratório, mas #142 e runtimes implantados não têm o fluxo |
| ACL-STORAGE | blocked | grants/ACL amplos e buckets públicos sem policies |
| RECONNECT | pending | issue #78 0/8; sem confirmação manual de Ricardo |
| HUMAN-REVIEW | pending | zero reviews nas PRs auditadas e sem autorização de release |

## Veredito

**NOT READY.** Prioridades:
1. Tornar o Realtime privado/autorizado e alinhar tópico de cliente, API e triggers; tornar server-mediated signaling default após implantação/revisão.
2. Reconciliar #131 com #141/#142 e garantir AUTH-03 completo nos dois produtos; adicionar rate limit de login.
3. Atualizar #143 para exigir a migration de rate limit e a proveniência dos arquivos; resolver MIGRATIONS_FAILED antes de release.
4. Endurecer grants, Default ACL, RLS e Storage com plano revisado.
5. Corrigir workflow oficial Team Lite: ele ainda deploya `upstatus` com CLI `latest`; não despachar.
6. Fazer testes físicos da #78 e obter revisão/autorização humana.

Não declarar percentual global nesta auditoria. CI, inspeção estática, estado do banco e aceitação física são evidências diferentes.
