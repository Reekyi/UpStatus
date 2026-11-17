# UpStatus — auditoria independente de QA
**Data:** 2026-11-11 16:35 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`

## Resumo executivo

**Recomendação: NOT READY.** Esta rodada foi read-only para GitHub e Supabase. Nenhum teste manual ou rerun foi iniciado pela QA. Os resultados de CI abaixo são execuções existentes, identificadas por SHA.

Novas confirmações relevantes:

1. Produção tem **91 eventos Realtime persistidos com `private=false`**, todos no tópico legado; os clientes atuais assinam outro tópico.
2. O projeto de laboratório está isolado e sem fixtures de aplicação, mas a organização tem somente dois projetos. Não existe um terceiro projeto full-product TEST.
3. AUTH-03 continua fragmentado: #131 passou no CI e implementa convite + rate limit de emissão, mas a API candidata #142 não contém esse fluxo. Produção continua sem tabelas/RPCs de convite.
4. A #143 está 13 commits à frente e 1 atrás do HEAD atual da #142. Seu preflight lista apenas as sete migrations históricas e não valida arquivos SQL locais ou hashes de proveniência.
5. #82 falhou no HEAD QA atual com `production updateURL mismatch`.
6. Branches `master`, QA e `team-lite-official` estão sem proteção; a consulta de rulesets retornou lista vazia.

## 1. Heads reais e integridade documental

Heads confirmados pela API de branches e metadados de PR:

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `c1a813a2dfea66c62616d801b18e5f9a155c665e` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| #76 | `4edfbf25476c7c751741b2e14c2c88fdc554f618` |
| #82 | `c1a813a2dfea66c62616d801b18e5f9a155c665e` |
| #131 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| #141 | `61d00fb8666f4ca91c5a3c52a415d877b31a10cf` |
| #142 | `f4b1a6dbccecf63152bf353fcaaadfcd41357e11` |
| #143 | `34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa` |

A comparação QA vs master retornou **224 commits à frente e 1 atrás**. Não fiz rebase. A QA permaneceu em `c1a813a2` durante a preparação deste relatório.

`docs/RELEASE_READINESS.md` existe na branch QA. O blob `7cfbd70886df42ce790c078c224b19284a632595` foi recuperado integralmente: 1.045.105 caracteres e 8.410 linhas. O último checkpoint dentro do documento é de 2026-11-08 18:30 UTC; portanto, ele está desatualizado em relação às revalidações de 11/11. O documento principal não foi alterado; este relatório é um arquivo novo.

### Proteção do repositório

A API de branches retornou `protected=false` para `master`, QA e `team-lite-official`. A consulta de `/rulesets` retornou `[]`. Não há checks obrigatórios impostos por proteção de branch nessas três referências.

## 2. PRs e CI nos SHAs consultados

| PR | Estado | Evidência no HEAD consultado | Observação |
|---|---|---|---|
| #74 Normal | Draft | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) PASS; Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS | O smoke marcou como `skipped` o harness e a etapa de rate limit de emissão de convites. |
| #75 Team Lite | Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico | #76 é descendente de #75, 321 commits à frente; #75 não é uma segunda candidata independente atual. |
| #76 Team Lite | Draft | Candidate Checks [42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) PASS | 110/110 verificações autenticadas; browser WebRTC de chamada, voz e tela; rate limit de sinalização e convite; concorrência de recibos e convites; cleanup. |
| #82 QA | Draft | Validate [43050765474](https://github.com/Reekyi/UpStatus/actions/runs/43050765474) FAIL | Log: `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs`. |
| #131 AUTH-03 Normal | Draft | Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) PASS | 136/136 verificações autenticadas; 19/19 não autenticadas; teste concorrente de emissão de convites e browser WebRTC. |
| #141 updater/chat | Draft | Validate [42936993580](https://github.com/Reekyi/UpStatus/actions/runs/42936993580) PASS | Separa URL de distribuição e endpoint da API; adiciona `file_name`, anexos staged e autorização administrativa por papel. |
| #142 API Normal | Draft | Nenhum run PR-triggered encontrado para o HEAD atual | O workflow filtra `pull_request.branches` pelo nome da própria branch de head, não pela base real da PR (#141). O push workflow não substitui um check de PR obrigatório. |
| #143 dispatcher | Draft | Validate [42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622) PASS | O Guard [42984657754](https://github.com/Reekyi/UpStatus/actions/runs/42984657754) é evidência anterior, não foi confirmado no HEAD atual #143. |

Nenhuma review humana foi retornada nas PRs #74, #75, #76, #82, #131, #141, #142 e #143. Todas permanecem Draft/abertas no estado consultado.

### 2.1 AUTH-03: #131 e #142 não estão reconciliadas

A #131 é um commit filho direto do HEAD #74 (1 à frente, 0 atrás). Seu template contém:

- Emissão de convite somente após sessão administrativa autenticada.
- Token aleatório de 256 bits, persistido como hash e com expiração de 15 minutos.
- Consumo único por RPC.
- Rate limit distribuído de cinco emissões por administrador em 15 minutos.
- HTTP 429 quando o limite é excedido e 503 se o limitador falha.
- RPC SECURITY INVOKER, `search_path` vazio e EXECUTE exclusivo de service_role.

O CI #131 passou 136/136 checks autenticados e executou o teste concorrente de 24 chamadas: cinco permitidas e 19 negadas.

Entretanto, a #142 deriva de #141 e não contém `issueSetupInvite`, `consume_upstatus_setup_invite` nem `consume_upstatus_setup_invite_rate_limit`. Seu `/api/setup` continua no fluxo antigo; `/api/account?name=` ainda calcula `needsSetup` a partir da conta. A #131 retorna `needsSetup:false` e exige `setupToken` no caminho de primeiro acesso.

A #131 também ainda contém uma condição nominal de Ricardo na rota de limpeza do chat, enquanto #141/#142 já usam o papel administrativo. Não fazer cherry-pick cego: reconciliar o enrollment da #131 com o template #142, preservando a autorização por papel da #142.

A candidata de rate limit protege **emissão de convites**, não tentativas de login. Não encontrei rate limit de login na #131, #142 ou nos runtimes implantados.

## 3. Dispatcher e publicação

A comparação de branches retornou #143 **13 commits à frente e 1 atrás** do HEAD atual da #142. O dispatcher precisa ser reconciliado antes de ser tratado como guard da API candidata atual.

A lista `REQUIRED_PRODUCTION_MIGRATIONS` em #143 contém somente as sete versões já registradas em produção. Não inclui `20261109230000_setup_invite_rate_limit`. Também não exige que cada migration remota tenha um arquivo SQL local correspondente nem confere hash/proveniência do arquivo.

`release.json` em master continua em **3.4.7**, igual à versão Normal servida. O dispatcher exige versão estável superior à versão atual, portanto não há nova versão liberável selecionada.

O workflow Team Lite em `team-lite-official` ainda executa `supabase functions deploy upstatus`, usa CLI `latest` e não contém validação explícita de projeto/SHA/migrations. O destino correto é `upstatus-team-lite`. A candidata de guard #129 não está integrada à branch oficial. **Não despachar o workflow oficial atual.**

## 4. Supabase — produção e laboratório

### 4.1 Projetos e migrations

A organização lista somente dois projetos:

| Projeto | Estado | Migrations | Edge Functions |
|---|---|---:|---:|
| Produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 7 | 38 |
| Laboratório `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 39 | 2 |

