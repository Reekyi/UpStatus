# Auditoria independente UpStatus QA
**Data:** 17/11/2026 09:38 BRT / 12:38 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## Escopo e método

Revalidação read-only de branches, PRs, commits, workflows, logs de CI, Issues #78/#79, documento de prontidão, bundles Edge Function implantados, catálogos PostgreSQL, Security Advisor, Realtime, Storage e logs de Edge Functions.

Não foram iniciados workflows, testes manuais, scripts, mutações de fixtures ou testes de exploração. Não houve escrita SQL. A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.

## Documento de prontidão

O blob completo de `docs/RELEASE_READINESS.md` foi recuperado: 1.046.356 caracteres e 8.423 linhas. O último checkpoint interno é **15/11/2026 06:30 UTC**. O documento principal está desatualizado em relação às revalidações de 17/11; os relatórios diários ficam em `docs/audits/`.

## Heads reais

| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `7ec18d927278310c7b7c3fd39dd11297150bcfe0` |

A QA está 397 commits à frente e 1 atrás de master. Não houve rebase nem incorporação automática do commit concorrente de master. PR #82 aponta para o mesmo HEAD da QA.

## PRs, histórico e CI

| PR | HEAD | Relação com a base | Evidência atual |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 à frente de master, 1 atrás | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 à frente da base oficial | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | 389 à frente da base oficial | Candidate Checks [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) FAILURE por quota |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `7ec18d927278310c7b7c3fd39dd11297150bcfe0` | 397 à frente de master, 1 atrás | Validate [44077437222](https://github.com/Reekyi/UpStatus/actions/runs/44077437222) FAILURE |
| [#161 Normal consolidada](https://github.com/Reekyi/UpStatus/pull/161) | `557814dc31bed779b84a2094358dc6b2a7e67689` | 12 à frente de #74, 0 atrás | Validate [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e Smoke [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) SUCCESS |
| [#131 AUTH-03](https://github.com/Reekyi/UpStatus/pull/131) | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | 1 à frente de base antiga `fb878537` | Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) SUCCESS, mas base não é o HEAD atual de #74 |
| [#176 Migrations](https://github.com/Reekyi/UpStatus/pull/176) | `b50f8567392322b4309468e0fe9e6fc81ca38c1d` | 6 à frente de develop | Validate [43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) FAILURE |

#76 é continuação direta de #75: 330 commits adicionais e nenhuma divergência para trás. Não tratar as duas como entregas independentes. #74 e #82 estão divergentes em relação à master atual, ambas um commit atrás.

Não encontrei reviews registradas nas PRs #74, #75, #76, #82, #131, #161 e #176. Todas continuam abertas/Draft, sem aprovação humana.

### O que os testes realmente demonstram

- **#74:** 19/19 verificações não autenticadas e 136/136 autenticadas passaram. Browser confirmou WebRTC de chamada, voz e tela, com tracks remotas. O passo de rate limit de emissão de convites foi **skipped** nesta branch.
- **#161:** 19/19 não autenticadas e 136/136 autenticadas passaram. Browser confirmou áudio de chamada, áudio de sala de voz e vídeo de compartilhamento de tela. O rate limit de convites foi executado, com concorrência, isolamento de buckets e limpeza aprovados.
- **#75:** PASS histórico da baseline. Não substitui a validação da candidata atual #76.
- **#76:** o job separado de contratos de upload assinado passou. No Candidate Checks, os contratos HTTP offline passaram 11/11. A etapa de autenticação do endpoint real recebeu HTTP 402 em vez dos códigos esperados; as etapas Playwright, integração autenticada e concorrência foram ignoradas.
- **#82:** falha em `scripts/validate.mjs:26`, `production updateURL mismatch`. É uma falha herdada do build/validator, não uma falha de conteúdo Markdown.
- **#131:** Smoke passou, mas a branch é filha de uma base antiga e não deve ser tratada como integração atual. #161 é a candidata consolidada mais recente.
- **#176:** falha em `client signed upload helper missing`.

CI existente foi inspecionado, não repetido pela QA. PASS de CI não equivale a teste físico no Sale Smartly.

## Bloqueador de cutover da candidata #161

A #161 melhora a linha Normal:
- API do cliente passa a ser derivada de projeto e função de produção, em vez de beta10.
- O servidor exige token de convite no primeiro setup.
- A emissão usa rate limit distribuído de cinco convites por administrador a cada 900 segundos.
- A limpeza do chat exige papel administrativo persistido, não apenas o nome.

Mas o corte ainda não é seguro:

1. `release.json` continua em **3.4.7**, igual ao Normal instalado.
2. O workflow de produção aceita somente versão estável exatamente 3.4.7.
3. O workflow publica somente a Edge Function `upstatus`; não aplica migrations.
4. O servidor candidato chama `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`.
5. Produção não possui essas RPCs nem as colunas `setup_token_*`.

Logo, não despachar o workflow nem fazer cutover. É necessário versionamento superior ao instalado, migration revisada/aprovada, ambiente isolado completo e validação HTTP antes de qualquer publicação. A versão igual também não garante que gerenciadores de userscript substituam automaticamente o artefato instalado.

## Workflows Normal e Team Lite

- O workflow candidato Normal fixa Supabase CLI 2.122.1, exige ref master, SHA exato e project ID de produção. Porém permite somente `release.json.version === 3.4.7` e publica apenas `upstatus`. Não coordena a migration AUTH-03.
- O workflow `.github/workflows/deploy-production.yml` da branch `team-lite-official` usa CLI `latest`, projeto vindo do secret genérico e publica `upstatus`, não `upstatus-team-lite`. **Não despachar esse workflow.**
- `team-lite-candidate.yml` da #76 é CI, não deploy de produção. Usa o laboratório allowlisted e guarda de mutação.
- A branch oficial não tem um pipeline de publicação Team Lite dedicado, seguro e comprovado.

## Runtimes Edge Functions implantados

| Função | Versão Edge | Versão interna do produto | verify_jwt |
|---|---:|---|---|
| `upstatus` | 480 | Normal 3.4.7 | false |
| `upstatus-team-lite` | 15 | Team Lite 3.4.30 | false |
| `upstatus-screen-share-3-1-1-beta10` | 6 | API 3.1.1-beta8 | false |
| `upstatus-test` | 281 | TEST 3.3.28 | false |

Produção tem 38 Edge Functions e todas reportam `verify_jwt=false`. Isso não prova, isoladamente, que todas sejam exploráveis: cada rota precisa validar sua própria sessão/autorização. A inspeção confirmou que as funções Normal/Team Lite implantadas ainda preservam setup legado e autorização nominal em algumas rotas.

A função `upstatus-signal-test` v32 existe somente no laboratório. Não existe endpoint server-mediated equivalente na lista de produção.

## Logs de disponibilidade

Consulta read-only de Edge Function logs em produção, de 17/11 11:33 UTC a 12:33 UTC:

| Rota | HTTP 402 |
|---|---:|
| `/api/chat` | 3.250 |
| `/api/status` | 1.399 |
| `/api/remote-status` | 1.399 |
| `/api/account` | 11 |
| `/api/members` | 5 |
| `/api/me` | 5 |
| **Total observado** | **6.069** |

Primeiro registro: 11:49:33 UTC. Último: 12:32:59 UTC. Todos os 6.069 registros agregados nesta janela foram HTTP 402. A causa específica em produção não foi determinada.

No laboratório, o CI e os logs confirmam `exceed_edge_functions_invocations_quota`. O projeto está ativo, mas a quota bloqueia a integração real.

A organização possui dois projetos: produção e laboratório de segurança/sinalização. Não existe Full-Product TEST independente.

## AUTH-03: produção versus laboratório

Consulta SQL SELECT-only:

| Recurso | Produção | Laboratório |
|---|---:|---:|
| Migrations | 7 | 39 |
| Colunas `setup_token_*` em users | 0 | 4 |
| `consume_upstatus_setup_invite` | ausente | presente |
| `consume_upstatus_setup_invite_rate_limit` | ausente | presente |
| Usuários | 5 | 0 |

As duas RPCs do laboratório são SECURITY INVOKER, têm `search_path` vazio e EXECUTE somente para `service_role`. Produção não tem os objetos necessários à candidata #161. O cutover quebraria o primeiro setup/emissão de convites se o servidor candidato fosse publicado sem uma migration aprovada e validada.

## Realtime, RLS, grants e SECURITY DEFINER

### Realtime de produção

- `realtime.messages`: RLS habilitado, FORCE RLS desligado, zero policies, sete partições.
- anon e authenticated possuem SELECT/INSERT/UPDATE efetivos.
- 106 registros consultados, todos `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Distribuição: 72 `user_status`, 26 `db_change`, 4 `remote_command`, 4 `remote_result`.
- Os clientes instalados Normal e Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`. O tópico não coincide com o dos triggers.

### Bundles instalados

Os userscripts foram decodificados diretamente dos bundles implantados:

- Normal 3.4.7 usa API beta10, tópico Realtime beta10, canal público e handlers que executam `remote_command` diretamente.
- Team Lite 3.4.30 também usa tópico beta10 e canal público. A checagem de sessão local não autentica o remetente do broadcast.
- Ambos recebem ofertas de voz/tela por broadcasts públicos e validam principalmente estrutura/campos do payload, não identidade e membership emitidas pelo servidor.

Nos candidatos, o comando remoto foi melhorado para usar o broadcast como aviso e fazer polling autenticado. Porém `signaling_transport_enabled` default é false, endpoint é vazio e o fallback público de chamada/voz/tela permanece quando o transporte não é habilitado. O endpoint server-mediated está apenas no laboratório.

Não foi realizada exploração, injeção de oferta/ICE ou captura de áudio/tela. A configuração de Dashboard `Allow public access` não está exposta no conector. O risco de confiança em eventos públicos está confirmado estaticamente; a exploração externa não foi reproduzida.

### RLS, grants e funções

Produção:
- Dez tabelas públicas com RLS e zero policies.
- Nove tabelas com grants amplos para anon/authenticated, incluindo CRUD e TRUNCATE; 18 grants TRUNCATE.
- Três funções SECURITY DEFINER de broadcast, todas `search_path=public`, retorno `trigger`, cada uma ligada a um trigger e EXECUTE concedido a anon/authenticated.
- Security Advisor: três WARN de execução SECURITY DEFINER para anon e três para authenticated.
- `upstatus_broadcast_messages` serializa a linha inteira com `to_jsonb(OLD/NEW)` e publica `db_change` em canal público.
- `upstatus_broadcast_remote_state` publica metadados de comandos/resultados.
- `upstatus_broadcast_users` publica estado do usuário.

As funções SECURITY DEFINER retornam trigger e estão ligadas a triggers; não foi demonstrada chamada direta por RPC. Os grants são excessivos e o payload público é o risco concreto.

Storage de produção:
- `chat-images`: público, 168 objetos.
- `profile-images`: público, 20 objetos.
- Dois buckets públicos, zero policies próprias em `storage.objects`.
- Limite de 20 MiB em ambos.

Default ACLs de produção continuam amplas em public, storage e schemas GraphQL. O laboratório melhorou grants diretos de tabelas e não tem WARN no Security Advisor, mas ainda mantém default ACLs amplas de owners `supabase_admin` em schemas expostos e grants anon/authenticated em Realtime/Storage.

## Migrations e Issues

- Branch gerenciada Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Produção tem sete migrations; laboratório tem 39.
- PR #176 recupera quatro statements do ledger de produção. O próprio PR declara que isso não prova recuperação byte-idêntica dos arquivos originais e que nenhum replay foi executado. Validate continua falhando.
- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos aprovados. Nenhuma comprovação de queda real de internet e reconexão sem F5, microfone/tela com permissões reais ou interoperabilidade instalada.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados, 19 pendentes. Um único comentário QA foi atualizado; comentário da Engenharia preservado.

## Gates

| Gate | Estado QA | Evidência |
|---|---|---|
| RT-01 | **blocked** | 106 mensagens públicas, zero policies e tópico incompatível |
| TEST-ISOLATION | **blocked** | dois projetos; laboratório de sinalização bloqueado por quota; sem Full-Product TEST |
| MIGRATION-PROVENANCE | **in_progress** | quatro statements recuperados do ledger, sem prova byte-idêntica nem replay isolado |
| AUTH-03 | **blocked** | produção sem colunas/RPCs exigidas pela candidata |
| ACL-STORAGE | **blocked** | grants, default ACLs e buckets públicos sem policies próprias |
| RECONNECT | **pending** | Issue #78 continua 0/8 físico |
| HUMAN-REVIEW | **pending** | nenhuma review humana nem autorização de release |

## Próximas ações

1. Proprietário/admin Supabase: revisar Usage/Billing e spend cap do laboratório e confirmar `Allow public access` no Dashboard Realtime. Apenas verificar; não alterar flags durante esta auditoria.
2. Diagnosticar os 402 de produção separadamente da quota do laboratório.
3. Criar Full-Product TEST independente e restaurar quota do laboratório.
4. Revisar e aprovar migrations AUTH-03; validar RPCs por HTTP no ambiente isolado antes de qualquer cutover.
5. Tornar a sinalização server-mediated o padrão e remover listeners públicos sensíveis em Normal e Team Lite.
6. Coordenar versão Normal superior a 3.4.7, API, artefato e workflow; criar deploy Team Lite próprio com slug, projeto, SHA e CLI pinados.
7. Corrigir RLS/grants/default ACLs/Storage com owner autorizado e política explícita de privacidade.
8. Diagnosticar `MIGRATIONS_FAILED`, obter reviews humanas e executar os oito testes físicos da #78.

## Limites desta execução

Nenhum teste manual, teste de navegador ou teste de reconexão foi executado pela QA. Os resultados de CI foram inspecionados, não repetidos. Nenhuma exploração foi realizada. Nenhum deploy, merge, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi executada. Todas as consultas SQL foram SELECT-only.
