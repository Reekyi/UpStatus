# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-11 23:45 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## Escopo e método

Foram reavaliados os HEADs reais, PRs #74, #75, #76, #82, #131, #141, #142, #143, #145 e #146, workflows e logs, os bundles implantados Normal/Team Lite, o documento `docs/RELEASE_READINESS.md`, catálogo PostgreSQL, Security Advisor, migrations e inventário de Edge Functions.

As consultas SQL desta auditoria foram SELECT-only. Não houve execução manual de browser/HTTP, mutação de fixtures por iniciativa da QA, rerun, merge, deploy, release, migration ou alteração de configuração.

O documento `docs/RELEASE_READINESS.md` foi lido integralmente: 8.410 linhas. O último checkpoint interno continua em **2026-11-08 18:30 UTC**, portanto a fotografia histórica do documento está defasada em relação às candidatas e workflows de 11/11. Este relatório é um append independente; o documento principal não foi alterado.

## HEADs e relações entre candidatas

- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`
- QA antes deste relatório: `65f1832274f30989ab8c98aaeae2ae861e3207f3`
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
- PR #74: `fb878537` (Normal)
- PR #75: `7bbf9b90` (Team Lite baseline)
- PR #76: `5f112e885a6f7f027be4de7b1ea6209d06ad0905` (Team Lite)
- PR #82: `65f1832274f30989ab8c98aaeae2ae861e3207f3` (QA)
- PR #131: `17169a3` (AUTH-03/rate limit)
- PR #141: `4dba481`
- PR #142: `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4`
- PR #143: `c4a04fa755b877bc76b1372170a26e7b974264e6`
- PR #145: `bbfda9dfe53f25535c697586fce63917ee674e1f`
- PR #146: `71c5ce2f730ade8ee3e8b090498202933809ce5c`

A QA estava **232 commits à frente e 1 atrás** de master. A #146 está 8 commits à frente de #142, sem commits atrás. A #143 divergiu da branch atual de #142: 15 commits à frente e 2 atrás. Portanto, o dispatcher não contém automaticamente os últimos commits da API/cliente; a integração deve ser reconciliada, não presumida.

## Achados prioritários

### P0 — bundles instalados ainda confiam em comandos Realtime públicos

As fontes implantadas foram inspecionadas e os userscripts embutidos decodificados:

- Normal `upstatus` v480, userscript 3.4.7.
- Team Lite `upstatus-team-lite` v15, userscript 3.4.30.
- API beta10 v6 ainda embute userscript 3.1.1-beta8.

Nos bundles instalados Normal e Team Lite, o listener `remote_command` extrai `payload.command` e chama `executeRemoteCommand(c)` quando o destinatário coincide com o membro local. A verificação de sessão local do Team Lite não autentica o remetente do broadcast. Os listeners de `call_signal`, voice-room e screen-share também entregam payloads recebidos aos handlers locais.

A #145/#146 e a candidata Team Lite #76 adotam o padrão mais seguro: broadcast apenas como aviso e polling autenticado para recuperar o comando. Isso ainda não está nos runtimes instalados nem integrado ao dispatcher #143.

Evidências: [#145](https://github.com/Reekyi/UpStatus/pull/145), [#146](https://github.com/Reekyi/UpStatus/pull/146), [Validate #146](https://github.com/Reekyi/UpStatus/actions/runs/43108250452).

### P1 — PR #76 falha por asserção estática incompatível com a implementação

O HEAD atual da #76 falhou no run [43117728611](https://github.com/Reekyi/UpStatus/actions/runs/43117728611), na linha 129 de `scripts/team-lite-candidate-check.mjs`.

A asserção exige literais específicos:
- `if(remotePollHintTimer||!isAuthenticated())return;`
- `if(isAuthenticated()&&expectedGeneration===authGeneration&&expectedMember===member)pollRemoteStatus();`

O código atual faz a checagem de autenticação antes da checagem do timer e, no callback, valida geração, membro **e token** antes do polling. A lógica observada é semanticamente mais forte que a string exigida pelo teste. Assim, o CI está vermelho por um contrato estático excessivamente rígido; isso não demonstra defeito funcional no timer. Ainda assim, a PR não está aprovada enquanto o check falhar.

Os passos anteriores do mesmo job passaram, incluindo:
- build-target guard e isolamento;
- contrato de signaling autenticado;
- first-access enrollment;
- recuperação de voice-room e screen-share;
- smoke do IIFE completo;
- concorrência de rate limit de signaling e convites;
- atomicidade de chat receipts.

Esses testes usaram o projeto isolado, com opt-in explícito para mutação de fixtures no próprio workflow. A QA não executou essas mutações.

### P1 — transporte autenticado de voz/tela continua opt-in

Na candidata Team Lite #76, `signaling_transport_enabled` tem default `false` e o endpoint de transporte não vem configurado. Com a flag desligada, os caminhos legados de `call_signal`, voice-room e screen-share continuam ativos. A #146 corrige remote-command, não substitui a sinalização pública de voz/tela.

O transporte server-mediated existe no laboratório (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3), mas não foi encontrado como função implantada em produção.

### P1 — AUTH-03 existe no laboratório, não nos runtimes de produção

A produção não possui colunas `setup_token_*`, tabela de rate limit de convites ou RPCs de consumo/emissão. Os três runtimes inspecionados continuam roteando `POST /api/setup` para `login(req,true)`, que permite configurar conta ainda sem hash de senha sem token de convite.

No código implantado, Normal exige senha mínima de 6 caracteres e Team Lite 4; a política não é uniforme. O fallback de papel também atribui papel administrativo por nome quando o papel está vazio. As contas atuais consultadas possuem hash e papel, mas isso não corrige o fluxo para contas futuras sem configuração.

O laboratório possui:
- `upstatus_setup_invite_rate_limits`;
- `users.setup_token_hash`, `setup_token_issued_at`, `setup_token_expires_at`, `setup_token_issued_by`;
- RPCs de convite/rate limit SECURITY INVOKER, `search_path` vazio.

A implementação #131 passou anteriormente em 136/136; a #76 também executou os testes de enrollment e rate limit no run atual antes da falha estática. A API #142 ainda não contém esse fluxo. A emissão de convite é limitada; não foi encontrado rate limit de tentativas de login.

Evidências: [#131](https://github.com/Reekyi/UpStatus/pull/131), [#76](https://github.com/Reekyi/UpStatus/pull/76).

### P0 — Realtime público e tópico divergente

Snapshot de `realtime.messages` em produção:
- 109 linhas observadas, todas `private=false`;
- 57 `user_status`, 40 `db_change`, 6 `remote_command`, 6 `remote_result`;
- tópico dos triggers: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`;
- clientes instalados: tópico beta10 `upstatus-screen-share-live-3-1-1-beta10`.

