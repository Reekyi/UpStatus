# UpStatus — auditoria independente de QA
**Evidência coletada:** 2026-11-07 16:35 BRT (19:35 UTC)  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`

## 1. Veredito executivo

**NO-GO para merge, deploy, release ou publicação.** Os candidatos Normal e Team Lite passaram nas suítes automatizadas dos HEADs verificados. Isso comprova a qualidade dos fluxos executados no laboratório isolado, mas não comprova o cutover de produção, o transporte autenticado como caminho padrão, a entrega Realtime em um ambiente de teste completo nem a aceitação física no Tampermonkey.

Achados prioritários desta rodada:

1. O workflow ativo de deploy TEST em `develop` ainda aceita `push`, usa o secret compartilhado `SUPABASE_PROJECT_ID` e não valida a identidade do projeto. A correção está na PR #84 Draft e ainda não protege a branch ativa.
2. Os dois clientes candidatos mantêm `signaling_transport_enabled` com default `false` e endpoint vazio. O transporte autenticado é opt-in; Realtime público continua sendo o caminho padrão.
3. A produção continua sem o rollout AUTH-03, sem rate limit específico de login/setup e com os broadcasts públicos SECURITY DEFINER.
4. O laboratório recebeu a migration de search_path vazio, mas não possui partições de `realtime.messages`; a entrega de broadcast não foi comprovada.
5. O projeto TEST full-product não existe. Não há ambiente independente com os backends completos Normal e Team Lite, buckets de chat/perfil e Realtime pronto para validação de ponta a ponta.

## 2. Classificação de evidências

- **AUTOMATED PASS:** workflow executado e concluído com sucesso no SHA exato indicado.
- **CODE INSPECTION:** leitura de fonte, configuração ou catálogo; não equivale a execução.
- **MANUAL PENDING:** depende de navegador instalado, dispositivos reais ou aceitação humana.
- **BLOCKED:** não há ambiente, permissão ou pré-requisito para executar com segurança.
- **NOT VERIFIED:** a configuração foi inspecionada, mas o comportamento final não foi demonstrado.

Não foi atribuído percentual de conclusão.

## 3. Heads e estado das PRs

Comparações GitHub realizadas contra as bases atuais. Todas as PRs abaixo permanecem abertas, Draft, sem merge, sem reviews aprovadas e sem threads de revisão encontradas.

| PR | Base | HEAD completo | Ahead / behind | Estado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | master | `d949c4b765e77b80d01d3115e76c35555f28949b` | 851 / 0 | Open / Draft |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | team-lite-official | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 | Open / Draft |
| [#76 Team Lite atual](https://github.com/Reekyi/UpStatus/pull/76) | team-lite-official | `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7` | 313 / 0 | Open / Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | master | `31072bf55dbd6dc58079641e35891491c6e3a2c6` | 106 / 0 | Open / Draft |
| [#84 guard TEST](https://github.com/Reekyi/UpStatus/pull/84) | develop | `21341f331270e142bdf7584c1cdf16e6011e41b3` | 30 / 0 | Open / Draft |
| [#85 updater/upload](https://github.com/Reekyi/UpStatus/pull/85) | master | `17554523ef51bafd503e74b3f1271d55f43a6eda` | 21 / 0 | Open / Draft |

A #75 é baseline histórico; #76 é a linha atual de Team Lite. O volume de commits à frente em #74 (851) e #76 (313) aumenta o custo de revisão e exige inspeção explícita do diff consolidado, mesmo com os testes verdes.

### Commits de HEAD inspecionados

- #74: [`d949c4b`](https://github.com/Reekyi/UpStatus/commit/d949c4b765e77b80d01d3115e76c35555f28949b), teste do contrato de origem do upload assinado e URL de perfil.
- #75: [`7bbf9b9`](https://github.com/Reekyi/UpStatus/commit/7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309), finalização de sinalização de mídia antes da revogação de sessão Team Lite.
- #76: [`2e0ff69`](https://github.com/Reekyi/UpStatus/commit/2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7), regressão de política de senha do setup/login Team Lite.
- #82: [`31072bf`](https://github.com/Reekyi/UpStatus/commit/31072bf55dbd6dc58079641e35891491c6e3a2c6), checkpoint documental QA.
- #84: [`21341f3`](https://github.com/Reekyi/UpStatus/commit/21341f331270e142bdf7584c1cdf16e6011e41b3), documentação do deploy TEST manual.
- #85: [`1755452`](https://github.com/Reekyi/UpStatus/commit/17554523ef51bafd503e74b3f1271d55f43a6eda), distinção entre path assinado e path retornado.

## 4. CI nos HEADs exatos

### Normal #74 — AUTOMATED PASS

- [Validate 42404667942](https://github.com/Reekyi/UpStatus/actions/runs/42404667942): SUCCESS.
- [Signaling Smoke 42404668009](https://github.com/Reekyi/UpStatus/actions/runs/42404668009): SUCCESS.
- 19/19 verificações não autenticadas e 129/129 autenticadas.
- Chromium autenticado negociou WebRTC de chamada, voz e screen-share, com entrega de áudio remoto e vídeo remoto.
- Mesh autenticado de três participantes e teardown aprovados.
- Testes de abertura/cancelamento concorrentes de salas e tentativas de voz aprovados; replay de alias lógico rejeitado com HTTP 409.
- Rate limit distribuído: 90 aceitas, uma HTTP 429, `Retry-After: 60s`.
- Enrollment isolado: token inválido, malformado, expirado, replay, concorrência de um vencedor, preservação de papéis e não escalada de administrador com espaços.
- Cleanup do workflow confirmado.

O Validate concluiu build `PROD 3.4.7 / TEST 3.4.7`. A versão Normal candidata continua 3.4.7, igual à versão interna da função Normal de produção; o plano de cutover exige bump deliberado antes de distribuir um novo artefato.

### Team Lite #76 — AUTOMATED PASS

- [Candidate Checks 42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302): SUCCESS.
- 16/16 verificações não autenticadas e 103/103 autenticadas.
- Chromium autenticado validou WebRTC de chamada, voz e screen-share, áudio/vídeo remoto, mesh de três participantes e teardown.
- Concorrência de salas, rate limit 90 + 1 HTTP 429/Retry-After 60s, enrollment e cleanup aprovados.
- Versão candidata 3.4.31; produção Team Lite permanece 3.4.30.

A falha intermediária anterior do teste de senha foi corrigida no HEAD atual: a regressão agora verifica o template efetivamente usado pelo artefato Team Lite, em vez da cópia Normal antiga no branch.

### Baseline #75 — PASS histórico

- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS histórico.
- Não é o candidato Team Lite atual; usar #76 para a decisão de release.

### Guard TEST #84 — AUTOMATED PASS, deploy não executado

- [Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361): SUCCESS.
- O job construiu `PROD 3.0.40 / TEST 3.0.40-beta.22`; não é validação de versão do candidato Normal 3.4.7.
- Regressões de target guard, metadata, SHA pin, workflow manual-only, escopo do token e contrato de upload passaram.
- O workflow não foi dispatchado; Management API preflight real e deploy não foram executados.

### Updater/security #85 — AUTOMATED PASS com mocks

- [Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749): SUCCESS.
- Build 3.4.7, regressões de upload assinado cliente/servidor em VM e regressões de chat passaram.
- O teste mockado cobre origem HTTPS, bucket, MIME, tamanho, caminho, token, URL pública, avatar e compatibilidade legado.
- Não houve upload real no Supabase Storage.

### QA #82 — AUTOMATED FAIL

- [Validate 42401762317](https://github.com/Reekyi/UpStatus/actions/runs/42401762317): FAILURE em `scripts/validate.mjs:26`.
- Erro exato: `VALIDATION FAILED: production updateURL mismatch`.
- O HEAD QA não contém a correção do validador que está na #85. Não enfraquecer a asserção; integrar/revisar a correção em uma sequência própria antes de exigir Validate verde na base master.

## 5. Pipeline TEST e isolamento

### Workflow ativo em develop — CODE INSPECTION / RISCO CRÍTICO

- Develop HEAD: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.
- Arquivo: [.github/workflows/deploy-test.yml](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml).
- Blob SHA: `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`.
- Contém `push` automático e `workflow_dispatch`.
- Usa `secrets.SUPABASE_PROJECT_ID`, CLI `latest` e deploy de `upstatus-test`.
- Não valida a identidade do projeto de destino.

O valor do secret não foi lido. Não há evidência nesta auditoria de que o destino efetivo seja produção; há evidência de que o workflow não garante o isolamento. **Não executar o workflow atual de develop.**

### Proteção candidata na #84

- Workflow manual-only.
- Checkout de `github.sha`, verificação de `refs/heads/develop` e igualdade entre HEAD do checkout e `GITHUB_SHA`.
- Usa `vars.SUPABASE_TEST_PROJECT_ID`, rejeita produção e o laboratório de fixtures.
- Verifica formato, organização, estado e database host via Management API.
- Token Supabase fica restrito aos steps que precisam dele.
- CLI fixada em 2.122.1; deploy limitado a `upstatus-test`.

A proteção passou no Validate, mas continua Draft e não está integrada em develop.

### Projetos disponíveis

A organização contém apenas:

- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 34 migrations, 2 Edge Functions.

Não existe projeto TEST full-product. O laboratório tem apenas `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Ele não possui os backends completos Normal/Team Lite nem buckets de chat/perfil.

