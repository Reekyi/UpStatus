# Auditoria independente de qualidade do UpStatus — 2026-11-12 10:43 UTC

## Veredito

**NOT READY.** Há candidatas com CI forte e correções importantes, mas os runtimes implantados continuam antigos, o transporte de voz/tela permanece público, o fluxo de primeiro acesso de produção não exige convite, os privilégios e Default ACLs são excessivos, e a publicação Team Lite oficial ainda aponta para o runtime Normal.

Esta execução foi somente de leitura em GitHub e Supabase. A única escrita foi este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.

## 1. Escopo e método

- Repositório: `Reekyi/UpStatus`.
- Projetos Supabase: produção `dlfvkawaiqduhlazsszm`; laboratório isolado `bfpjtfqlnypisxljoxkb`.
- Revisados: PRs #74, #75, #76, #82 e candidatas relacionadas #125–#151; Issues #78 e #79; heads, comparações, workflows, logs, templates e bundles implantados.
- Consultas PostgreSQL executadas somente com SELECT e leitura de catálogos. Não houve INSERT, UPDATE, DELETE, DDL, migration, mutação de fixture ou chamada de RPC.
- CI citado abaixo é automação executada pelo GitHub Actions. Não equivale a teste manual em Tampermonkey, microfone físico, captura real de tela ou perda real de internet.
- Não houve exploração externa nem envio de broadcasts de teste à produção.

