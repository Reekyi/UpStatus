# Auditoria independente de qualidade — UpStatus
**Execução:** 2026-11-16 08:46 UTC  
**Recomendação:** `not_ready`  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.

## 1. Resultado executivo

A liberação continua bloqueada. Os principais riscos atuais são:

1. O workflow de TEST em `master` usa o mesmo `SUPABASE_PROJECT_ID` genérico da publicação e o build de master fixa o projeto de produção também no artefato TEST. A função `upstatus-test` está, de fato, ativa dentro do projeto de produção.
2. Normal e Team Lite implantados ainda permitem primeiro setup sem convite e usam o nome `Ricardo` como autorização de limpeza global do chat, sem validar o papel persistido no servidor.
3. Realtime de produção tem 106 mensagens `private=false`; grants de cliente e três triggers `SECURITY DEFINER` continuam amplos.
4. O workflow oficial Team Lite publica o slug `upstatus`, não `upstatus-team-lite`.
5. As correções estão distribuídas por candidatas separadas; não existe um HEAD integrado que reúna autenticação, uploads, updater e Retry-After e tenha Validate + Smoke completos.
6. Não há Full-Product TEST separado, e os oito critérios físicos da Issue #78 continuam pendentes.

Nenhum teste físico foi executado nesta rodada. Os resultados CI abaixo são execuções históricas inspecionadas, não testes disparados agora.

## 2. Refs e documentação

| Branch | HEAD confirmado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `a92f7be95709ffcf5c3b12010315b3ad904149d7` |

QA está 363 commits à frente e 1 atrás de master. A comparação confirma que QA permanece documental: o conjunto divergente contém `docs/RELEASE_READINESS.md` e relatórios em `docs/audits/`.

O arquivo `docs/RELEASE_READINESS.md` foi lido integralmente pelo blob atual (8.422 linhas). O snapshot mais recente dentro dele é de **2026-11-15 06:30 UTC**, portanto está desatualizado em relação a esta execução.

**Proteção de branches:** o endpoint de branch protection retornou HTTP 403 para as branches oficiais; `/rulesets` retornou lista vazia. Assim, não foi possível confirmar proteção efetiva nem afirmar que esteja ausente. Registrar como não verificável pela integração atual.

Links:
- [Comparação master → QA](https://github.com/Reekyi/UpStatus/compare/master...qa/release-readiness-2026-11-04-master)
- [Documento de prontidão](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md)

## 3. PRs solicitadas e CI

| PR | HEAD examinado | Evidência | Resultado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | Validate + Smoke PASS |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `a92f7be95709ffcf5c3b12010315b3ad904149d7` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43818526224) | FAIL |

### #74 — Normal

O log de Smoke registra 136/136 verificações autenticadas, negociação WebRTC com entrega de tracks remotas de áudio e vídeo, malha de três participantes, recuperação/limpeza de peers, limite distribuído de 90 aceitos + 1 rejeitado com HTTP 429 e Retry-After, concorrência de receipts e testes de setup por convite.

É evidência de CI com browser automatizado e projeto de sinalização isolado. Não é teste físico no Sale Smartly.

O build candidato:
- usa `UPSTATUS_TEST_PROJECT_ID`;
- rejeita o projeto de produção e o projeto isolado de sinalização como destino de Full-Product TEST;
- usa sentinel inerte quando o projeto dedicado não está configurado;
- valida `release.json.scriptUrl` contra o endpoint de distribuição;
- fixa Supabase CLI em 2.122.1 nos workflows candidatos.

O workflow candidato de TEST exige `vars.SUPABASE_TEST_PROJECT_ID`, verifica que não seja produção nem o laboratório de sinalização e restringe execução a `develop`. Como não existe terceiro projeto Full-Product TEST, o guard deve falhar fechado; não deve ser contornado.

### #75 e #76 — Team Lite

#75 é baseline histórico, não uma segunda entrega independente. #76 é a candidata mais atual, versão 3.4.31, e passou 110/110 verificações autenticadas, além de testes de browser para chamada, voz, compartilhamento de tela, mesh e teardown.

O transporte autenticado continua opt-in: `signaling_transport_enabled` tem default `false`. Com a flag desligada, o cliente mantém os caminhos públicos Realtime de chamada, voz e tela. Não marcar RT-01 como concluído com base nesses testes.

