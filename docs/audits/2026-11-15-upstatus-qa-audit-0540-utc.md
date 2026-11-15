# Auditoria independente de qualidade — UpStatus
**Data:** 15/11/2026 05:40 UTC  
**Escopo:** GitHub `Reekyi/UpStatus`, Supabase produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.  
**Branch documental:** `qa/release-readiness-2026-11-04-master`.

## Resumo executivo

**Recomendação: NOT READY.**

Os candidatos Normal (#74) e Team Lite (#76) passaram nos seus workflows de CI associados aos HEADs consultados. Isso não equivale a aprovação de release: o runtime instalado continua diferente dos candidatos, o transporte autenticado de mídia continua opt-in e o Realtime de produção ainda transmite eventos em canais públicos.

Novos achados desta rodada:

1. O workflow de produção Team Lite executa `supabase functions deploy upstatus`, embora o alvo correto seja `upstatus-team-lite`. Hoje o workflow também lê o `release.json` da raiz, que está em `3.0.40-beta.22`, enquanto o manifesto próprio Team Lite informa `3.4.30 stable`; portanto o guard de pre-release deve falhar antes do deploy no estado atual. Se o guard da raiz for satisfeito, o slug continua errado.
2. A produção contém 38 Edge Functions ACTIVE, todas com `verify_jwt=false`; 36 têm nomes de test/beta/backup. Isso não prova acesso sem autenticação, pois os handlers principais usam token de sessão próprio, mas mantém uma superfície histórica grande sem inventário de autenticação completo.
3. O signed upload candidato Normal valida origem, caminho e token das URLs retornadas pelo Storage; o candidato Team Lite não repete todas essas verificações. Ambos validam MIME e tamanho declarados pelo cliente, sem inspecionar os bytes nesse fluxo.
4. As versões instaladas Normal e Team Lite ainda têm regras diferentes de senha e autorização administrativa.
5. Os quatro arquivos SQL originais das migrations de produção continuam ausentes no caminho esperado em master.

## 1. Integridade documental e heads reais

O arquivo `docs/RELEASE_READINESS.md` foi recuperado integralmente da branch QA: **1.045.105 bytes e 8.410 linhas**. O último checkpoint interno é de **08/11/2026 15:30 BRT / 18:30 UTC**. O documento está desatualizado em relação à fotografia de 15/11; não foi sobrescrito nesta rodada.

| Branch | HEAD observado | Proteção |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | false |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | false |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | false |
| QA | `976a37d5f7b45c9c97eef9b0f90ff0a06ee47665` | false |

O endpoint de repository rulesets retornou lista vazia. Não há enforcement de review/checks nas quatro branches observadas. A API de proteção específica da QA não foi necessária para a classificação, pois o objeto de branch retornou `protected=false`.

Comparações:

- QA vs master: 328 commits à frente, 1 atrás; 177 arquivos documentais.
- PR #74 vs master: 887 commits à frente, 1 atrás; 90 arquivos.
- PR #75 vs team-lite-official: 59 commits à frente, 0 atrás; 10 arquivos.
- PR #76 vs team-lite-official: 386 commits à frente, 0 atrás; 57 arquivos.
- PR #76 é 327 commits à frente de #75, sem divergência; #75 é baseline histórico, não uma entrega independente atual.
- PR #82 usa o mesmo HEAD da QA, 328 commits à frente e 1 atrás de master; seus 177 arquivos são documentação.

Os PRs #74, #75, #76 e #82 permanecem abertos/Draft e as quatro listas de reviews retornaram vazias.

## 2. CI e classificação dos testes

| PR | HEAD consultado | Resultado CI | Classificação |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS | CI |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | CI histórico |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) SUCCESS | CI |
| #82 QA | `976a37d5f7b45c9c97eef9b0f90ff0a06ee47665` | [Validate 43677375810](https://github.com/Reekyi/UpStatus/actions/runs/43677375810) FAILURE | CI |

### Normal #74

O log do Smoke confirma **136/136 verificações autenticadas**, negociação WebRTC e entrega de faixas de áudio/vídeo para chamada, sala de voz e compartilhamento de tela, malha de três participantes, teardown, rate limit distribuído (90 aceitos e o seguinte rejeitado com HTTP 429 e Retry-After de 60 segundos), recibos atômicos e consumo atômico de convite de primeiro acesso.

Limitação explícita: o passo **Verify distributed setup-invite issuance rate limit** foi SKIPPED porque o harness não estava presente. O teste de consumo de convite passou; o rate limit de emissão não foi validado nesse run.

### Team Lite #76