O builder usa sentinel inerte quando não há projeto TEST configurado e rejeita produção/laboratório. O guard do build é útil, mas não substitui a criação do ambiente completo.

## 6. Normal/Team Lite: transporte e compatibilidade

### Transporte autenticado — CODE INSPECTION

- Normal template blob: `82b044fa0fb01d5b1a30639ec3b4a5cbcc7bd827`.
- Team Lite userscript artifact blob: `0e0660a6abc26052e67b9b1832a75fde7bc0b06e`.
- Ambos usam `GM_getValue(... + 'signaling_transport_enabled', false) === true`.
- O endpoint de transporte também começa vazio.
- `initSignalingTransport()` só inicializa com flag, sessão e endpoint válido.
- Quando habilitado, o cliente ignora sinais públicos de voz/screen-share e rejeita `call_signal` sem marca de transporte autenticado, salvo mensagens de descoberta explicitamente permitidas.

Portanto, a suíte testa o transporte autenticado no laboratório, mas ele **não é o caminho padrão**. Realtime legado continua sendo usado por padrão para chat/presença e sinalização compatível. Não ligar o flag global antes de endpoint de produção/TEST, autorização, rollback e aceitação física.

### Contrato de versões

- Normal manifest blob `93caf1701ea508575c90d002c0b8c3037b34d82a`: versão 3.4.7; UpdateURL/DownloadURL aponta para `/functions/v1/upstatus/upstatus.user.js`.
- O CLOUD_SERVER ainda usa beta10 como backend legado por compatibilidade. Isso é uma separação intencional documentada em `docs/RELEASE_CUTOVER_PLAN.md`, não deve ser classificada isoladamente como bug. Não mudar apenas uma das URLs.
- Team Lite manifest blob `2b4216bc056dfd6ad60b051b29916ec2bfc6cc01`: build 3.4.31, stable URL ainda aponta para `team-lite-official`. Não publicar a branch candidata antes de aprovação.

