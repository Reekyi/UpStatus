# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-12 04:32 UTC  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório isolado `bfpjtfqlnypisxljoxkb`.  
**Resultado:** **NOT READY**.  
**Método:** inspeção read-only de refs, PRs, diffs, workflows e logs já existentes; leitura integral do checkpoint `docs/RELEASE_READINESS.md` (8.410 linhas, blob `7cfbd70886df42ce790c078c224b19284a632595`); consultas SQL SELECT-only; leitura dos bundles Edge Function e decodificação local dos userscripts embutidos. Nenhum workflow foi disparado novamente. Nenhum teste manual foi executado.

## 1. Resumo executivo

Bloqueadores prioritários observados:

1. **Comandos remotos continuam executáveis a partir de broadcasts públicos nos dois userscripts instalados.** Normal v480 executa diretamente o payload de `remote_command`; Team Lite v15 também executa o payload após verificar somente a própria sessão local. Essa verificação não autentica o emissor do broadcast.
2. **Realtime de produção continua público e desalinhado.** Os 109 registros observados são `private=false`, todos no tópico legado. Os dois clientes instalados assinam o tópico beta10. Os triggers SQL continuam SECURITY DEFINER e publicam no tópico legado.
3. **AUTH-03 não está implantado em produção.** O runtime Normal e Team Lite ainda expõe `POST /api/setup → login(req,true)`; o servidor mantém fallback de promoção administrativa por nomes fixos quando papel/senha estão ausentes. As cinco contas atuais estão configuradas, então o risco de promoção por nome é latente, não uma conta atual desconfigurada.
4. **O workflow oficial Team Lite ainda pode despachar o slug Normal.** Usa CLI `latest` e `supabase functions deploy upstatus`; a função correta do produto é `upstatus-team-lite`. A PR #129 propõe desativar o workflow legado, mas permanece Draft.
5. **O Validate completo da QA continua falhando.** A causa desta execução foi confirmada no log: `production updateURL mismatch`. A PR #147 passou somente um teste direcionado e foi testada contra uma base QA anterior à atual.
6. **A publicação Normal continua fragmentada.** A correção de comandos #146 e o dispatcher #143 estão divergentes; o dispatcher ainda contém o handler antigo.

## 2. Heads reais e estado das PRs

Refs confirmadas por GitHub API/PR metadata:

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` (#82) | `59ce7f6326068f5b6ff2886fc48eeb8e66311583` |
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` |
| #82 QA | `59ce7f6326068f5b6ff2886fc48eeb8e66311583` |
| #131 Normal AUTH-03 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| #143 dispatcher | `c4a04fa755b877bc76b1372170a26e7b974264e6` |
| #146 remote-command recovery | `71c5ce2f730ade8ee3e8b090498202933809ce5c` |
| #147 QA updater candidate | `e6c1b740d3f3b2b5c05fcc603f7420e1c131aea3` |

Comparações:
- QA está 240 commits à frente e 1 atrás de master.
- `team-lite-official` está divergida de master: 220 commits à frente e 147 atrás.
- #146 em relação à #143: 10 commits à frente e 15 atrás.
- PRs #74, #75, #76, #82, #129 e #147 estão abertas/Draft; nenhuma foi mesclada.
- Reviews humanas: zero reviews registradas nas PRs #74, #75, #76, #82, #129 e #147.

Branch protection:
- `master`: `protected=false`, checks obrigatórios desligados.
- `team-lite-official`: `protected=false`, checks obrigatórios desligados.
- Rulesets do repositório: lista vazia.
- A consulta direta de proteção da branch QA não foi resolvida pelo endpoint do conector por causa da barra no nome da branch; portanto, o estado clássico de proteção da QA não é afirmado.

## 3. CI — resultados ligados aos HEADs