A candidata #76 já inclui convites de primeiro acesso e rate limit, mas seu contrato de upload ainda é menos rígido que o Normal #167: o cliente não valida origem/caminho/token/bucket com a mesma abrangência, não usa `credentials: 'omit'` nem `redirect: 'error'`; o servidor também não valida origem e caminho retornados com a mesma profundidade do Normal.

### #82 — QA

O Validate no HEAD exato falhou após gerar `Built UpStatus 3.4.7 / TEST 3.4.7`:

`VALIDATION FAILED: production updateURL mismatch`.

A causa foi confirmada comparando os arquivos atuais de master:
- `release.json` aponta para `.../functions/v1/upstatus/upstatus.user.js`;
- `scripts/build.mjs` de master ainda constrói o updateURL de produção a partir do endpoint beta10.

A candidata #74 já corrige essa separação, mas a correção não está em master.

### Candidatas auxiliares e integração

| PR | Estado e evidência relevante |
|---|---|
| [#161](https://github.com/Reekyi/UpStatus/pull/161) | Aberta/Draft, base #74. Alinha API Normal com `upstatus`, convite e rate limit. |
| [#168](https://github.com/Reekyi/UpStatus/pull/168) | Aberta/Draft, empilhada sobre #161. Retry-After 900; Validate PASS, sem Smoke. |
| [#167](https://github.com/Reekyi/UpStatus/pull/167) | Aberta/Draft, base master. Anexos pendentes, upload assinado e papel persistido para limpeza do chat; Validate PASS, sem Smoke. Ainda mantém fallback de papel administrativo por nome no setup. |
| [#170](https://github.com/Reekyi/UpStatus/pull/170) | Aberta/Draft. Validate FAIL: a regressão espera upload imediato, incompatível com o contrato `pendingUpload` da #167. |
| [#171](https://github.com/Reekyi/UpStatus/pull/171) | Aberta/Draft, Team Lite. Teste dedicado de papel administrativo PASS; ainda não inclui convite obrigatório no setup. |
| [#174](https://github.com/Reekyi/UpStatus/pull/174) | Aberta/Draft, develop. Backport de upload assinado; Validate PASS. |
| [#175](https://github.com/Reekyi/UpStatus/pull/175) | Aberta/Draft, develop. Teste dedicado de papel administrativo PASS, mas Validate geral FAIL por falta do helper de upload da #174. |

As quatro PRs solicitadas (#74, #75, #76, #82) não têm review humana submetida no snapshot consultado. As candidatas auxiliares também permanecem separadas e não integradas em um HEAD de release.

## 4. Workflows e isolamento de TEST

### Master atual

`scripts/build.mjs` define:
- `PROJECT = dlfvkawaiqduhlazsszm`;
- `PROD_FUNCTION = upstatus`;
- `TEST_FUNCTION = upstatus-test`.

O mesmo `PROJECT` é usado para montar a URL de TEST. O workflow `.github/workflows/deploy-test.yml` também usa o secret genérico `SUPABASE_PROJECT_ID`, sem allowlist do projeto, e executa:

`supabase functions deploy upstatus-test --project-ref "$SUPABASE_PROJECT_ID" --use-api`.

O workflow de produção usa o mesmo nome de secret e CLI `latest`. O risco concreto é o deploy de TEST atingir o projeto de produção se o secret genérico estiver configurado para produção. Não inspecionei valores de secrets.

A função `upstatus-test` está atualmente ACTIVE no próprio projeto de produção, versão 281, com userscript embutido 3.3.28. Isso confirma que o runtime TEST não representa um Full-Product TEST isolado.

### Team Lite oficial

`.github/workflows/deploy-production.yml` em `team-lite-official` usa `SUPABASE_PROJECT_ID`, CLI `latest` e publica o slug **`upstatus`**, não `upstatus-team-lite`. Não despachar esse workflow até a correção e validação do destino.

### Candidatas

Os guards de #74/#76 são melhores: exigem projeto TEST dedicado, rejeitam produção e laboratório de sinalização, e fixam a CLI. O bloqueio correto é que o projeto dedicado ainda não existe.

## 5. Runtimes implantados e compatibilidade

| Componente | Produção |
|---|---|
| Normal userscript | 3.4.7 |
| Normal Edge Function | `upstatus` v480 |
| Team Lite userscript | 3.4.30 |
| Team Lite Edge Function | `upstatus-team-lite` v15 |
| TEST legado | `upstatus-test` v281, no projeto de produção |

Inspecionei o código das duas Edge Functions e os userscripts embutidos:

- Ambos os runtimes têm `/api/setup` sem convite/token obrigatório.
- Normal usa senha mínima de 6 caracteres; Team Lite, 4.
- O setup ainda atribui papel administrativo por lista de nomes quando o papel está vazio.
- `/api/chat/clear` no servidor verifica apenas `name === "Ricardo"`; não exige `implementation_admin` persistido.
- O cliente Normal executa `remote_command` direcionado sem verificar sessão no listener. Team Lite verifica sessão local, mas não identidade/autorização do emissor no evento.
- Os userscripts implantados não contêm o adaptador de sinalização autenticada nem `private:true`/`setAuth()`; continuam nos canais públicos legados.

A #161 resolve o convite Normal na candidata; #167 resolve o papel persistido da limpeza do chat, mas ainda precisa da lógica de convite da #161. Em Team Lite, #76 contém convite e rate limit, enquanto #171 contém a checagem de papel na limpeza; precisam ser integradas.

## 6. Upload assinado e chat

Corrigindo uma conclusão antiga: **Normal e Team Lite implantados já possuem helpers de upload assinado** para chat/avatar. Não é correto dizer que a funcionalidade está ausente nos clientes.

O que existe no runtime implantado:
- endpoints `/api/chat/upload-url` e `/api/profile/avatar-upload-url`;
- limite declarado de 20 MiB e allowlist de MIME;
- criação de URL/token assinado via Storage.

O que ainda falta:
- validação rigorosa de origem, bucket, caminho, token e URL pública no servidor implantado;
- inspeção dos bytes reais do arquivo (MIME e tamanho declarados pelo cliente não provam o conteúdo);
- no cliente Team Lite candidato, validação equivalente à #167 e PUT com credenciais omitidas/redirecionamentos rejeitados.

A #167 implementa verificações mais completas no Normal candidato; a #76 ainda não tem paridade. Nenhuma transferência real foi executada nesta auditoria.

## 7. Supabase — produção

### Realtime

Consulta SELECT-only:
- 106 mensagens no particionamento consultado, todas `private=false`;
- 72 `user_status`, 26 `db_change`, 4 `remote_command`, 4 `remote_result`;
- tópico observado: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`;
- grants anon/authenticated em `realtime.messages`: INSERT, SELECT e UPDATE;
- nenhuma policy própria em `realtime.messages`.

O trigger de mensagens transmite o registro completo com `to_jsonb(OLD/NEW)`. Os triggers de usuários e remote-state também publicam em canal público. A configuração de “Allow public access” do projeto não ficou disponível pela integração; não foi feita exploração externa.

### RLS, grants e SECURITY DEFINER

- 10 tabelas de `public` com RLS habilitado e sem policies.
- 9 tabelas com grants diretos para anon e authenticated, incluindo TRUNCATE; 126 privilégios somados.
- `storage.objects` tem grants anon/authenticated para INSERT, SELECT, UPDATE e DELETE.
- 3 funções de broadcast são `SECURITY DEFINER`, `search_path=public`, EXECUTE para anon/authenticated.
- Security Advisor: 3 WARN de execução anon + 3 WARN de execução authenticated; 10 INFO de RLS sem policy.
- Default ACLs em `public` e `storage` mantêm privilégios amplos para papéis de cliente.

RLS habilitado sem policy bloqueia acesso por linha, mas não remove grants; TRUNCATE não é protegido por RLS.

### Storage

- `chat-images`: 168 objetos, público, limite 20 MiB.
- `profile-images`: 20 objetos, público, limite 20 MiB.
- Zero policies próprias em `storage.objects`.

### Edge Functions e logs

- 38 Edge Functions ACTIVE no projeto de produção; todas listadas com `verify_jwt=false`. Isso não prova acesso anônimo por si só: os handlers implementam sessão própria, que precisa ser auditada individualmente.
- Na janela consultada de 24 horas, logs disponíveis foram 72 linhas de PgBouncer e 22 de PostgreSQL; não havia fonte Edge/Function suficiente. Não calcular HTTP 402 nem afirmar recuperação de disponibilidade.

Links:
- [Security Advisor produção](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm/advisors/security)
- [Edge Functions produção](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm/functions)
- [Storage produção](https://supabase.com/dashboard/project/dlfvkawaiqduhlazsszm/storage/buckets)

## 8. Supabase — laboratório

- 2 Edge Functions ACTIVE: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- 39 migrations no ledger; nenhuma branch de desenvolvimento listada.
- Zero usuários, mensagens e objetos/buckets Storage; não é Full-Product TEST.
- 18 tabelas public com RLS e sem policies, mas sem grants diretos anon/authenticated em `public`.
- `setup_token_*` existe em `public.users`.
- `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` são SECURITY INVOKER, `search_path` vazio e EXECUTE restrito a service_role.
- Triggers SECURITY DEFINER do laboratório usam `search_path` vazio e EXECUTE restrito a service_role.
- Ainda há grants diretos anon/authenticated em `realtime.messages` e `storage.objects`, mesmo sem objetos/buckets.

A função `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`; a PR #163 testa esse último contrato offline, portanto o runtime implantado não acompanha o teste candidato.

Links:
- [Security Advisor laboratório](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb/advisors/security)
- [Edge Functions laboratório](https://supabase.com/dashboard/project/bfpjtfqlnypisxljoxkb/functions)

## 9. Migrations e Issues

Produção:
- 7 migrations no ledger.
- Branch gerenciada `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

Laboratório:
- 39 migrations no ledger.

Os quatro SQLs abaixo retornam 404 em master:
1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruí SQL ausente por inferência.

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos concluídos.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens concluídos no checklist.

Não havia sessão Tampermonkey/Sale Smartly autenticada nem dispositivos físicos. Não foram realizados testes manuais de reconexão sem F5, microfone, áudio bidirecional ou compartilhamento real.

## 10. Gates de release

| Gate | Estado | Evidência/razão |
|---|---|---|
| RT-01 | blocked | 106 eventos `private=false`, clientes sem transporte autenticado padrão |
| TEST-ISOLATION | blocked | só produção + laboratório de sinalização; nenhum Full-Product TEST |
| MIGRATION-PROVENANCE | blocked | quatro SQLs originais ausentes e `main` em MIGRATIONS_FAILED |
| AUTH-03 | blocked | setup sem convite e limpeza por nome nos runtimes implantados |
| ACL-STORAGE | blocked | grants, default ACLs, SECURITY DEFINER e buckets públicos |
| RECONNECT | pending | Issue #78 permanece 0/8; depende de teste físico |
| HUMAN-REVIEW | pending | PRs Draft/sem aprovação humana; sem autorização de release |

## 11. Próximos passos recomendados

1. Corrigir o workflow TEST de master para exigir `SUPABASE_TEST_PROJECT_ID`, rejeitar produção/laboratório de sinalização e falhar fechado.
2. Provisionar Full-Product TEST separado.
3. Integrar #167 + #161 + #168 em um único candidato Normal; resolver o bump de versão e obter Validate + Smoke no mesmo HEAD.
4. Integrar #76 + #171 em Team Lite; portar a validação completa de upload da #167.
5. Corrigir o workflow oficial Team Lite para publicar `upstatus-team-lite` no projeto permitido.
6. Implantar AUTH-03 somente após revisão e plano de corte.
7. Tornar Realtime privado/autorizado, minimizar payloads e retirar o fallback público após compatibilidade comprovada.
8. Revisar grants, default ACLs, RLS, SECURITY DEFINER e Storage.
9. Recuperar os SQLs originais e resolver `MIGRATIONS_FAILED`.
10. Executar testes físicos de #78 e obter aprovação humana.

## 12. Integridade da auditoria

- Todas as consultas Supabase foram SELECT-only.
- Nenhum dado, secret, flag, migration, permissão ou configuração foi alterado.
- Nenhum deploy, merge, release ou publicação de userscript foi executado.
- Não foram disparados testes nesta rodada; apenas leitura de logs/artefatos CI existentes.
- A única alteração no repositório é este relatório novo na branch QA dedicada.
- O comentário QA existente na Issue #79 foi atualizado; comentário da Engenharia preservado.

**Veredito: NOT READY.**