### Política de senha

Candidatos Normal e Team Lite: setup novo exige 6 caracteres; login legado aceita 4 para preservar contas compartilhadas.

Produção ainda diverge:
- `upstatus` v480 / 3.4.7: 6 caracteres para login e setup.
- `upstatus-test` v281 / 3.3.28: 4 para login e setup.
- `upstatus-team-lite` v15 / 3.4.30: 4 para login e setup.
- beta10 v6 / 3.1.1-beta8: 6 para login e setup.

A paridade candidata não altera produção até rollout coordenado.

## 7. AUTH-03 e autenticação de produção

### Candidatos — AUTOMATED PASS + CODE INSPECTION

Normal e Team Lite usam:
- Token aleatório de 32 bytes (256 bits).
- Apenas SHA-256 armazenado.
- Expiração de 15 minutos.
- Emissão exige sessão e papel armazenado `implementation_admin`.
- Consumo atômico via RPC SECURITY INVOKER, EXECUTE somente para service_role.
- Replay/concorrência e papéis vazios/whitespace cobertos por regressão.

Os testes runtime exercitam RPC com service_role; ainda falta o fluxo HTTP real, HTTP 403 para não-admin, entrega privada do token, primeiro acesso pela rota HTTP e confirmação de que token não aparece em logs. Não existe botão dedicado no painel administrativo.

### Produção — CODE INSPECTION / BLOQUEADO

As quatro funções implantadas foram inspecionadas diretamente:
- `upstatus` v480, source SHA `bb2713ce...`, produto 3.4.7.
- `upstatus-test` v281, source SHA `7b5dfb12...`, produto 3.3.28.
- `upstatus-team-lite` v15, source SHA `2c13414a...`, produto 3.4.30.
- `upstatus-screen-share-3-1-1-beta10` v6, source SHA `f6c5f8a4...`, produto 3.1.1-beta8.