O log confirma **110/110 verificações autenticadas** e os passos de CI aprovados: guard de projeto isolado, adapter de sinalização autenticada, enrollment, recuperação de tentativas de voz, recuperação de screen-share, contrato HTTP offline, autenticação do endpoint isolado, Chromium com IIFE completo e stubs de Tampermonkey, WebRTC, malha de três participantes, rate limit distribuído, recibos atômicos, setup invite e rate limit de emissão de convite. Também passou o teste que exige papel administrativo persistido para limpeza destrutiva do chat.

É CI de navegador/API isolado, não teste manual com Tampermonkey instalado e permissões reais.

### QA #82

O run exato do HEAD atual falhou em `scripts/validate.mjs:26`:

`VALIDATION FAILED: production updateURL mismatch`

A causa está no builder de master: ele ainda define o updateURL a partir do endpoint beta10. O validador espera o endereço estável `/upstatus/upstatus.user.js`. A mudança candidata em #74 passa a usar `release.scriptUrl` e valida a igualdade, mas não está integrada em master.

O run #82 fez checkout do merge ref `82ddff8c8b84a523180b43289f4975cd9c749c0f` e reproduziu a falha. Não foi iniciado rerun.

### Teste manual

Nenhum teste manual foi executado nesta rodada. Não havia checkout local nem navegador com Tampermonkey disponível. Não houve teste físico de microfone, captura real de tela, queda real de rede ou interoperabilidade instalada.

## 3. Workflows e cadeia de publicação

### Team Lite oficial

Arquivo: [team-lite-official/.github/workflows/deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml).

O workflow:
- lê o `release.json` da raiz e exige `preRelease` vazio;
- configura Supabase CLI `latest`;
- não valida projeto de destino nem SHA/branch aprovado;
- executa `supabase functions deploy upstatus`, não `upstatus-team-lite`.

O manifesto da raiz na branch oficial está em `3.0.40-beta.22`, enquanto `team-lite/release.json` declara buildVersion `3.4.30`, channel `stable` e scriptUrl para a branch mutável `team-lite-official`. Portanto o guard atual deve interromper o workflow por pre-release; isso não corrige o alvo incorreto que seria usado se o guard passasse.

**Não despachar esse workflow.**

### Normal e TEST

O workflow de produção em master é manual, usa `secrets.SUPABASE_PROJECT_ID`, Supabase CLI `latest`, trava a versão em 3.4.7 e publica somente `upstatus`. Não há validação explícita do project ref nem do SHA.

O workflow de TEST em develop também tem gatilho push para develop, usa o mesmo secret `SUPABASE_PROJECT_ID` e CLI `latest`, sem guard explícito contra o projeto de produção. O valor do secret não foi lido; o destino efetivo não foi comprovado.

O candidato #74 melhora esses controles: checkout do SHA dispatchado, branch master, project ref de produção fixo, token obrigatório e CLI 2.122.1. Porém publica somente `upstatus`; o cliente ainda usa beta10 como endpoint de API, exigindo cutover coordenado separado.

Os candidatos #74/#76 substituem o deploy TEST por variável dedicada `SUPABASE_TEST_PROJECT_ID`, rejeitam produção e o projeto isolado de sinalização, exigem formato de project ref e CLI 2.122.1. O workflow Team Lite candidato #76 é manual-only. Essas proteções ainda não estão na branch oficial.

A organização tem apenas dois projetos Supabase. O guard candidato de TEST exige um terceiro projeto full-product, que não existe.

### Atualizador Team Lite

O userscript instalado usa raw.githubusercontent.com com a branch `team-lite-official` em updateURL/downloadURL. O candidato #76 também declara scriptUrl nessa branch. Como a branch não é protegida e não há rulesets, o artefato de atualização é mutável sem aprovação obrigatória. Recomenda-se artefato de release imutável e SHA verificável.

## 4. Compatibilidade Normal / Team Lite, AUTH-03 e Edge Functions

### Runtimes implantados

| Função | Versão Edge | Userscript embutido |
|---|---:|---:|
| upstatus | v480 | Normal 3.4.7 |
| upstatus-team-lite | v15 | Team Lite 3.4.30 |
| upstatus-screen-share-3-1-1-beta10 | v6 | API Normal legada |
| upstatus-test | v281 | TEST 3.3.28 |

### Autenticação e autorização

Nos runtimes Normal e Team Lite instalados:
- Normal exige senha mínima de 6 caracteres no login/setup.
- Team Lite exige 4 caracteres no login/setup.
- O primeiro setup não exige setup token de uso único.
- O fallback de papel administrativo usa nomes de usuários quando o papel está vazio.
- `/api/chat/clear` verifica o nome Ricardo, sem exigir o papel persistido `implementation_admin`.

