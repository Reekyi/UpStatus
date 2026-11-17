# Auditoria independente UpStatus — 2026-11-11 01:52 UTC

**Escopo:** GitHub `Reekyi/UpStatus`, branch QA `qa/release-readiness-2026-11-04-master`, Supabase produção `dlfvkawaiqduhlazsszm` e laboratório isolado `bfpjtfqlnypisxljoxkb`.

**Método:** leitura integral do documento de prontidão via blob, inspeção read-only de branches/PRs/workflows/diffs, inspeção estática dos templates e runtimes Edge implantados, consultas SQL exclusivamente SELECT em catálogos e contagens. Não foram executados testes locais, requisições de escrita, testes físicos, migrations ou workflows manuais.

## 1. Heads e integridade documental

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `2f3eb0b2f62b82ed5c0eba04e941fda6b2ab1818` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #141 | `61d00fb8666f4ca91c5a3c52a415d877b31a10cf` |
| PR #140 | `8493ece4f722936a6f084341ef0195dc6766190d` |

A QA está **206 commits à frente e 1 atrás** de `master`. Não fiz rebase nem incorporei o commit master-only. O relatório desta rodada foi criado como arquivo novo, sem substituir o documento principal.

`docs/RELEASE_READINESS.md` foi lido integralmente pelo blob `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.410 linhas. O último checkpoint existente no documento é 08/11/2026 18:30 UTC; não havia append posterior.

## 2. PRs, CI e revisão humana

| PR | HEAD | Evidência observada | Classificação |
|---|---|---|---|
| #74 Normal | `fb878537` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | CI PASS |
| #75 Team Lite | `7bbf9b90` | [Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico limitado; não é suíte completa |
| #76 Team Lite | `3b1406dd` | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | CI PASS |
| #82 QA | `2f3eb0b` | [Validate 42932766838](https://github.com/Reekyi/UpStatus/actions/runs/42932766838) | CI FAIL |
| #89 AUTH-03 | `5c46eea` | [Cutover Guard 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | Guard PASS; cutover bloqueado |
| #133 Normal | `8d38036` | [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | 136/136 CI |
| #134 Team Lite | `ee246aa` | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) | 110/110 CI |
| #140 Migration Parity | `8493ece` | [Validate 42928939793](https://github.com/Reekyi/UpStatus/actions/runs/42928939793) | PASS offline, push-only |
| #141 staged chat | `61d00fb` | [Push Validate 42936942318](https://github.com/Reekyi/UpStatus/actions/runs/42936942318) e [PR Validate 42936993580](https://github.com/Reekyi/UpStatus/actions/runs/42936993580) | Ambos PASS |

A #76 é continuação da baseline #75, não uma candidata independente. A #141 é Draft, tem 17 commits e 6 arquivos, é baseada no master atual e não possui review humana. As PRs #74, #75, #76, #82 e #140 também não possuem reviews registradas nesta consulta.

### QA #82

O log do HEAD atual mostra build `3.4.7 / TEST 3.4.7` e falha em `production updateURL mismatch` (`scripts/validate.mjs`). O defeito é herdado da base e a correção de URL está na candidata #141, ainda não integrada à QA. O validator não foi relaxado.

### PR #140

O guard compara estaticamente o bloco compartilhado da migration AUTH-03 e restringe o sufixo de assertions do laboratório. O workflow `.github/workflows/migration-parity-candidate.yml` contém apenas `push` para a branch candidata; não houve check PR-triggered no HEAD consultado. O teste não aplica SQL nem comprova o estado remoto.

## 3. PR #141 — correção de updater e anexos em etapas

A #141 resolve a divergência de URL de distribuição: o build deriva `@updateURL` e `@downloadURL` de `release.json` e mantém a API Normal no runtime beta10. Isso é compatível com a topologia dual-runtime atualmente implantada e evita um cutover implícito. A candidata não altera `release.json`: a versão permanece 3.4.7.

O workflow específico `staged-chat-candidate-validate.yml` é push-only. O Validate geral também executou no evento pull request e passou. Ambos executaram `node scripts/validate.mjs` sem secrets ou conexão com Supabase.

### F-01 — alterações de servidor não chegam à API que o cliente usa

**Severidade: alta / bloqueador de integração.**

Em `scripts/build.mjs` da #141:
- `PROD_FUNCTION` é `upstatus`;
- `PROD_API_FUNCTION` continua `upstatus-screen-share-3-1-1-beta10`;
- `renderFunction` gera apenas `upstatus` e `upstatus-test`.

O userscript gerado continua enviando tráfego de API para beta10. Entretanto, as alterações de servidor da PR estão em `src/server/index.template.ts`, que é gerado para `upstatus`, não para beta10.

A comparação com o runtime beta10 v6 confirma:
- o endpoint `POST /api/chat/upload-url` existe;
- `chatRoute` não contém `file_name` nem `fileName`;
- a inserção da mensagem não persiste o nome do documento;
- `/api/chat/clear` ainda verifica `name !== "Ricardo"`.

O banco de produção já possui a coluna `messages.file_name`, mas a API ativa não a usa.

O novo cliente preenche `created.fileName` apenas no cache local quando a resposta não contém o campo e envia o evento rápido com `r.message`. Assim, o remetente pode ver o nome temporariamente; outros clientes e uma recarga não recebem o nome persistido. A biblioteca de documentos perde o nome original e pode cair na legenda.

### F-02 — autorização de limpar chat inconsistente

A nova UI exibe a ação para o papel `implementation_admin` e o handler cliente também verifica esse papel. Mas o runtime beta10 ativo continua exigindo o nome Ricardo no endpoint. Outros administradores podem ver o botão e receber HTTP 403.

A alteração role-based do template não corrige a API beta10 enquanto o cliente continuar apontando para ela.

### F-03 — regressão de anexos sem teste de navegador

`scripts/chat-regression.test.mjs` usa VM para `processChatNotifications` e verifica o restante principalmente por presença de strings no código. `scripts/validate.mjs` chama esse teste, mas não simula seleção/colagem, remoção, retry, falha de upload, persistência de arquivo ou interação DOM real.

A aprovação da #141 é build/validação estática e regressão limitada; não é teste browser do fluxo de anexos.

### F-04 — uploads órfãos e validação de conteúdo

O cliente faz upload assinado e depois cria a mensagem. Se o PUT funcionar e o POST de criação da mensagem falhar, o catch remove o item otimista, mas não remove o objeto já enviado. O retry pode gerar outro caminho e deixar o primeiro objeto órfão.

O `signedUploadRoute` do runtime beta10 valida MIME e tamanho declarados pelo cliente e cria a URL assinada; não inspeciona os bytes enviados antes de assinar. Isso é inspeção estática, não exploração. Os buckets de chat são públicos, portanto a validação de conteúdo e a política de acesso precisam ser definidas antes de liberar anexos.

## 4. Supabase — produção

Snapshot read-only em `dlfvkawaiqduhlazsszm`:

| Verificação | Resultado |
|---|---:|
| Migrations registradas | 7 |
| Edge Functions ativas | 38 |
| Mensagens em `realtime.messages` | 67 |
| Mensagens com `private=false` | 67 |
| Tabelas públicas RLS sem policies | 10 |
| Tabelas públicas com grants para anon/authenticated | 9 |
| Entradas de grants nessas tabelas | 126 |
| Registros Default ACL | 24 |
| Entradas Default ACL para papéis clientes | 120 |
| Buckets públicos | 2 |
| Policies em `storage.objects` | 0 |

As mensagens Realtime estão no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 35 `user_status`;
- 20 `db_change`;
- 6 `remote_command`;
- 6 `remote_result`.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são `SECURITY DEFINER`, `search_path=public`, retornam `trigger` e estão anexadas a triggers. Seus ACLs incluem EXECUTE para anon, authenticated e PUBLIC, além dos papéis de backend. **Nuance:** por retornarem `trigger`, não são RPCs PostgreSQL comuns; não foi demonstrada invocação direta. O problema concreto é o trigger emitir broadcasts com `private=false`, payload de mensagem com `to_jsonb(OLD/NEW)` e grants amplos desnecessários.

As nove tabelas backend-owned concedem privilégios diretos a anon/authenticated, incluindo TRUNCATE. RLS sem policies bloqueia operações normais por linha, mas não é proteção contra TRUNCATE. Nenhuma operação foi tentada.

Os Default ACLs permanecem amplos em schemas `public` e `storage` (owner postgres) e `public`/GraphQL (owner supabase_admin). `storage.objects` tem grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated e nenhuma policy própria.

Buckets:
- `chat-images`: público, 20 MiB;
- `profile-images`: público, 20 MiB.

### Edge Functions e AUTH-03

`upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281 e API Normal beta10 v6 permanecem ativos. O metadata `verify_jwt=false` em si não prova ausência de autenticação: os handlers têm validação customizada de sessão.