Todas ainda expõem `/api/account` com estado `needsSetup` e `/api/setup` pelo fluxo antigo. Quando a conta não tem password_hash, o fallback atribui `implementation_admin` a nomes da allowlist (`Ricardo`, `Lohan`, `Guilherme`) se o papel estiver vazio. Não há consumo de setup invite nas funções implantadas.

Catálogo de produção: as colunas `setup_token_hash`, `setup_token_expires_at`, `setup_token_issued_by`, `setup_token_issued_at` não existem em `public.users`; a RPC de consumo de convite não existe; `upstatus_auth_rate_limits`, `upstatus_signal_rate_limits` e `merge_chat_read_receipts` também não existem.

Agregado de contas: 5 usuários, 0 senha NULL/vazia, 0 papel NULL/vazio, 3 administradores explícitos. Não foi encontrada conta atualmente reivindicável; o risco é latente para contas futuras sem senha/papel.

AUTH-02 continua pendente: não há rate limiter distribuído específico de login/setup. O rate limit de signaling não substitui proteção contra brute force de autenticação.

## 8. Edge Functions

Inventário de produção: 38 funções ACTIVE; todas reportam `verify_jwt=false`. 36 nomes contêm `test`, `beta` ou `backup`, incluindo o runtime `upstatus-test` no próprio projeto de produção.

`verify_jwt=false` significa que o gateway não valida Supabase JWT; não prova, sozinho, ausência de autenticação, pois os quatro runtimes centrais usam sessão customizada `x-upstatus-token`. Os quatro foram inspecionados individualmente. As outras 34 variantes antigas não foram revisadas rota por rota; precisam de inventário de consumidores, autenticação, dependências e rollback. Não desativar/remover automaticamente.

## 9. RLS, grants, SECURITY DEFINER e Default ACL

### Produção

Security Advisor: 6 WARN (3 para anon, 3 para authenticated) e 10 INFO de RLS sem policies; Performance/Health sem findings.

Nove tabelas backend-owned em public têm RLS habilitado, zero policies e grants de cliente para anon/authenticated incluindo SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER e TRUNCATE. `upstatus_visual_config` não está nesse grupo. TRUNCATE não é protegido por RLS.

`realtime.messages`: RLS habilitado, zero policies, SELECT/INSERT/UPDATE para anon e authenticated; 50 linhas e 7 partições.

Default ACLs:
- postgres em public e storage concede privilégios padrão de sequences, funções e tabelas a anon/authenticated, incluindo EXECUTE e TRUNCATE/MAINTAIN em tabelas futuras.
- supabase_admin mantém defaults amplos em public, graphql e graphql_public.
- A revogação dos objetos atuais não impede que novos objetos herdem esses privilégios.

### Laboratório

Security Advisor: 0 WARN e 17 INFO. Tabelas backend-owned em public sem grants de anon/authenticated. Três RPCs principais são SECURITY INVOKER, search_path vazio e EXECUTE restrito a service_role.

Os defaults de postgres/public foram restringidos, mas postgres/storage ainda mantém grants padrão de cliente e supabase_admin continua com defaults amplos em public/graphql/graphql_public. ACL-02 segue bloqueado por falta de membership/privilégio administrativo da sessão disponível.

## 10. Realtime

### Produção — BLOQUEADOR

As três funções continuam SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated e `realtime.send(..., false)`:

- `upstatus_broadcast_messages()`: serializa OLD/NEW completo via `to_jsonb` e envia em `db_change`.
- `upstatus_broadcast_remote_state()`: envia dados de comando e resultado (sender/target/status/reason/error/timestamps).
- `upstatus_broadcast_users()`: envia name/status/reason/updated_at/sync.

Triggers continuam ativos. O payload de mensagem pode expor conteúdo e metadados de anexos a qualquer assinante do tópico público.

### Laboratório — CONFIGURAÇÃO VALIDADA, ENTREGA NÃO VERIFICADA

Migration `20261107165942 pin_empty_search_path_trigger_broadcasts_test` está no ledger (34 migrations). As três funções continuam SECURITY DEFINER, mas agora têm `search_path=""`, EXECUTE negado a anon/authenticated, EXECUTE disponível a service_role e payload reduzido a `{op}`. Triggers estão habilitados.

Limitação: `realtime.messages` tem 0 partições filhas e 0 linhas no laboratório; produção tem 7 partições e 50 linhas. O probe anterior não comprovou entrega porque `realtime.send` encontrou ausência de partições. Não criar partições manualmente em schema gerenciado. O laboratório também mantém grants SELECT/INSERT/UPDATE para anon/authenticated em `realtime.messages`, RLS habilitado e zero policies.