A branch gerenciada `main` do projeto de produção continua em `MIGRATIONS_FAILED`, embora o projeto e o preview reportem ACTIVE_HEALTHY.

Os quatro arquivos originais abaixo retornaram HTTP 404 na branch master:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #135 arquiva o texto dos statements recuperado de `supabase_migrations.schema_migrations`. Isso confirma o statement aplicado, mas não recupera o arquivo original byte a byte, comentários ou blob Git. Não reconstruir os originais por inferência.

### 4.2 Edge Functions e artefatos servidos

Produção:
- `upstatus` v480: userscript Normal 3.4.7.
- `upstatus-team-lite` v15: userscript Team Lite 3.4.30.
- `upstatus-screen-share-3-1-1-beta10` v6: runtime API Normal.
- `upstatus-test` v281: função TEST dentro do próprio projeto de produção.
- Nenhuma função `upstatus-signal` está implantada.

Laboratório:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.

Decodifiquei os userscripts servidos por Normal e Team Lite. Ambos usam o tópico `upstatus-screen-share-live-3-1-1-beta10`, criam `realtimeClient.channel(UP_REALTIME_TOPIC)` e não configuram `private:true` nem `setAuth()`. A função API beta10 v6 ainda embute um artefato beta8, com tópico beta8; esse endpoint não é o atual distribuidor principal Normal, mas é uma inconsistência de compatibilidade no runtime legado.