Os runtimes implantados Normal, Team Lite e TEST consultados ainda não contêm `file_name` na API nem a implementação server-mediated `upstatus-signal`. O catálogo de produção não contém as tabelas de convite/rate-limit AUTH-03 nem a RPC `consume_upstatus_setup_invite`. A função de sinalização autenticada não está implantada em produção.

A função `upstatus-screen-share-3-1-1-beta10` v6 tem rota signed-upload, mas o handler valida apenas os metadados declarados. O limite do bucket é 20 MiB. A rota legada `mediaRoute` permite até 25 MiB para imagens/vídeos, acima do limite do bucket.

## 5. Laboratório isolado

Snapshot read-only em `bfpjtfqlnypisxljoxkb`:

- 39 migrations;
- 18 tabelas públicas com RLS e sem policies;
- zero grants diretos em tabelas públicas para anon/authenticated;
- 25 registros Default ACL, com 96 entradas para papéis clientes;
- zero mensagens Realtime;
- zero buckets Storage.

Contagem de fixtures: zero usuários, mensagens, sessões, salas, membros, eventos, bindings, tentativas de chamada/voz e linhas de rate limit. O laboratório está limpo e isolado para os testes atuais, mas não é um TEST full-product endurecido: Default ACLs em storage/GraphQL e grants de storage/realtime ainda precisam de revisão.