O endpoint legado `upstatus-test` v281 permanece ACTIVE em produção e apresenta o mesmo desenho antigo de setup e chat-clear. O snapshot atual registra 5 usuários, 319 sessões, 302 mensagens e zero registros em auth.users. Não foi feita tentativa de login, takeover ou limpeza.

Os candidatos #74 e #76 corrigem o fluxo de primeiro acesso com token de 64 caracteres, RPC de consumo atômico, senha mínima 6 no setup/4 no login e verificação de papel persistido para limpeza do chat. O candidato Team Lite também chama RPC de rate limit de emissão de convite. No Normal #74, o passo correspondente de CI foi SKIPPED e o template não apresenta a mesma chamada de rate limit; AUTH-03 Normal permanece parcial.

### Inventário de Edge Functions

Produção possui **38/38 Edge Functions ACTIVE**; todas reportam `verify_jwt=false`. 36 slugs são históricos de test/beta/backup. Os handlers principais usam token de sessão próprio, portanto `verify_jwt=false` não prova ausência de autenticação. Entretanto, a superfície histórica deve ser inventariada e funções obsoletas devem ser retiradas ou restringidas após revisão individual.

Não existe função `upstatus-signal` de produção. O endpoint server-mediated existe somente no laboratório:
- `upstatus-signal-test` v32;
- `upstatus-signal-e2e-once` v3.

A função de laboratório v32 expõe Retry-After no rate limit HTTP 429, mas o mapeamento HTTP 409 cobre `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`, não `VOICE_ATTEMPT_ALREADY_ACTIVE`. O contrato candidato offline passa; a função efetivamente implantada ainda não possui o mesmo mapeamento explícito.

## 5. Realtime e segurança de mensagens

Produção registrou **106 eventos em 14 dias**, todos com `private=false`:

| Evento | Quantidade |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_command | 4 |
| remote_result | 4 |

A função PostgreSQL `upstatus_broadcast_messages()` usa `to_jsonb(CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END)` e publica o registro completo em `db_change`. A função `upstatus_broadcast_remote_state()` publica metadados de comando/resultado; `upstatus_broadcast_users()` publica nome/status/reason/updated_at/sync. Os três broadcasts usam `private=false`.