| PR / ref | Evidência | Resultado |
|---|---|---|
| #74 Normal | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS / PASS no HEAD #74 |
| #75 baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico no HEAD inalterado |
| #76 Team Lite | [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) | PASS; log confirma 110/110 checks autenticados |
| #82 QA | [Validate 43149693812](https://github.com/Reekyi/UpStatus/actions/runs/43149693812) | FAIL no HEAD QA atual |
| #89 Normal enrollment | [Guard 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | PASS histórico |
| #131 Normal AUTH-03 | [Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | PASS; log confirma 136/136 checks autenticados |
| #141 | [Validate 43085700956](https://github.com/Reekyi/UpStatus/actions/runs/43085700956) | PASS histórico |
| #142 | [Candidate Validate 43085494740](https://github.com/Reekyi/UpStatus/actions/runs/43085494740) | PASS histórico |
| #143 | [Candidate Validate 43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347) | PASS do workflow de API candidata; não prova o Guard próprio como check de PR empilhada |
| #145 | [Validate 43100913884](https://github.com/Reekyi/UpStatus/actions/runs/43100913884) | PASS histórico |
| #146 | [Validate 43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) | PASS histórico |
| #147 | [QA Release Target Candidate 43147567694](https://github.com/Reekyi/UpStatus/actions/runs/43147567694) | PASS apenas no teste direcionado |

### #76 — evidência positiva de CI

O job #76 concluiu os contratos de build/TEST, isolamento, enrollment, rate limits, recuperação de sala/voz/tela e browser smoke. O log confirma:
- 110/110 verificações autenticadas.
- WebRTC de chamada e entrega de áudio.
- WebRTC de sala de voz.
- Entrega de vídeo de compartilhamento de tela.
- Rate limit distribuído de sinalização e emissão de convite.
- Consumo atômico de convite.
- Polling remoto após `SUBSCRIBED`, coalescência de hints, cooldown e rejeição de sessão obsoleta.
- Limpeza dos fixtures do projeto isolado.

É CI automatizado em ambiente isolado; não é teste físico no Tampermonkey.

### #82 — falha atual confirmada

O job `validate` falhou no passo `Validate build`:

`VALIDATION FAILED: production updateURL mismatch`

O log aponta `scripts/validate.mjs:26`. Não houve rerun.

### #147 — escopo e frescor da evidência

O workflow da #147 executa `node --check` e `scripts/test-qa-release-target.mjs`; não executa o Validate completo do produto. O log confirma que o teste direcionado passou.

O merge commit testado foi `5e155941e7fa36147096268bfe92b6364dc488b9`, combinando o HEAD #147 com a base QA `6b9aba1c4ec96a8e8472343bfbc0221636b1c872`. A QA atual já está em `59ce7f6326068f5b6ff2886fc48eeb8e66311583`. Portanto, a validação direcionada não cobre a base QA atual.

## 4. Build/updater QA e PR #147

Na QA atual:
- `release.json` já declara `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js`.
- `scripts/build.mjs` ignora `release.json.scriptUrl` e constrói `updateURL` a partir do endpoint beta10.
- `scripts/validate.mjs` exige que o artefato PROD contenha `/upstatus/upstatus.user.js`.

A PR #147 altera `scripts/build.mjs` para usar `release.scriptUrl` e ajusta o validator. É uma correção candidata coerente, mas o workflow executado foi apenas o teste direcionado, não a suíte completa no HEAD QA atual.

### Autorização administrativa — falha não coberta pela #147

A PR #147 remove o atalho visual de exclusão por nome no userscript. Entretanto:
- A PR #147 não altera `src/server/index.template.ts`.
- O teste `scripts/test-qa-release-target.mjs` verifica o template do userscript; não lê nem testa o template do servidor.
- O servidor atual da QA e o bundle Normal implantado ainda contêm:
  `const role=a.role||(["Ricardo","Lohan","Guilherme"].includes(name)?"implementation_admin":"implementation_user")`
- `POST /api/setup` continua chamando `login(req,true)` sem exigir `setupToken`.

A consulta read-only de produção encontrou 5 contas, 0 sem senha, 0 sem papel e 3 com papel administrativo. O risco é latente para uma conta privilegiada sem senha/papel, ou reprovisionada; não foi encontrada conta atual incompleta.

Em contraste, os templates de servidor das candidatas Normal #131 e Team Lite #76 consomem `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`. Essa implementação não está na API #147.

## 5. AUTH-03 — paridade candidata, produção ausente

Paridade dos artefatos Normal #131 / Team Lite #76 confirmada por Git blob SHA:
- Migration `20261109230000_setup_invite_rate_limit.sql`: `ab73b5cd8200147a449327d21798eef588834d50`.
- Teste correspondente: `bd12f37dc464c3b1ab322494914d0763fa733d49`.

Produção:
- 0 colunas `setup_token_*` em `public.users`.
- Tabela de rate limit de convite ausente.
- RPC `consume_upstatus_setup_invite` ausente.
- RPC `consume_upstatus_setup_invite_rate_limit` ausente.
- 5 contas configuradas; 3 papéis administrativos.