A Edge Function `upstatus-signal-test` v32 não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`. Mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409; o código ausente pode cair no fallback 500. A fonte candidata pode ter o mapeamento, mas o endpoint implantado não foi chamado nesta auditoria.

## 6. Proveniência de migrations

As quatro migrations históricas aparecem no ledger de produção, mas os quatro arquivos originais retornam 404 em `master`:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #140 protege a paridade de uma migration candidata AUTH-03; não recupera esses quatro arquivos históricos byte a byte.

## 7. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta; os oito critérios físicos continuam desmarcados. Não houve queda real de internet, recuperação sem F5 ou teste manual de voz nesta execução.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): o comentário QA dedicado existente foi atualizado. O comentário da Engenharia foi preservado. Não foi criado comentário duplicado.

## 8. Classificação final

**CI PASS:** #74, #76, #133, #134, #140 (offline/push-only) e os dois Validate da #141.

**CI FAIL:** #82 no HEAD QA atual, por `production updateURL mismatch`.

**Inspeção de código:** integração #141 cliente/API, autorização de limpar chat, persistência de nome de documento, signed upload, cobertura de regressão, Edge Functions, RLS, grants, Default ACLs, Storage e funções de broadcast.

**Manual pendente:** os oito critérios da Issue #78, incluindo reconexão sem F5 e interoperabilidade Normal/Team Lite.

**Bloqueado:** publicar #141 sem alinhar API beta10; ativar AUTH-03 em produção; migrar Realtime privado/autorizado; recuperar proveniência dos quatro SQLs; endurecer grants/ACLs/Storage; release sem versão nova e aprovação humana.

## 9. Próximos passos recomendados

1. Portar `file_name` e autorização por papel para o runtime API efetivamente usado pelo cliente, ou planejar um cutover de API separado com compatibilidade e guard de migrations.
2. Adicionar testes HTTP/browser para o ciclo completo de anexos e a autorização de limpar chat em usuário administrador e não administrador.
3. Validar bytes/MIME no servidor antes de emitir upload assinado e criar limpeza/idempotência para uploads órfãos.
4. Escolher uma nova versão estável antes de qualquer publicação; 3.4.7 não é um release novo.
5. Corrigir e validar o workflow Team Lite para `upstatus-team-lite`, SHA/projeto exatos e CLI fixada.
6. Tornar a sinalização server-mediated autenticada obrigatória em Normal e Team Lite; retirar a autoridade dos broadcasts públicos.
7. Endurecer grants, Default ACLs, Storage e política de privacidade dos buckets.
8. Recuperar os quatro SQLs originais e validar proveniência.
9. Validar HTTP 409 no runtime isolado e concluir os oito testes físicos da #78.
10. Obter review humana e autorização explícita antes de release.

**Veredito: NOT READY.**

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve migration, deploy, merge, release, alteração de secrets/flags, publicação de userscript ou operação destrutiva. A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.