RLS está habilitado em `realtime.messages`, FORCE RLS está desabilitado, há zero policies e anon/authenticated possuem SELECT, INSERT e UPDATE. As três funções de broadcast continuam SECURITY DEFINER, com `search_path=public`; o Advisor reporta 3 WARN para anon e 3 WARN para authenticated. O trigger de mensagens publica OLD/NEW completos via `to_jsonb`.

Não houve exploração ou publicação de payloads. O achado é de arquitetura e código/catálogo implantado.

### P1 — grants, Default ACL e Storage

Produção:
- 10 tabelas públicas com RLS e zero policies;
- nove tabelas com grants diretos amplos;
- 63 linhas de grants para anon e 63 para authenticated, total 126;
- privilégios incluem DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE;
- Default ACL: 120 itens para anon/authenticated entre postgres e supabase_admin;
- buckets `chat-images` e `profile-images` públicos, limite 20 MiB;
- 168 objetos em chat-images e 20 em profile-images.

RLS não protege TRUNCATE. A exposição efetiva externa não foi testada.

### P2 — metadados de anexos

A tabela `messages` tem 296 registros: 241 text, 22 system, 17 image, 7 audio, 5 document e 4 video. Todos os 296 registros estão com `file_name IS NULL`, inclusive os cinco documentos. Isso é uma observação de catálogo/dados, não prova isolada de perda de arquivo; exige reconciliar o contrato de metadados e a UI de anexos.

## CI observado