## 2. Heads reais e divergência

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `2d8ac611a29005fe100e8b4c29a2dd038b811580` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `chore/continuity-foundation` (#74 base) | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| `team-lite/signaling-transport-candidate` (#76 base) | `c4dee8d2c502499de5f95932ac14a90cffb56196` |
| `fix/qa-release-script-url-20261112` (#147) | `fdc727d072008b064fb8f3c4af52067c5da15111` |
| `fix/qa-admin-role-reconciled-20261112` (#151) | `60b686aefc1e5ae01197a8be8c7956ef9cc56bd3` |
| `fix/team-lite-call-source-provenance-20261112` (#149) | `77352d2e3b93722d6b69a9eec31a92bb63158230` |
| `recovery/migration-ledger-statements-20261110` (#135) | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` |

Comparações atuais:

- QA está **247 commits à frente e 1 atrás** de master.
- A branch #74 (`chore/continuity-foundation`) está **883 commits à frente e 1 atrás** de master.
- A candidata Team Lite está **384 commits à frente e 0 atrás** de `team-lite-official`.
- A branch #147 está **16 commits à frente e 10 atrás** da QA atual.
- #151 está 5 commits à frente de #147.
- #133 está 14 commits à frente de sua base #74.
- #149 está 10 commits à frente de sua base #76.

Não fiz rebase nem merge. As candidatas que passaram CI não estão automaticamente validadas contra o HEAD atual da QA ou master.

O endpoint de rulesets retornou lista vazia. A leitura dos endpoints de branch protection retornou HTTP 403 por falta de permissão da integração; portanto, não afirmo nesta rodada que a proteção individual das branches foi verificada.

## 3. Documento de release readiness

`docs/RELEASE_READINESS.md` foi recuperado via Git blob e lido integralmente:

- 8.410 linhas.
- Blob SHA `7cfbd70886df42ce790c078c224b19284a632595`.
- Última seção: **2026-11-08 15:30 BRT / 18:30 UTC**.

O documento está desatualizado em relação às candidatas #133, #147, #149 e #151, à recuperação documental #135 e aos heads atuais. Foi preservado sem sobrescrita; este relatório é um arquivo novo.

## 4. PRs prioritárias e CI

| PR | Estado | Evidência atual |
|---|---|---|
| #74 Normal | Draft; CI aprovado | Validate #42753434411 e Signaling Smoke #42753434336, checkout do merge ref `0e50a13` |
| #75 Team Lite baseline | Draft; PASS histórico | Candidate Checks #41674353127; não substitui a candidata #76 |
| #76 Team Lite | Draft; PASS | 16/16 não autenticados e 110/110 autenticados em #43124413080, merge ref `69319de` |
| #82 QA | Draft; FAIL | Validate #43193876216, erro `production updateURL mismatch` |
| #147 updater/chat | Draft; full Validate PASS | #43176202190 |
| #149 origem autenticada de chamadas | Draft; PASS | 16/16 não autenticados e 110/110 autenticados em #43173176232 |
| #151 role/admin + release target | Draft; full Validate PASS | #43196245858, job completo e regressões de chat aprovadas |

### Correção de classificação sobre #151

O workflow atual de #151 **inclui** `node scripts/validate.mjs`. O run #43196245858 concluiu com sucesso os passos:

1. Syntax check.
2. Contratos direcionados de release target e autorização.
3. Build offline completo e regressões de chat.

O log registra `QA release target, updater-channel and chat-role contracts PASS` e regressões de composer, link cards, screen sharing, speaker mute, sender colors, notifications e unread indicators.

Portanto, a classificação anterior de que #151 executava somente o teste direcionado estava desatualizada. O PASS é real, mas ocorreu no merge ref `38d7cd8` de #151 sobre a base candidata #147 (`fdc727d`), não no HEAD atual da QA. A PR permanece Draft.

### Normal: candidatas que precisam ser reconciliadas

A #133 é uma candidata Normal mais completa em autenticação e sinalização:

- Baseia-se no HEAD #74 `fb878537`.
- Seu servidor exige token hexadecimal de primeiro acesso e chama `consume_upstatus_setup_invite`.
- Inclui rate limit de emissão de convites.
- Não contém fallback de administrador por nome.
- Health e limpeza do chat verificam papel administrativo persistido.
- Move a proveniência de sinalização para fora do payload público.
- Alinha o alvo da API Normal com o runtime de distribuição.
- Validate #42804903827 e Signaling Smoke #42804903887 passaram; o log do Smoke confirma 136/136, WebRTC de chamada/voz/tela e rate limit 90 aceitas + 1 rejeitada HTTP 429.

A #151, por outro lado, traz a linha de updater/chat e a correção explícita `const role=a.role||"implementation_user"`, mas seu template **não contém** `setup_token_*` nem `consume_upstatus_setup_invite`. O primeiro setup continua sem convite obrigatório nesse ramo.

As duas linhas não são intercambiáveis. É necessário reconciliar #133 com #147/#151, preservar AUTH-03 e a autorização por papel, e executar Validate + Smoke no mesmo HEAD integrado.

### Team Lite

A #149 é filha da base atual #76 e passou 16/16 + 110/110, incluindo:

- Origem autenticada passada fora do payload.
- Broadcast público sempre classificado como não autenticado.
- Allowlist de descoberta pública limitada a `presence` e `ended`.
- Evento público `ended` não encerra uma chamada ativa.
- Áudio de chamada e sala de voz, vídeo de compartilhamento de tela e mesh de três participantes.
- Rate limit 90 + 1 HTTP 429 e rate limit distribuído de convites.

Limitação: `signaling_transport_enabled` continua `false` por padrão. O transporte autenticado permanece opt-in; a proteção não está ativa por padrão no candidato.

## 5. Produção: bundles realmente implantados

Os bundles foram lidos da Management API e os userscripts embutidos em `USERSCRIPT_BASE64` foram decodificados localmente para inspeção.

| Runtime | Versão da Edge Function | Userscript embutido | Source SHA |
|---|---:|---:|---|
| `upstatus` | v480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | v15 | 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | API auxiliar | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

Achados confirmados nos bundles Normal e Team Lite:

- Ambos ainda assinam Realtime sem `private:true` e sem `realtime.setAuth()`.
- Ambos mantêm listeners públicos para `remote_command`, `call_signal`, voz e tela.
- Normal executa o comando recebido após checar o destinatário; Team Lite também verifica a própria sessão e geração, mas não autentica o emissor do broadcast.
- O transporte autenticado de chamadas/tela não está habilitado por padrão nos bundles instalados.
- O primeiro setup implantado continua sem convite obrigatório e contém fallback nominal para administrador quando o papel está vazio.

O trigger do banco publica no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os userscripts instalados contêm o tópico beta10 `upstatus-screen-share-live-3-1-1-beta10`. A divergência permanece.

A lista de produção contém 38 Edge Functions ativas, incluindo `upstatus-test` v281 e variantes de teste/backup dentro do próprio projeto de produção. O laboratório possui duas funções: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Todas as funções listadas reportam `verify_jwt=false`; isso não significa automaticamente ausência de autenticação, pois os handlers principais usam sessão própria, mas exige revisão individual de cada endpoint.

## 6. Realtime, RLS, grants e SECURITY DEFINER

Snapshot read-only de produção:

- `realtime.messages`: 109 registros, todos `private=false`, no tópico legado.
- Eventos: 40 `db_change`, 6 `remote_command`, 6 `remote_result`, 57 `user_status`.
- RLS habilitado, FORCE RLS desabilitado, zero policies; SELECT/INSERT/UPDATE concedidos a anon/authenticated.
- Dez tabelas public estão com RLS habilitado e sem policies; FORCE RLS está desabilitado nas dez.

As três funções de broadcast estão anexadas a triggers, retornam `trigger`, são SECURITY DEFINER, usam `search_path=public` e têm EXECUTE concedido a anon/authenticated:

- `upstatus_broadcast_messages`: envia `to_jsonb(OLD/NEW)` completo no evento `db_change`.
- `upstatus_broadcast_remote_state`: envia metadados de comando/resultado no tópico público.
- `upstatus_broadcast_users`: envia campos de presença do usuário.

O Security Advisor registra 3 WARN para anon e 3 para authenticated sobre EXECUTE em SECURITY DEFINER. Como as funções retornam `trigger`, não foi demonstrada nesta auditoria uma chamada RPC direta bem-sucedida; o achado comprovado é a concessão excessiva e a publicação de payloads em broadcast público.

### Grants e Default ACL

Nove tabelas public concedem TRUNCATE a anon e authenticated:

- `chat_reads`
- `messages`
- `reactions`
- `status_history`
- `upstatus_profiles`
- `upstatus_sessions`
- `upstatus_state`
- `upstatus_typing`
- `users`

RLS não protege TRUNCATE. Isso é uma concessão estrutural que deve ser revogada. As tabelas também têm grants amplos de DML/DDL auxiliar para os papéis clientes.

As Default ACLs em `public` concedem a anon/authenticated, para objetos futuros criados por `postgres` e `supabase_admin`, privilégios de INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN em tabelas; EXECUTE em funções; e SELECT/UPDATE/USAGE em sequências. Os papéis clientes não possuem CREATE no schema public, mas os defaults ainda afetam objetos criados pelos respectivos owners.

No laboratório, os grants atuais de tabela public para anon/authenticated estão mais restritos, porém as Default ACLs de `supabase_admin` em public ainda incluem DML, TRUNCATE, MAINTAIN e EXECUTE. O laboratório não deve ser considerado totalmente endurecido para futuras criações de objetos.

## 7. Storage e dados

Produção:

- Buckets `chat-images` e `profile-images` são públicos.
- Limite de 20 MiB por bucket.
- 168 objetos em `chat-images`; 20 em `profile-images`.
- Zero policies próprias em `storage.objects`.
- 296 mensagens; todas as 296 têm `file_name` nulo.

Buckets públicos tornam a leitura de objetos pública por desenho. A política de privacidade e o conjunto de permissões de escrita precisam ser definidos e testados explicitamente.

## 8. AUTH-03 e primeiro acesso

Produção:

- Cinco contas; papéis: 3 `implementation_admin`, 2 `implementation_user`.
- Nenhuma coluna `setup_token_*`.
- RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` ausentes.

Laboratório:

- Quatro colunas `setup_token_*`.
- As duas RPCs de convite/rate limit existem.
- As funções candidatas usam SECURITY INVOKER, search_path vazio e grants restritos a service_role.

O candidato Normal #133 e Team Lite #149 passaram nos testes de enrollment e rate limit em ambiente isolado. Produção continua no fluxo antigo. Não houve alteração de roles, senha ou configuração.

## 9. Migrations e proveniência

Produção tem 7 migrations; laboratório tem 39. O branch gerenciado Supabase `main` da produção está em `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

Quatro arquivos originais continuam ausentes de `supabase/migrations` em master:

1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

Progresso parcial:

- #127 adiciona manifest com blob hashes para as três migrations originais que existem no repositório e falha fechado para as quatro ausentes.
- #135 arquiva em `docs/migration-recovery/` os quatro statements recuperados de `supabase_migrations.schema_migrations`.
- Comparei os quatro textos arquivados com os quatro registros retornados por SELECT no ledger de produção; o texto dos statements corresponde exatamente.
- Cada registro contém um statement e rollback NULL. O ledger não comprova o arquivo original byte a byte, comentários, formatação ou commit Git de origem.
- Os arquivos da #135 ficam fora de `supabase/migrations` e não devem ser aplicados nem usados como substitutos dos originais sem decisão formal.

A #126 verifica saúde do branch gerenciado e presença de todas as fontes locais; #127 acrescenta hash de conteúdo para as fontes existentes. O preflight continua corretamente bloqueado pelo estado `MIGRATIONS_FAILED` e pelas quatro fontes originais ausentes.

## 10. Workflows de publicação Team Lite

O workflow atualmente presente em `team-lite-official` ainda usa CLI `latest` e executa:

```bash
supabase functions deploy upstatus
```

O slug correto do Team Lite é `upstatus-team-lite`. Não executar o workflow atual.

Há candidatos de segurança, todos Draft:

- #125: dispatcher no branch default, manual-only, SHA exato de `team-lite-official`, PR aprovada, versão exata, confirmação explícita default false, CLI 2.122.1 e um único comando para `upstatus-team-lite`. O run #42598656306 aprovou o offline guard; o job deploy foi skipped.
- #128: adiciona allowlist de revisores humanos via `UPSTATUS_RELEASE_REVIEWERS` e exige aprovação atual ligada ao SHA exato. O teste offline #42994078899 passou. A variável real não foi verificada nesta execução.
- #129: transforma o workflow legado em bloqueio fail-closed. Guard #42993962545 passou, mas a PR não foi incorporada à branch oficial.
- #126: preflight de saúde do branch `main` e reconciliação de migrations; teste offline #42598779957 passou.
- #127: guard de proveniência de conteúdo; #42615130073 passou.

Essas proteções são candidatas, não controles ativos no branch oficial.

## 11. Issue #78: aceitação manual

A Issue #78 continua sem aprovação dos oito critérios físicos. Os comentários mais recentes ainda são de 08/11 e reiteram que CI automatizado não substitui:

- Queda real de internet e recuperação sem F5.
- Reentrada em sala de voz.
- Nova chamada com microfone real.
- Compartilhamento de tela com permissões reais.
- Interoperabilidade instalada Normal ↔ Team Lite.

Nenhum desses testes físicos foi executado nesta rodada.

## 12. Control Center e gates

A Issue #79 mantém um único comentário QA identificado por `<!-- UPCONTROL:QA -->`; o comentário da Engenharia foi preservado. O JSON dedicado foi atualizado com checkpoints e feed desta execução.

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcasts públicos, tópico divergente e transporte autenticado opt-in |
| TEST-ISOLATION | done | Laboratório isolado; 18 tabelas, Realtime e Storage vazios |
| MIGRATION-PROVENANCE | in_progress | Statements do ledger recuperados, mas não os arquivos originais |
| AUTH-03 | in_progress | Candidatos Normal/Team Lite passam CI; produção ainda não possui convite/rate limit |
| ACL-STORAGE | blocked | Grants TRUNCATE, Default ACLs amplas e buckets públicos |
| RECONNECT | pending | Sem confirmação dos testes físicos sem F5 |
| HUMAN-REVIEW | pending | Sem aprovação humana e autorização explícita de release |

## 13. Próximos passos recomendados

1. Reconciliar #133 com #147/#151 numa única linha Normal, preservando AUTH-03, papel administrativo persistido, updater e regressões de chat; revalidar no HEAD atual da QA.
2. Reconciliar #76/#149 e manter a sinalização autenticada desligada até existir endpoint de produção validado; depois torná-la padrão e retirar handlers públicos sensíveis.
3. Alinhar tópicos e reduzir broadcasts a hints não autoritativos; decidir se a solução final será Realtime privado com setAuth ou transporte server-mediated sem canal público sensível.
4. Revogar TRUNCATE e grants desnecessários; corrigir Default ACLs para postgres e supabase_admin; revisar SECURITY DEFINER e Storage.
5. Recuperar fontes originais das quatro migrations ou aprovar formalmente um baseline/reconciliation plan; manter o preflight bloqueado até lá.
6. Incorporar #125/#128/#129 e corrigir o workflow oficial Team Lite antes de qualquer dispatch.
7. Criar ambiente full-product TEST separado do laboratório de segurança.
8. Executar os oito critérios físicos da #78 e obter aprovação humana explícita.

## 14. Limites e segurança desta rodada

- Não houve merge, deploy, release, migration, publicação de userscript, alteração de secrets/flags, roles, grants, policies, ACLs ou fixtures.
- Todas as consultas SQL foram SELECT-only.
- Não foram realizados testes manuais de hardware, Tampermonkey ou perda real de conexão.
- A única alteração no repositório é este arquivo novo na branch QA. O documento principal foi preservado.
- A recomendação de release permanece **NOT READY**.