O tópico dos triggers é `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os userscripts instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. Há divergência de tópico.

Normal e Team Lite instalados não usam `private:true` nem `realtime.setAuth()`. Normal executa remote_command recebido quando target coincide; Team Lite também verifica a sessão local/generation, mas não autentica o publicador. Os handlers de call_signal, voz e screen-share recebem payloads do broadcast público.

Os candidatos #74/#76 introduzem adapter server-mediated, mas a flag `signaling_transport_enabled` default é false e o endpoint configurável começa vazio. Sem habilitação e endpoint, o fallback público continua ativo. O cliente Normal candidato transforma remote_command em wake-up/poll autenticado, mas isso não fecha call_signal/voz/tela. Não há Realtime privado/autorizado concluído.

O laboratório minimiza os payloads dos três triggers para somente `{op: TG_OP}`, usa search_path vazio e restringe EXECUTE a service_role. Isso ainda não foi aplicado em produção.

O setting Dashboard “Allow public access” não está disponível para inspeção e nenhum acesso externo foi reproduzido. Portanto, o risco de exposição é confirmado pelo desenho do broadcast, mas não foi demonstrado vazamento externo.

## 6. RLS, grants, SECURITY DEFINER, Default ACL e Storage

### Produção

- 10 tabelas public com RLS e zero policies.
- 9 tabelas public concedem privilégios diretos a anon/authenticated, incluindo TRUNCATE. RLS não protege TRUNCATE.
- `realtime.messages`: RLS, zero policies, SELECT/INSERT/UPDATE para anon/authenticated.
- `storage.objects` e tabelas Storage: RLS sem policies e grants para papéis de cliente.
- Default ACL: 24 registros, 75 itens ACL; 15 registros incluem grants para papéis de cliente.
- Security Advisor: 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated.

As três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role. O Advisor as aponta como RPC executável, mas as definições retornam tipo trigger; a invocação direta via PostgREST não foi testada. O EXECUTE amplo continua desnecessário e deve ser revisto.

### Laboratório

- 18 tabelas public com RLS e zero policies, mas sem grants diretos de tabela a anon/authenticated.
- Storage e Realtime ainda têm grants para anon/authenticated e zero policies próprias.
- Default ACL: 25 registros, 70 itens ACL; 12 registros incluem grants para papéis de cliente, principalmente Storage e schemas gerenciados por supabase_admin.
- Security Advisor: 18 INFO de RLS sem policy e zero WARN.

### Storage e upload

Buckets de produção:
- chat-images: 168 objetos, público, limite 20 MiB;
- profile-images: 20 objetos, público, limite 20 MiB.

Total observado: 188 objetos. Não há policies próprias em `storage.objects`. Bucket público permite leitura de objetos por URL; a posse do endereço não equivale a autorização por usuário.

No signed upload, Normal e Team Lite validam MIME/tamanho declarados pelo cliente e emitem URL assinada sem inspecionar os bytes. O candidato Normal também valida origem, caminho, token e URL pública retornados pelo Storage; o candidato Team Lite não repete todas essas verificações. O helper `sniffMime` usado em outro caminho retorna o MIME declarado quando não reconhece os bytes. Nenhum upload real foi executado; os testes de upload candidatos usam mocks/VM.

## 7. Migrations, projetos e logs

Projetos da organização:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, duas Edge Functions.

Produção:
- 5 usuários, 319 sessões, 302 mensagens, 0 auth.users;
- 188 objetos Storage;
- 7 migrations registradas: 3 iniciais e 4 versões de outubro.

Os quatro arquivos SQL originais abaixo retornaram 404 nos caminhos esperados em master:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não foram reconstruídos a partir do schema. A branch gerenciada Supabase `main` permanece MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY; a causa não foi diagnosticada.

O laboratório tem zero usuários, sessões, mensagens, buckets e objetos. É ambiente isolado de sinalização/auth, não Full-Product TEST.

Na janela de logs de 24 horas foram observados 88 function_edge_logs em produção e 19 no laboratório. Os campos de função/status retornaram vazios e uma consulta de detalhamento do laboratório falhou ao resolver a organização; não foi possível atribuir os eventos a uma função ou confirmar recuperação da quota. Não afirmo que o HTTP 402 persiste nem que foi resolvido.

## 8. Issues e aceitação

- Issue #78 permanece OPEN com **0/8** critérios: reconexão Normal/Team Lite sem F5, reentrada, nova chamada, áudio sem duplicação, participantes estáveis, CI e teste manual.
- Issue #79 permanece OPEN com 16 itens marcados e 19 pendentes no corpo. O corpo contém snapshots históricos; o comentário dedicado `<!-- UPCONTROL:QA -->` é atualizado separadamente.

Nenhum teste físico foi executado. RECONNECT permanece pending, não done.

## 9. Gates e próximos passos

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | Produção ainda usa broadcasts públicos e flag segura default false |
| TEST-ISOLATION | blocked | Só existe laboratório de sinalização/auth, sem fixtures de produto |
| MIGRATION-PROVENANCE | blocked | Quatro arquivos originais retornam 404 |
| AUTH-03 | blocked | Tokens/convites/rate limit ainda não estão implantados em produção |
| ACL-STORAGE | blocked | Grants, Default ACL, SECURITY DEFINER e buckets públicos permanecem |
| RECONNECT | pending | Issue #78 0/8; sem teste físico |
| HUMAN-REVIEW | pending | PRs obrigatórias sem reviews e sem autorização de release |

Prioridades:
1. Remover full-row payloads e tornar sinalização server-mediated privada/autorizada por padrão em Normal e Team Lite.
2. Corrigir o workflow Team Lite: slug, manifesto correto, SHA/projeto fixos, CLI pinada e preflight.
3. Proteger branches e usar artefatos imutáveis para updateURL/downloadURL.
4. Completar AUTH-03 em ambos os produtos e garantir rate limit de emissão Normal.
5. Uniformizar validação de signed upload entre Normal e Team Lite e validar conteúdo real.
6. Restringir grants, Default ACL e funções SECURITY DEFINER; definir Storage privado ou política de acesso explícita.
7. Recuperar e validar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
8. Provisionar Full-Product TEST, executar testes físicos da #78 e obter review/autorização humana.

## 10. Limites e segurança desta rodada

- GitHub e Supabase foram usados somente para leitura, exceto o novo relatório nesta branch QA e a atualização do comentário QA dedicado na Issue #79.
- Todas as consultas SQL foram SELECT/catalog-only.
- Nenhum workflow foi despachado; nenhum teste de produção foi executado.
- Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets, flags, roles, grants, policies, ACLs ou fixtures.
- Não houve tentativa de explorar RPC, publicar broadcast, injetar SDP/ICE, capturar áudio/tela ou fazer upload.
- A configuração de acesso público do Realtime não foi exposta pelo conector; acesso externo efetivo não foi reproduzido.
- O log de quota do laboratório não pôde ser atribuído com confiança.
- Nenhum teste manual foi alegado.

**Conclusão: NOT READY.** Os resultados CI são bons para os candidatos, mas não compensam os bloqueadores de segurança, publicação, proveniência e aceitação física ainda abertos.
