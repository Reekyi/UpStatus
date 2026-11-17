# Auditoria independente UpStatus — 2026-11-16 02:43 UTC

## Resultado

**Recomendação: NOT READY.** Esta execução revalidou heads, PRs, workflows, issues, código candidato, artefatos realmente implantados e catálogos dos dois projetos Supabase. GitHub e Supabase foram usados em modo read-only, exceto pela criação deste relatório na branch QA e atualização do comentário QA existente na Issue #79.

Não houve teste manual no Sale Smartly/Tampermonkey, áudio físico, câmera/tela física ou reconexão real. CI citado abaixo é resultado de runs existentes nos HEADs indicados, não uma nova execução iniciada pela auditoria.

## 1. Heads e escopo Git

Heads verificados:

| Ref | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `11bfd5d24f3575fd33493cf5e4c7f20ad72c5938` antes deste relatório |

A comparação QA vs master retornou **355 commits à frente, 1 atrás e 198 arquivos alterados; todos os 198 arquivos são documentação**. Não fiz rebase nem incorporei o commit master-only. O HEAD QA foi conferido imediatamente antes da escrita documental.

A PR #74 tem um diff amplo: 887 commits à frente, 1 atrás, 90 arquivos. Isso aumenta o custo de revisão, mesmo com CI aprovado.

O documento `docs/RELEASE_READINESS.md` foi lido na branch QA. O último snapshot interno que ele registra é de **2026-11-15 06:30 UTC**, anterior aos checkpoints de Engenharia de 16/11. O documento-base está desatualizado; esta auditoria é um relatório independente novo, não uma substituição silenciosa do documento-base.

## 2. PRs principais e CI

| PR | HEAD | Estado | Evidência CI |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Draft | Validate e Smoke SUCCESS |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft | PASS histórico |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Draft | Candidate Checks SUCCESS |
| #82 QA | `11bfd5d24f3575fd33493cf5e4c7f20ad72c5938` | Draft | Validate FAILURE |
| #161 Normal | `557814dc31bed779b84a2094358dc6b2a7e67689` | Draft | Validate e Smoke SUCCESS |
| #163 contrato HTTP voz | `00f357b0f5921d1995bb52c7b50f53ef8276e334` | Draft | Validate/contrato offline SUCCESS |
| #167 Normal anexos/upload | `d25b3fbe1bd28a222d45ead6a467ceb7fd00548a` | Draft | Validate SUCCESS; sem Smoke |
| #168 Retry-After | `c6de3eb29bb419e817a237487185df0df752015d` | Draft | Validate SUCCESS |
| #170 updater/chat | `693039eddbd01e210fd1344b0196703ca067f374` | Draft | Validate FAILURE |

Nenhuma review humana submetida foi encontrada nas PRs #74, #75, #76, #82, #167 e #170.

### #74, #75 e #76

- #74: runs [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) passaram. O Smoke pulou a verificação de rate limit de emissão de convites; essa proteção foi testada posteriormente na #161.
- #75: [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é evidência histórica, não substitui a candidata #76.
- #76: [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) passou. O log confirma 110/110 verificações autenticadas, browser smoke offline com Playwright/Tampermonkey stubs, WebRTC de chamada/voz/tela contra o laboratório, teste de grupo, rate limits, consumo de convite e versão candidata Team Lite **3.4.31**. A branch oficial ainda declara **3.4.30**. São testes automatizados de laboratório, não aceitação física no Sale Smartly.

### #82