Laboratório:
- Quatro colunas de setup token em `public.users`.
- `upstatus_setup_invite_rate_limits` presente.
- Duas RPCs presentes.
- Ambas SECURITY INVOKER, `search_path=""`, EXECUTE negado a anon/authenticated e permitido a service_role.
- Tabela de rate limit sem fixtures após os testes.

## 6. Bundles instalados e Realtime

Edge Functions de produção:
- 38 funções ACTIVE; todas reportam `verify_jwt=false`. Isso não prova ausência de autenticação por si só: os handlers principais implementam sessão customizada, mas cada rota precisa ser auditada individualmente.
- Normal `upstatus`: v480.
- Team Lite `upstatus-team-lite`: v15.
- API beta10 `upstatus-screen-share-3-1-1-beta10`: v6.
- Não existe função de produção `upstatus-signal`.

Laboratório:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.

Os userscripts embutidos nos runtimes instalados foram decodificados:
- Normal v480 recebe `remote_command` e chama `executeRemoteCommand(c)` diretamente quando o target coincide.
- Team Lite v15 verifica `isAuthenticated()`, geração e membro locais, mas depois executa o payload do broadcast; isso não autentica o emissor.
- Ambos processam `call_signal`, eventos de sala de voz e eventos de screen-share pelo canal público.

As candidatas #146 Normal e #76 Team Lite tratam `remote_command`/ `remote_result` como hints e recuperam comandos/resultados por APIs autenticadas. O dispatcher #143 ainda contém o handler antigo. A comparação #143↔#146 é divergida: #146 está 10 commits à frente e 15 atrás.

A #146 não torna voz/tela server-mediated. A Team Lite #76 ainda inicia com `signaling_transport_enabled=false` e endpoint vazio; o fallback público permanece ativo quando não configurado.

### Estado Realtime no banco

Consulta read-only em `realtime.messages`:
- 109 linhas.
- 109 com `private=false`.
- Um único tópico: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- RLS ligado, FORCE RLS desligado, zero policies.
- Seis linhas de grants diretos para anon/authenticated em `realtime.messages`.

Os dois clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`, diferente do tópico dos triggers.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users`:
- SECURITY DEFINER.
- `search_path=public`.
- EXECUTE efetivo para anon e authenticated.
- Retornam trigger e são chamadas por triggers; não foi feita chamada RPC direta.
- `upstatus_broadcast_messages` publica `to_jsonb(OLD/NEW)` completo em `db_change`, com `private=false`.
- Os outros triggers publicam status e metadados de comandos/resultados no tópico público.

## 7. RLS, grants, ACL e Storage

Produção:
- 10 tabelas `public` com RLS e sem policies.
- 126 linhas de grants diretos para anon/authenticated em `public`.
- 18 linhas de grants TRUNCATE para papéis clientes.
- 120 itens Default ACL expandidos para anon/authenticated.
- 300 entradas expandidas de ACL no total.
- Dois buckets públicos: `chat-images` e `profile-images`, ambos com limite 20 MiB.
- Zero policies próprias em `storage.objects`.
- 188 objetos Storage.
- 296 mensagens; 296 com `file_name` nulo.

Security Advisor de produção observado em 2026-11-12 04:30 UTC:
- 3 WARN para anon: funções SECURITY DEFINER executáveis.
- 3 WARN para authenticated: as mesmas funções.
- 10 INFO de RLS ligado sem policy.
- Performance e Health Advisors sem findings.

Laboratório:
- 18 tabelas públicas com RLS e sem policies.
- Zero grants diretos de tabela para anon/authenticated em `public`.
- Zero linhas Realtime.
- Zero buckets Storage.
- Zero fixtures nas 12 tabelas consultadas (users, messages, sessions, state, signal events/rooms/members, call/voice attempts e rate limits).
- Security Advisor: 18 INFO de RLS sem policy, sem WARN de SECURITY DEFINER.
- Performance Advisor: 5 INFO de índices não utilizados; não remover índices somente por isso.

## 8. Migrations, projetos e branches Supabase

Projetos existentes: somente dois.
- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Migrations:
- Produção: 7.
- Laboratório: 39.
- Quatro SQLs históricos continuam sem arquivo original byte a byte em master; o dispatcher identifica fontes ledger-recovered-only e falha fechado.
- A migration AUTH-03 de rate limit ainda não consta no histórico de produção.
- Branch Supabase `main`: `MIGRATIONS_FAILED`; preview: `ACTIVE_HEALTHY`.

