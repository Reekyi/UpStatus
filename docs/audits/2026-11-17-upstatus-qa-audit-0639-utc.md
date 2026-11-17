# Auditoria independente de qualidade do UpStatus
**Execução:** 17/11/2026 · 06:39 UTC  
**Recomendação:** `not_ready`  
**Escopo:** GitHub `Reekyi/UpStatus` e Supabase produção `dlfvkawaiqduhlazsszm` + laboratório `bfpjtfqlnypisxljoxkb`.

## 1. Método e limites

- Leitura integral de `docs/RELEASE_READINESS.md` na branch QA: 8.423 linhas, aproximadamente 1,046 MB. O último checkpoint interno do documento é de 15/11/2026 06:30 UTC.
- Inspeção read-only de branches, PRs, commits, reviews, workflows, logs de CI, Issues #78/#79, Edge Function bundles, Advisors e catálogos PostgreSQL.
- Nenhum teste de navegador/Tampermonkey/Sale Smartly foi executado nesta rodada. Os resultados de CI abaixo são execuções anteriores inspecionadas, não testes repetidos pela QA.
- Nenhuma escrita no banco, deploy, merge, migration, release, publicação de userscript, alteração de secrets/flags/permissões ou operação destrutiva.
- O relatório foi criado como arquivo novo nesta branch QA. `docs/RELEASE_READINESS.md` não foi sobrescrito.

## 2. Heads reais e governança

| Branch | HEAD | Protegida |
|---|---|---:|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | não |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | não |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | não |
| `qa/release-readiness-2026-11-04-master` | `38ea9d5fc6a85fa5f96a8698d1a3f49ba988fd92` | não |

As quatro branches consultadas retornam `protected=false`. Isso deixa checks e reviews sem enforcement de branch protection.

| PR | HEAD | Estado | Comparação / observação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | Draft, aberta | 887 commits à frente e 1 atrás da master; 90 arquivos |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft, aberta | 59 commits à frente da branch oficial |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | Draft, aberta | 389 commits à frente; contém #75 como ancestral, com 330 commits adicionais |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `38ea9d5fc6a85fa5f96a8698d1a3f49ba988fd92` | Draft, aberta | 389 commits à frente e 1 atrás da master; 224 arquivos alterados, todos em `docs/` |

As PRs #74, #75, #76 e #82 têm **zero reviews** registradas. #75 e #76 não são linhas independentes: #76 descende de #75.

### PRs auxiliares relevantes