### 4.3 Realtime e triggers

Consulta SELECT em produção retornou **91 eventos**, todos `private=false`, no tópico legado:

| Evento | Linhas |
|---|---:|
| db_change | 35 |
| remote_command | 6 |
| remote_result | 6 |
| user_status | 44 |

Tópico dos triggers: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Não coincide com o tópico beta10 assinado pelos clientes.

`realtime.messages`:
- RLS habilitado, FORCE RLS desabilitado.
- Zero policies.
- anon e authenticated possuem SELECT, INSERT e UPDATE efetivos.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, `search_path=public`, e têm EXECUTE para anon/authenticated. Todas estão anexadas a triggers. A de mensagens envia `to_jsonb(OLD/NEW)` completo; a de estado remoto envia campos de comando/resultado; a de usuários envia nome/status/reason/sync. As funções retornam `trigger`; não foi demonstrada invocação RPC direta. O risco confirmado é o broadcast público e o payload transmitido, não uma exploração RPC reproduzida.

Security Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policies. Performance Advisor de produção: sem lints.

### 4.4 RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas públicas com RLS habilitado e zero policies.
- 9 tabelas públicas concedem sete privilégios diretos a cada um dos dois papéis clientes: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Total: **126 linhas de grants**.
- **120 entradas Default ACL** distribuídas entre public, storage, graphql e graphql_public, com defaults amplos para anon/authenticated; incluem MAINTAIN e TRUNCATE nos defaults de tabelas.
- Buckets `chat-images` e `profile-images` públicos, 20 MiB cada.
- Zero policies próprias em `storage.objects`.

A configuração candidata #142 declara chat-images público com 25 MB e profile-images público com 2 MB. A produção ainda limita ambos a 20 MiB. O handler legado de imagem aceita até 25 MiB, acima do limite efetivo do bucket.

A #142 também adiciona signed upload: o servidor valida MIME e tamanho declarados pelo cliente e gera URL assinada diretamente para o bucket público, sem inspecionar os bytes antes da publicação. O caminho legado `sniffMime()` retorna o MIME declarado quando não reconhece a assinatura dos bytes. Isso é CODE INSPECTION; não houve upload de arquivo ou exploração nesta auditoria.

### 4.5 Mensagens, contas e AUTH-03 implantado

Produção:
- 292 mensagens; cinco documentos; os cinco têm `file_name IS NULL`.
- Cinco usuários; todos têm password_hash e role preenchidos; nenhum usuário atual está sem senha/papel.
- Ausentes: tabela de convites, tabela de rate limit de convites, RPC de consumo de convite e colunas `setup_token_*`.

Os runtimes implantados Normal v480, Team Lite v15 e beta10 v6 ainda não contêm o fluxo AUTH-03, não persistem `file_name` e mantêm a rota de limpeza do chat condicionada literalmente ao nome Ricardo. O helper administrativo por papel existe nas candidatas #141/#142, mas não está nos bundles implantados.

### 4.6 Laboratório

O projeto isolado tem 39 migrations, 18 tabelas de aplicação com RLS e zero linhas nas fixtures consultadas; zero mensagens Realtime, zero buckets/objetos Storage e zero sessões/salas/convites de teste residuais.

A tabela `upstatus_setup_invite_rate_limits`:
- RLS habilitado, zero policies.
- Sem SELECT/INSERT para anon/authenticated.
- SELECT/INSERT para service_role.
- Zero linhas.

As RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` são SECURITY INVOKER, `search_path` vazio e EXECUTE somente para service_role.

O laboratório **não é full-product TEST**. A organização tem apenas produção e laboratório. Além disso, `realtime.messages` do laboratório ainda concede SELECT/INSERT a anon/authenticated, embora esteja sem linhas e sem policies. O ambiente serve para contratos/fixtures isolados, não para aceitar a arquitetura completa de produção.

A função de sinalização v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`; esse erro pode cair no fallback HTTP 500. Não foi feita requisição HTTP real.

## 5. Issues e aceitação

- Issue #78 continua aberta e sem confirmação dos oito critérios físicos. A última evidência de engenharia consultada mantém 0/8 critérios de aceitação física. Não houve queda real de internet, recuperação sem F5, reentrada em sala ou interoperabilidade instalada nesta auditoria.
- Issue #79 permanece aberta. O corpo histórico registra 16 itens marcados e 19 pendentes; isso não deve ser apresentado como percentual de prontidão.
- As reviews de #74, #75, #76, #82, #131, #141, #142 e #143 retornaram listas vazias.

## 6. Classificação das evidências

- **AUTOMATED CI PASS:** #74 Validate/Smoke; #76 Candidate Checks; #131 Smoke; #141 Validate; #143 Validate.
- **AUTOMATED CI FAIL:** #82 Validate em `production updateURL mismatch`.
- **CODE INSPECTION:** divergência de tópicos, broadcasts públicos, funções SECURITY DEFINER, AUTH-03 fragmentado, preflight de migrations, workflow Team Lite, upload MIME/size e autorização de limpeza do chat.
- **MANUAL PENDING:** oito critérios físicos da #78, permissões reais de microfone/tela e interoperabilidade instalada.
- **BLOCKED:** ambiente full-product TEST inexistente, MIGRATIONS_FAILED, SQLs originais ausentes, RT-01, ACL/Storage, integração AUTH-03 e aprovação humana.
- **NOT RUN BY QA:** nenhum workflow foi iniciado/repetido; nenhum teste HTTP, browser manual, Tampermonkey ou dispositivo físico foi executado pela QA nesta rodada.

## 7. Gates e próximos passos

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | BLOCKED | 91 broadcasts públicos, tópico divergente e ausência de identidade privada/autorizada nos clientes implantados. |
| TEST-ISOLATION | BLOCKED | Laboratório isolado existe, mas não há terceiro projeto full-product TEST. |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais ausentes; branch gerenciada main em MIGRATIONS_FAILED; dispatcher não verifica arquivos/hashes locais. |
| AUTH-03 | IN_PROGRESS | #131 passa CI, mas não está integrada à API #142 nem à produção; login rate limit ausente. |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, buckets públicos sem policies e validação de bytes insuficiente. |
| RECONNECT | PENDING | Depende de aceitação física sem F5 por Ricardo em candidatos integrados. |
| HUMAN-REVIEW | PENDING | Não há review humana nas PRs consultadas nem autorização explícita de release. |

Prioridades:
1. Projetar Realtime privado/server-mediated e alinhar tópicos, identidade, membership, replay/expiry e payload mínimo.
2. Reconciliar #131 com #141/#142, incluindo rate limit de login e sem reintroduzir autorização por nome fixo.
3. Atualizar #143 para exigir as migrations do runtime integrado e validar proveniência de arquivos SQL locais; reconciliar o dispatcher ao HEAD atual #142.
4. Recuperar os quatro SQLs originais de backup/deployment artifact revisado; diagnosticar MIGRATIONS_FAILED sem reparar histórico às cegas.
5. Endurecer grants, Default ACL e Storage; definir quarentena/finalização autenticada e validar bytes antes de publicar arquivos.
6. Corrigir o workflow Team Lite e o check de PR #142.
7. Criar projeto full-product TEST independente.
8. Manter #78 aberta até testes físicos e obter review humana antes de qualquer release.

## 8. Limites e segurança

Todas as consultas SQL desta rodada foram SELECT-only. Nenhuma migration foi aplicada. Não houve deploy, merge, release, publicação de userscript, upload, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. Nenhum workflow foi iniciado ou repetido. A única escrita desta rodada é este relatório documental novo na branch QA dedicada; `docs/RELEASE_READINESS.md` e branches de engenharia foram preservados.