O laboratório está isolado e limpo, mas não existe um terceiro projeto full-product TEST. O slug `upstatus-test` continua no projeto de produção; não deve ser tratado como ambiente isolado equivalente.

## 9. Workflows de publicação

### Team Lite oficial

O workflow em `team-lite-official/.github/workflows/deploy-production.yml`:
- `workflow_dispatch`.
- Carrega secrets de produção.
- Instala Supabase CLI `latest`.
- Executa `supabase functions deploy upstatus`, slug do Normal, não `upstatus-team-lite`.
- Não valida SHA/projeto/migrations de forma suficiente.

A PR #129 (head `f48a2d9`) substitui o workflow por um guard fail-closed, sem secrets e sem capacidade de deploy. Seu CI [42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545) passou. A PR continua Draft e não foi incorporada à branch oficial. Não despachar o workflow atual.

### Dispatcher Normal #143

O workflow do dispatcher filtra `pull_request.branches: [master]`, mas a PR #143 tem base #142. Como o filtro se aplica à branch-base, o Guard próprio não é executado como check de PR para a PR empilhada. O Validate de API candidato que passou não substitui esse Guard.

O template de #143 ainda contém execução direta do payload `remote_command`; #146 contém a correção por hints autenticados, mas está divergida.

## 10. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN com os oito critérios físicos desmarcados.
- Nenhum teste manual foi executado nesta auditoria: sem perda real de internet, reentrada em sala, microfone, screen capture ou interoperabilidade instalada Normal↔Team Lite.
- Os testes Playwright/WebRTC dos workflows são CI automatizado e não fecham a aceitação física.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) mantém o comentário dedicado QA separado do comentário da Engenharia.

## 11. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcasts públicos, tópicos divergentes, triggers SECURITY DEFINER e voz/tela sem transporte autenticado default |
| TEST-ISOLATION | BLOCKED | Laboratório isolado e limpo, mas sem terceiro projeto full-product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais ausentes; AUTH-03 ainda fora do manifesto/produção |
| AUTH-03 | IN_PROGRESS | Candidatas Normal/Team Lite passam, mas runtime/API de produção não usa convites e rate limit |
| ACL-STORAGE | BLOCKED | Grants, TRUNCATE, Default ACL e Storage público sem policies |
| RECONNECT | PENDING | Sem aceitação física sem F5 confirmada |
| HUMAN-REVIEW | PENDING | PRs Draft e zero reviews humanas; sem autorização explícita |

## 12. Próximos passos recomendados

1. Remover do servidor o fallback administrativo por nome e exigir convite tokenizado no primeiro setup.
2. Reconciliar AUTH-03 completo entre Normal #131 e Team Lite #76, sem perder rate limit na API final.
3. Integrar #146 ao dispatcher #143 e fazer o Guard executar no evento PR da base real.
4. Implementar e validar transporte server-mediated de voz/tela antes de torná-lo padrão; alinhar tópicos e remover listeners públicos sensíveis.
5. Bloquear o workflow Team Lite legado até a PR #129 ser revisada e incorporada; o destino futuro deve ser `upstatus-team-lite`, com CLI pinada, projeto e SHA verificados.
6. Recuperar os quatro SQLs originais e incluir AUTH-03 no manifesto.
7. Endurecer grants/Default ACL com owner autorizado e decidir a política de privacidade do Storage.
8. Criar ambiente full-product TEST e corrigir build/Validate da QA sem remover assertions.
9. Executar os oito critérios físicos da #78 e obter aprovação humana explícita.

## 13. Limites e segurança desta execução

- GitHub e Supabase foram usados somente para leitura, exceto a criação deste arquivo documental na branch QA e a atualização do comentário QA existente na Issue #79.
- Todas as consultas SQL foram SELECT-only.
- Nenhum teste foi rerun; foram inspecionados logs de runs já concluídos.
- Nenhum navegador/Tampermonkey físico foi utilizado.
- Nenhuma produção foi alterada.
- Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi executada.
- `docs/RELEASE_READINESS.md` foi preservado. O arquivo contém 8.410 linhas; a última seção de auditoria interna ainda é de 2026-11-08 18:30 UTC, portanto o checkpoint é histórico e precisa ser complementado por esta revalidação.