- [#131 AUTH-03 Normal](https://github.com/Reekyi/UpStatus/pull/131), HEAD `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b`, Draft. Sua base `fb878537` é anterior à HEAD atual da #74. A comparação entre #131 e #74 mostra divergência: quatro commits exclusivos da #74 e um commit exclusivo da #131. A implementação de rate limit não está integrada à #74 atual.
- [#176 recuperação de migrations](https://github.com/Reekyi/UpStatus/pull/176), HEAD `b50f8567392322b4309468e0fe9e6fc81ca38c1d`, continua com Validate falhando.

## 3. CI: evidência existente, sem confundir com teste manual

| PR / run | Resultado observado |
|---|---|
| [#74 Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | PASS; build/contratos estáticos, setup-invite, upload assinado e regressões de chat/updater |
| [#74 Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS; 136/136 checks autenticados, WebRTC call/voice/screen, mesh de três membros, rate limit 90 aceitos + 1 HTTP 429, recibos atômicos e setup enrollment |
| [#75 Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS limitado: versão 3.4.31, metadata/updater, sintaxe do userscript e portais Lucca/Ycaro; não é integração real de backend |
| [#76 Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) | FAIL na integração; 11/11 contratos HTTP offline passaram, mas 0/16 checks não autenticados receberam a resposta esperada |
| [#82 Validate 44025860928](https://github.com/Reekyi/UpStatus/actions/runs/44025860928) | FAIL em `production updateURL mismatch` |
| [#131 Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | PASS histórico em branch divergente; teste concorrente de 24 convites, cinco aceitos e dezenove recusados, isolamento de bucket e cleanup |
| [#176 Validate 43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) | FAIL em `client signed upload helper missing` |

### Diagnóstico da #82

O diff da #82 contém somente 224 arquivos em `docs/`, sem arquivo de produto. A falha é herdada do build/validator de master: o build de master forma o updateURL a partir do endpoint beta10, enquanto o validator exige `/upstatus/upstatus.user.js`. A candidata #74 separa `release.json.scriptUrl` da URL de API, mas essa alteração não está na master usada pela #82.

### AUTH-03

A #131 implementa rate limit distribuído de cinco convites por administrador a cada 900 segundos, falha fechada com 503 e rejeita excedentes com 429. O Smoke da #131 passou, mas sua branch divergiu da #74 atual. Na #74 atual, `issueSetupInvite` não chama `consume_upstatus_setup_invite_rate_limit`. Na #76 Team Lite, a chamada está presente.

## 4. Edge Functions e compatibilidade Normal / Team Lite

Inventário read-only do projeto de produção:

- `upstatus`: versão Edge 480, userscript embutido 3.4.7.
- `upstatus-team-lite`: versão Edge 15, userscript embutido 3.4.30.
- `upstatus-screen-share-3-1-1-beta10`: versão Edge 6, userscript embutido beta8.
- `upstatus-screen-share-3-1-1-beta8`: versão Edge 2.
- `upstatus-test`: versão Edge 281.
- 38 Edge Functions ativas no total; todas retornam `verify_jwt=false`.

`verify_jwt=false` é a configuração do gateway, não prova isolada de ausência de autenticação: os runtimes usam sessão/token próprio. Ainda assim, cada rota precisa de revisão individual de autorização. A presença de vários endpoints beta/test/backup ativos aumenta a superfície que precisa ser inventariada.

### Divergência do Normal

O userscript Normal 3.4.7 servido por `upstatus` chama a API beta10. O bundle beta10, por sua vez, embute userscript beta8 e aponta sua API para beta8. Os três slugs beta10/beta8 existem em produção.

Na candidata #74:
- `release.json` continua em 3.4.7 e aponta o updateURL para `/functions/v1/upstatus/upstatus.user.js`.
- `scripts/build.mjs` mantém `CLOUD_SERVER` apontando para beta10.
- O workflow de produção publica somente a função `upstatus`.
- O workflow fixa a versão estável em 3.4.7, igual à versão do artefato raiz atual.
- O build só permite sincronizar o artefato raiz quando a versão é estritamente maior que a versão já rastreada.

Resultado: a distribuição do userscript e a API continuam em cortes diferentes. As novas rotas de AUTH-03 e as correções do template Normal não passam a ser usadas pelo cliente se ele continua chamando beta10. O deploy de `upstatus` sozinho não atualiza beta10.

### Divergência do Team Lite

O Team Lite implantado é 3.4.30. A candidata #76 prepara 3.4.31, usa API `upstatus-team-lite` e tópico novo alinhado ao trigger. Entretanto:
- o workflow oficial de produção ainda usa Supabase CLI `latest`;
- publica `upstatus`, não `upstatus-team-lite`;
- não valida explicitamente o project ref esperado;
- o workflow `team-lite-candidate.yml` é de checks, não de deploy de produção.

**Não despachar o workflow oficial Team Lite.**

## 5. Realtime, chat, voz, tela e comandos remotos

### Canal e tópicos

- O banco publica em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os clientes Normal 3.4.7 e Team Lite 3.4.30 implantados assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Portanto, os eventos dos triggers não chegam ao tópico assinado pelos clientes instalados.
- Os candidatos #74/#76 passam a usar o tópico `upstatus-live`, alinhado ao banco, mas continuam criando o canal sem `private:true` e sem `setAuth()`.

### Estado persistido em Realtime

A consulta read-only retornou 106 mensagens, todas `private=false`:

| Evento | Registros |
|---|---:|
| `user_status` | 72 |
| `db_change` | 26 |
| `remote_command` | 4 |
| `remote_result` | 4 |

Zero policies em `realtime.messages`. Grants efetivos: anon SELECT/INSERT; authenticated SELECT/INSERT/UPDATE.

Os triggers confirmados por `pg_get_functiondef`:
- `upstatus_broadcast_messages` transmite `to_jsonb(NEW/OLD)` inteiro em `db_change`, no tópico público.
- `upstatus_broadcast_remote_state` transmite campos de comando e resultado em `remote_command`/`remote_result`, também com `private=false`.
- `upstatus_broadcast_users` transmite nome, status, motivo e metadados de atualização.

### Comando remoto

Nos bundles implantados, o handler de `remote_command` chama `executeRemoteCommand` quando `target===member`. A função sincroniza o status no Sale Smartly antes de consultar o endpoint autenticado de resultado; o payload do broadcast não comprova a identidade do remetente. Com o canal público e os grants de Realtime observados, existe um caminho plausível de spoofing de evento. **Não foi feito teste externo de exploração**, portanto isso é achado de inspeção de código/catálogo, não exploit reproduzido.

Os candidatos Normal e Team Lite mudam `remote_command` para apenas agendar polling autenticado e ignoram `remote_result` público. Essa mitigação ainda não está implantada.

### Transporte autenticado ainda não é utilizável em produção

Nos dois candidatos:
- `signaling_transport_enabled` default é false;
- `signaling_transport_endpoint` default é vazio;
- `initSignalingTransport` exige endpoint HTTPS na mesma origem da API e slug `upstatus-signal` ou `upstatus-signal-test`;
- não há rota equivalente nos templates principais Normal/Team Lite nem Edge Function de sinalização em produção;
- a função `upstatus-signal-test` existe somente no laboratório, em outro projeto/origin, e por isso não satisfaz a validação same-origin do cliente.

Com a flag false, a sinalização legada de chamada/voz/tela continua aceitando eventos públicos. Com a flag true, o transporte não inicia sem endpoint compatível. RT-01 permanece bloqueado.

## 6. RLS, grants, SECURITY DEFINER e Storage

### Produção

- 10 tabelas em `public` com RLS habilitado e zero policies.
- Nove dessas tabelas concedem a anon e authenticated sete privilégios cada: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Total observado: 126 entradas de grants.
- `realtime.messages`: zero policies; grants de leitura/escrita para anon/authenticated conforme acima.
- Três funções SECURITY DEFINER de broadcast retornam `trigger`, usam `search_path=public` e têm EXECUTE concedido a papéis de cliente. O Advisor sinaliza os grants; não foi demonstrada invocação direta por RPC.
- Default ACLs mantêm grants amplos para objetos futuros em schemas public/graphql/graphql_public (owner supabase_admin) e storage (owner postgres).
- Dois buckets públicos, 188 objetos. `storage.objects` tem RLS true, FORCE RLS false, zero policies e grants SELECT/INSERT/UPDATE/DELETE para anon e authenticated. A leitura pública dos buckets é explícita; não foi demonstrado upload/delete externo, pois não há policies.

Security Advisor: seis avisos WARN ligados às funções SECURITY DEFINER e dez INFO ligados a RLS sem policies.

### Laboratório

- 18 tabelas public com RLS e sem policies; grants diretos anon/authenticated foram revogados nas tabelas consultadas.
- As funções SECURITY DEFINER de broadcast têm search_path vazio e não concedem EXECUTE a anon/authenticated; service_role mantém a execução necessária.
- Ainda há default ACLs amplas em schemas public/graphql/graphql_public sob supabase_admin e storage sob postgres.
- `realtime.messages` tem zero registros, mas mantém grants anon/authenticated e zero policies.
- Security Advisor retornou 18 INFO e nenhum WARN.

A melhora do laboratório não representa correção de produção.

## 7. AUTH-03 e migrations

Produção:
- cinco contas, zero contas sem password_hash;
- zero colunas `setup_token_*`;
- zero RPCs `consume_upstatus_setup_invite*`;
- zero tabela `upstatus_setup_invite_rate_limits`.

Os runtimes implantados ainda aceitam `POST /api/setup` sem token de convite. Hoje as cinco contas estão configuradas, mas a rota legada permanece disponível para futuras contas sem senha. O primeiro setup ainda aplica fallback de role por nomes fixos.

Nos runtimes implantados, `/api/chat/clear` autoriza apenas quando o nome é literalmente Ricardo, sem conferir `role=implementation_admin`. Os templates candidatos acrescentam a checagem do papel administrativo, mas ainda mantêm a identidade fixa no código.

Normal implantado exige senha mínima de seis caracteres; Team Lite implantado aceita quatro. Os candidatos padronizam setup em seis e login em quatro.

Laboratório:
- quatro colunas `setup_token_*`;
- duas RPCs de convite;
- uma tabela de rate limit;
- duas Edge Functions: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

Migrations: produção tem sete; laboratório, 39. A recuperação anterior de quatro SQLs a partir do ledger é evidência do statement executado, não dos bytes originais dos arquivos. A #176 continua falhando em Validate por falta do helper de upload assinado no baseline. Não houve replay/preflight em Full-Product TEST.

## 8. Issues e aceite físico

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados. Os oito itens seguem desmarcados. A issue não foi atualizada desde 08/11. Não houve teste de perda/retorno real de internet, reentrada sem F5, microfone/tela reais ou interoperabilidade instalada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados e 19 pendentes. O comentário QA existente foi atualizado; não foi criado comentário duplicado e o comentário da Engenharia foi preservado.

## 9. Gates reavaliados

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 106 mensagens públicas, zero policies; clientes e triggers em tópicos diferentes; sem transporte autenticado de produção |
| TEST-ISOLATION | blocked | somente projeto produção e laboratório signaling/auth; sem Full-Product TEST |
| MIGRATION-PROVENANCE | in_progress | quatro SQLs recuperados do ledger, mas sem prova byte a byte/replay; #176 Validate falha |
| AUTH-03 | in_progress | produção sem schema/RPC de convite; rate limit Normal em #131 divergente da #74 |
| ACL-STORAGE | blocked | grants, default ACLs, buckets públicos e policies insuficientes em produção |
| RECONNECT | pending | Issue #78 em 0/8; sem confirmação física de Ricardo |
| HUMAN-REVIEW | pending | PRs obrigatórias sem review e sem autorização explícita de release |

## 10. Próximas ações recomendadas

1. Diagnosticar a causa dos HTTP 402 de produção separadamente. A janela consultada retornou 77.925 registros de Edge Functions, todos HTTP 402, entre 16/11 11:41:55 e 21:00:47.824 UTC; não há eventos Edge posteriores nessa janela. A ausência de logs posteriores não prova recuperação nem indisponibilidade atual.
2. O proprietário da organização deve revisar Usage/Billing e spend cap do laboratório: a #76 recebeu 48 respostas HTTP 402 com `exceed_edge_functions_invocations_quota`.
3. Definir um corte único Normal: distribuição, API, versão do userscript e Realtime precisam apontar para a mesma release.
4. Integrar/reconciliar #131 com a HEAD atual da #74 e repetir CI exato.
5. Corrigir o workflow Team Lite para validar project ref/commit, fixar CLI e publicar `upstatus-team-lite`.
6. Implementar e validar endpoint de sinalização autenticada em projeto de teste apropriado; tornar a configuração padrão segura e bloquear o fallback público antes do release.
7. Corrigir grants/default ACLs, payloads de broadcast, Storage e funções SECURITY DEFINER por migrations revisadas, primeiro em Full-Product TEST.
8. Validar migrations recuperadas em ambiente isolado e concluir proveniência.
9. Executar os oito critérios físicos da #78 e obter revisão/aprovação humana.

**Conclusão:** não liberar Normal nem Team Lite. Há CI forte em parte da candidata Normal, mas o runtime implantado está desalinhado, AUTH-03 não chegou à produção, os canais Realtime continuam públicos e o ambiente de integração Team Lite está bloqueado por quota. Nenhum teste manual ou alteração de produção foi realizado nesta execução.