[Validate 43787798433](https://github.com/Reekyi/UpStatus/actions/runs/43787798433) falhou em `scripts/validate.mjs:26`:

`VALIDATION FAILED: production updateURL mismatch`

O job construiu PROD/TEST 3.4.7 e falhou na assertion de updateURL. Como o diff da QA contra master é documental, a falha é herdada do build/validator de master; não é evidência de defeito no Markdown. A PR #82 permanece vermelha.

### #161 e #168

- [#161 Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) passaram.
- O Smoke registrou 136/136 verificações autenticadas, negociação WebRTC de chamada/voz/tela com entrega de tracks no browser, teardown, testes de sala/grupo, consumo atômico de convite e rate limit distribuído de emissão. O teste de sinalização aceitou 90 solicitações e rejeitou a seguinte com HTTP 429 e Retry-After 60s. Tudo ocorreu no projeto isolado, não em produção.
- [#168 Validate 43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) passou e adiciona `Retry-After: 900` e `Access-Control-Expose-Headers: Retry-After` ao HTTP 429 de emissão de convites. Não há Smoke/HTTP real para a #168; 900 segundos é uma espera conservadora de janela completa, não o tempo restante exato.

### #167 e #170: contrato de anexos

A #167 passou em [Validate 43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392). O log confirmou testes offline de cliente e servidor para bucket, MIME/tamanho declarados, origem, caminho, token de uso único, PUT e wiring da UI, além de regressões do chat.

A #167 contém:
- anexos pendentes até o envio, prévia removível e restauração em falha;
- upload assinado para chat/avatar;
- autorização server-side da limpeza global do chat com conta responsável **e** papel persistido `implementation_admin`;
- separação de URL de atualização e endpoint de API.

Limitações declaradas no próprio PR:
- MIME e tamanho são declarações do cliente; os bytes reais não são inspecionados;
- não há quarentena privada;
- buckets atuais são públicos;
- não houve teste contra Storage real, navegador, Tampermonkey ou dispositivos físicos;
- PROD/TEST continuam em 3.4.7.

O build da #167 mantém deliberadamente `CLOUD_SERVER` no beta10; ela separa updateURL da API, mas não faz o cutover de API da #161. A integração das duas linhas ainda precisa ser feita e validada como um único candidato. A versão não foi aumentada, então clientes 3.4.7 podem não receber automaticamente uma alteração que também se anuncia como 3.4.7.

A #170 continua falhando em [Validate 43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686), com:

`CHAT REGRESSION FAILED: files are staged instead of uploaded immediately`

A assertion da #170 espera upload imediato, enquanto a #167 adota anexos staged. Não remover a assertion para forçar CI verde; reconciliar os contratos e executar Validate + Smoke no conjunto integrado.

### #163: contrato HTTP 409 ainda não implantado

A [PR #163](https://github.com/Reekyi/UpStatus/pull/163) tem contrato offline aprovado ([run 43488594110](https://github.com/Reekyi/UpStatus/actions/runs/43488594110)) e mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. Porém o helper atualmente implantado no laboratório, `upstatus-signal-test v32`, ainda mapeia apenas `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409. Não há validação HTTP real do candidato implantado; #163 permanece Draft.

## 3. Team Lite: workflow oficial e cadeia candidata

O workflow atual em `team-lite-official` ainda:
- usa Supabase CLI `latest`;
- publica o slug `upstatus`, que é o serviço Normal, em vez de `upstatus-team-lite`;
- usa project ID vindo de secret genérico, sem guard explícito do projeto esperado.

A cadeia candidata de proteção foi reavaliada:

| PR | Check | Resultado |
|---|---|---|
| #125 dispatcher | [42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306) | SUCCESS |
| #125 Validate herdado | [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) | FAILURE: updateURL |
| #126 preflight | [42598779957](https://github.com/Reekyi/UpStatus/actions/runs/42598779957) | SUCCESS |
| #128 review provenance | [42994078899](https://github.com/Reekyi/UpStatus/actions/runs/42994078899) | SUCCESS |
| #129 desativação do workflow legado | [42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545) | SUCCESS |

A proposta #125 é manual-only, exige SHA exato de `team-lite-official`, PR merged e aprovado, checks concluídos, confirmação explícita, projeto correto, preflight de migrations e CLI 2.122.1; contém somente deploy do slug `upstatus-team-lite`. #129 transforma o workflow legado em bloqueio fail-closed. Entretanto, #125/#126/#128/#129 continuam Draft/não integradas. O workflow oficial inseguro permanece presente; não despachar.

## 4. Runtimes realmente implantados

Management API e conteúdo dos bundles embutidos foram inspecionados:

| Runtime | Versão Edge | Userscript embutido | API usada |
|---|---:|---:|---|
| Normal `upstatus` | v480 | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` v6 |
| Team Lite `upstatus-team-lite` | v15 | 3.4.30 | `upstatus-team-lite` |
| Normal legado beta10 | v6 | — | — |
| TEST `upstatus-test` | v281 | 3.3.28 | TEST |
| Lab `upstatus-signal-test` | v32 | — | somente laboratório |
| Lab `upstatus-signal-e2e-once` | v3 | — | somente laboratório |

O userscript Normal é distribuído pelo endpoint `upstatus`, mas sua API continua no beta10. Team Lite usa sua API própria. Os dois bundles instalados usam o tópico público `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` e sem `setAuth()`.

As 38 Edge Functions de produção reportam `verify_jwt=false`. Isso é configuração da plataforma; não prova, isoladamente, que todos os handlers aceitam acesso anônimo, pois a aplicação implementa autenticação própria por token em suas rotas principais.

### AUTH-03 e limpeza do chat

As fontes implantadas Normal v480 e Team Lite v15 ainda contêm:
- `GET /api/account?name=` retornando `needsSetup`;
- `POST /api/setup` chamando `login(req,true)` sem validar convite;
- fallback de papel administrativo pelo nome Ricardo/Lohan/Guilherme quando o papel está vazio;
- senha mínima divergente: Normal 6, Team Lite 4;
- `/api/chat/clear` autorizado pelo nome `Ricardo`, sem conferir o papel persistido.

Produção tem cinco contas no snapshot; nenhuma está sem hash de senha ou papel. Não foi reproduzida tomada de conta. O achado é um fluxo legado ainda implantado, não uma exploração observada.

No laboratório existem as quatro colunas `setup_token_*`, `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`. As duas RPCs são SECURITY INVOKER, `search_path` vazio e EXECUTE somente para `service_role`. Produção não tem essas colunas nem a RPC de consumo. O candidato Team Lite #76 e a linha Normal #74/#161 já têm fluxo de convite em código/testes, mas ainda não estão implantados.

## 5. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

Consulta SQL read-only encontrou **106 mensagens em produção, todas `private=false`**, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Os clientes instalados assinam outro tópico: `upstatus-screen-share-live-3-1-1-beta10`.

`realtime.messages` tem RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated. O trigger de mensagens publica registros OLD/NEW completos. Não houve broadcast de teste, exploração externa ou captura de mídia nesta auditoria; o acesso externo efetivo não foi reproduzido.

### RLS e grants

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Tabelas public com RLS e sem policies | 10 | 18 |
| Grants diretos anon/auth em tabelas public | 126 | 0 |
| Grants TRUNCATE anon/auth em public | 18 | 0 |
| Buckets Storage | 2 | 0 |
| Policies próprias em storage.objects | 0 | 0 |

Em produção, os 126 grants correspondem a nove tabelas, para anon e authenticated, com DELETE/INSERT/REFERENCES/SELECT/TRIGGER/TRUNCATE/UPDATE. TRUNCATE não é limitado por RLS.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, `search_path=public`, com EXECUTE para anon/authenticated/service_role. O Security Advisor reporta três WARN para anon e três para authenticated. São funções de trigger; não foi demonstrada chamada RPC externa direta. O risco concreto observado é o broadcast público com payload de mensagens completo.

No laboratório, as três funções têm `search_path` vazio e EXECUTE restrito a service_role. As tabelas public não têm grants diretos de clientes, mas `realtime.messages` continua sem policies e com grants SELECT/INSERT/UPDATE para anon/authenticated. Default ACLs de supabase_admin em public/GraphQL e de postgres em Storage ainda incluem privilégios amplos para clientes.

### Storage e upload assinado

Produção:
- `chat-images`: público, limite 20 MiB, 168 objetos;
- `profile-images`: público, limite 20 MiB, 20 objetos;
- zero policies próprias em `storage.objects`.

A #167 valida contratos de URL/token/origem/path e limites declarados, mas não inspeciona magic bytes e retorna URL pública. Sem decisão de bucket privado/quarentena e teste real de upload/download, ACL-STORAGE não pode ser concluído.

## 6. Migrations, isolamento e logs

- Produção: sete migrations no ledger.
- Laboratório: 39 migrations.
- Branch Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Os quatro SQLs originais abaixo retornam 404 no repositório master:
  1. `20261023154754_create_upstatus_visual_config.sql`
  2. `20261026195855_add_chat_message_file_name.sql`
  3. `20261027154329_allow_chat_document_mime_types.sql`
  4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

O laboratório tem zero usuários, mensagens, sessões, estado, mensagens Realtime e objetos Storage; não possui buckets. É fixture de segurança/sinalização, não Full-Product TEST.

Nos logs das últimas 24 horas, as únicas fontes disponíveis foram `pgbouncer_logs` e `postgres_logs`; não havia `edge_logs` ou `function_edge_logs`. Não é possível calcular HTTP 402 ou afirmar recuperação de Edge Functions nesta janela.

## 7. Issues e aceitação manual

- Issue #78 permanece OPEN com **0/8** critérios de reconexão física.
- Issue #79 permanece OPEN com **16/35** itens marcados.
- Nenhum teste manual foi executado nesta auditoria.
- Não há confirmação física de reconexão sem F5, áudio bidirecional real, microfone/tela reais ou interoperabilidade no Sale Smartly.
- Não foram encontradas reviews humanas submetidas nas PRs principais.

## 8. PR auxiliar #172 — decisão pendente

A PR [#172](https://github.com/Reekyi/UpStatus/pull/172) está fechada como merged, com merge commit `01ef40243140015e36e303447a3e158ec37a040e`, tendo como base a branch candidata `fix/master-chat-paste-staging-20261114`. O efeito ficou restrito à candidata #167; não atingiu master, develop, team-lite-official ou produção.

**Ação necessária de Ricardo:** decidir se mantém ou reverte o estado merged da PR auxiliar #172. Nenhum rollback foi executado pela QA.

## 9. Gates e recomendação

| Gate | Estado QA | Evidência |
|---|---|---|
| RT-01 | blocked | 106 eventos públicos, tópicos divergentes, clientes sem private/auth |
| TEST-ISOLATION | blocked | laboratório sem fixtures de produto |
| MIGRATION-PROVENANCE | blocked | quatro SQLs 404 e main MIGRATIONS_FAILED |
| AUTH-03 | blocked | runtimes ainda com setup legado; migrations/RPCs ausentes em produção |
| ACL-STORAGE | blocked | grants amplos, funções SECURITY DEFINER, buckets públicos e sem policies |
| RECONNECT | pending | Issue #78 0/8; requer teste físico confirmado por Ricardo |
| HUMAN-REVIEW | pending | PRs Draft, sem reviews/aprovação/autorização de release |

### Próximos passos recomendados

1. Integrar #167 com #161 e #168 em um único candidato Normal; reconciliar anexos staged, upload assinado, rate limit e contrato HTTP 429.
2. Definir versão estável maior que 3.4.7 e coordenar manifesto, build, updateURL, API target e atualização dos clientes existentes.
3. Corrigir #82 sem remover assertions e resolver o Validate herdado de #125.
4. Integrar a cadeia de segurança de publicação Team Lite (#125/#126/#128/#129) somente após revisão independente e aprovação humana; manter workflow legado bloqueado até lá.
5. Implantar e validar transporte server-mediated de voz/tela em ambiente completo antes de remover canais públicos sensíveis; o helper de laboratório não é produção.
6. Completar AUTH-03 nos dois runtimes, com convite único, rate limit e autorização administrativa server-side.
7. Corrigir grants/default ACLs, decidir Storage privado, adicionar inspeção de conteúdo/quarentena e alinhar limites.
8. Recuperar os quatro SQLs de fonte autoritativa e diagnosticar `MIGRATIONS_FAILED`.
9. Provisionar Full-Product TEST e concluir os oito critérios físicos da #78.

**Veredito: NOT READY. Não recomendar merge/release/publicação.**

## Integridade

Todas as consultas SQL foram SELECT-only. GitHub e Supabase foram inspecionados em modo read-only. Não houve teste manual, merge em branches oficiais, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. A única escrita no repositório é este arquivo novo na branch QA; nenhuma alteração concorrente foi sobrescrita.