Os broadcasts do laboratório ainda usam `private=false`. RT-01 não está fechado; a migração de payload/privilege não equivale a canal privado/autorizado nem a entrega WebSocket comprovada.

## 11. Storage e upload

Buckets de produção:
- `chat-images`: public=true, limite 20 MiB.
- `profile-images`: public=true, limite 20 MiB.

A #85 e o port na #74 validam cliente/servidor de upload assinado em VM/mocks, com HTTPS, origem, bucket, MIME, tamanho, path, token, URL pública, PUT sem credenciais e sem redirects. Não houve upload real.

Upload assinado protege a escrita, não a leitura: URLs públicas continuam legíveis por quem as possui. Definir se anexos de chat devem continuar públicos ou migrar para buckets privados e URLs de download assinadas.

Áudio continua no endpoint legado `/api/chat/audio` com data URL; não está incluído no allowlist do novo signed-upload de chat. Manter esse caminho separado documentado e testar limite/MIME real no TEST.

## 12. Issues e aceite manual

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): 8 critérios continuam desmarcados (0/8). Nenhum teste físico atual no Tampermonkey com queda de rede por ~10s, recuperação sem F5, microfone/display real, reentrada, novas chamadas ou interoperabilidade instalada Normal ↔ Team Lite. Os testes Chromium do CI não substituem essa aceitação.
- [#79 release](https://github.com/Reekyi/UpStatus/issues/79): aberta, 97 comentários. O corpo principal ainda usa snapshot de 12:23 BRT, com heads #74/#76/#82 antigos e #74 Smoke pendente. Atualizar o checklist depois de review humana; não marcar conclusão com base apenas no CI.

## 13. Drift documental encontrado

- `docs/AUTH_ENROLLMENT_DESIGN.md` ainda diz que novo setup Team Lite exige 4 caracteres; o código candidato #76 agora exige 6 e login legado 4.
- `docs/REALTIME_CLIENT_MIGRATION_PLAN.md` contém checkboxes antigos que ainda descrevem testes de voice/screen/mesh como pendentes, embora os runs exatos atuais tenham passado no laboratório. Atualizar a classificação automatizada sem remover os gates físicos.
- `docs/RELEASE_CUTOVER_PLAN.md` corretamente mantém o transporte default-off, exige backend antes do cliente, bump de versão e rollback coordenado; o documento não autoriza mudanças de produção.

## 14. Fixtures após o Smoke Normal

Consulta SELECT-only posterior ao run 42404668009:
- test users: 0
- sessions: 0
- rooms: 0
- memberships: 0
- bindings: 0
- events: 0
- call attempts: 0
- voice attempts: 0
- rate-limit buckets: 0
- chat reads: 0
- messages: 0

Nenhuma limpeza manual foi executada.

## 15. Próximos gates, em ordem

1. Integrar/revisar a proteção do workflow TEST antes de qualquer execução em develop.
2. Provisionar projeto TEST full-product com migrations, Edge Functions, Storage e Realtime suportados.
3. Criar runtime e workflow TEST próprios para Team Lite.
4. Validar upload real, download e privacidade dos buckets no TEST.
5. Completar AUTH-03 por HTTP e criar rate limiter distribuído para login/setup.
6. Planejar migração de Realtime: canais privados/autorizados ou transporte autenticado como padrão; provar entrega WebSocket e rollback.
7. Corrigir grants atuais e default ACLs com autoridade administrativa e plano de reversão.
8. Inventariar as 34 variantes antigas de Edge Functions e definir retenção/remoção baseada em consumidores.
9. Coordenar versão, API, UpdateURL, endpoint legado e rollback; Normal precisa de bump deliberado.
10. Executar aceite físico da issue #78 no Tampermonkey.
11. Atualizar #79 e documentação de design/migração; obter reviews humanas antes de sair de Draft.

## 16. Limites desta rodada

- SQL exclusivamente SELECT e leitura de catálogos.
- Nenhuma migration aplicada.
- Nenhum deploy, merge, release, publicação ou dispatch manual.
- Nenhum secret/token lido ou alterado.
- Nenhuma flag, role, grant, policy, ACL ou configuração de produção alterada.
- Nenhuma fixture modificada pela auditoria.
- Nenhuma branch de engenharia alterada.
- Única escrita: este relatório novo na branch QA dedicada.

**Decisão:** manter #74, #75, #76, #82, #84 e #85 em Draft. CI funcional verde não autoriza cutover.