| Candidato | Resultado observado |
|---|---|
| #74 | último Smoke/Validate conhecido PASS; confirmar SHA exato antes de tratar como gate atual |
| #75 | PASS histórico; não substitui #76 |
| #76 | **FAIL** no HEAD atual, asserção estática na linha 129 |
| #82 QA | **FAIL** em [43112740851](https://github.com/Reekyi/UpStatus/actions/runs/43112740851), `production updateURL mismatch` em `scripts/validate.mjs:26` |
| #131 | PASS histórico, 136/136 |
| #141 | Validate PASS em [43085700956](https://github.com/Reekyi/UpStatus/actions/runs/43085700956) |
| #142 | Validate PR PASS em [43085494740](https://github.com/Reekyi/UpStatus/actions/runs/43085494740) |
| #143 | Validate PR PASS em [43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347); Guard push PASS em [43093394788](https://github.com/Reekyi/UpStatus/actions/runs/43093394788); deploy SKIPPED |
| #145 | Validate PASS em [43100913884](https://github.com/Reekyi/UpStatus/actions/runs/43100913884) |
| #146 | Validate PR PASS em [43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) |

O #82 continua falhando porque o build gera 3.4.7/TEST 3.4.7 e o validator rejeita o `updateURL` de produção. Não houve rerun.

## Supabase e ambientes

- Produção: 7 migrations; 38 Edge Functions ativas.
- Laboratório: 39 migrations; 2 Edge Functions ativas; zero grants diretos de tabela pública para anon/authenticated; fixtures de aplicação consultadas vazias.
- Branch Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`. A causa do status da branch não foi diagnosticada.
- A organização consultada não apresentou um terceiro projeto full-product TEST. O laboratório de signaling/auth não deve ser tratado como ambiente completo de aceitação.

O indicador `verify_jwt=false` aparece no inventário das Edge Functions. Isso não prova, sozinho, ausência de autenticação: os três handlers principais inspecionados usam sessão customizada. A cobertura de todas as 38 funções não foi concluída.

## Classificação e gates

- **CI:** resultados citados acima, sempre vinculados ao SHA/run.
- **Inspeção de código/catálogo:** bundles, handlers, Realtime, grants, ACL, migrations e Storage.
- **Teste manual:** nenhum nesta execução.
- **Pendente:** reconexão física Normal/Team Lite sem F5, microfone/tela reais, interoperabilidade instalada e aprovação humana.
- **Bloqueado:** RT-01, full-product TEST, proveniência de quatro SQLs, ACL/Storage e integração AUTH-03.

| Gate | Estado QA |
|---|---|
| RT-01 | blocked |
| TEST-ISOLATION | blocked |
| MIGRATION-PROVENANCE | blocked |
| AUTH-03 | in_progress |
| ACL-STORAGE | blocked |
| RECONNECT | pending |
| HUMAN-REVIEW | pending |

## Próximas ações recomendadas

1. Integrar #146 e #145 ao stack que será validado pelo dispatcher; não publicar o handler antigo da #143.
2. Corrigir o teste estático da #76 para verificar invariantes sem exigir a mesma forma textual do código.
3. Tornar signaling de voz/tela autenticado e default seguro, com endpoint e membership server-mediated; remover fallback público sensível.
4. Integrar AUTH-03 no Normal e Team Lite e adicionar proteção específica contra tentativas de login.
5. Alinhar tópico/contrato Realtime entre banco, Normal e Team Lite; retirar payload completo de mensagens.
6. Reconciliar #143 com os HEADs atuais de #142/#146 e incluir a migration AUTH-03 no preflight.
7. Recuperar os quatro SQLs originais; não promover statements recuperados do ledger a arquivos originais.
8. Corrigir grants/Default ACL/Storage por mudança revisada e autorizada.
9. Corrigir o Validate da QA e provisionar ambiente full-product TEST.
10. Executar aceitação física sem F5 e obter aprovação humana explícita.

**Nenhuma alteração de produção foi realizada.** Consultas SQL foram SELECT-only. Nenhuma migration, escrita SQL, fixture, flag, secret, grant, policy, ACL, merge, deploy, release ou publicação de userscript foi executada pela QA.
