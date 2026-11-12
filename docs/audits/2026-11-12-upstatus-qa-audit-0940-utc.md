# UpStatus — auditoria independente de QA

**Data:** 2026-11-12 09:40 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY — não liberar.**

## 1. Método e limites

- Revalidação read-only de refs, PRs, issues, diffs, workflows, logs concluídos, código de Edge Functions e catálogos PostgreSQL.
- O documento `docs/RELEASE_READINESS.md` foi recuperado integralmente pelo blob SHA `7cfbd70886df42ce790c078c224b19284a632595`: 8.410 linhas. O último checkpoint interno continua em 2026-11-08 18:30 UTC; não contém as revalidações desta rodada.
- Consultas PostgreSQL executadas somente com SELECT e catálogos.
- Os resultados de CI citados pertencem aos run IDs e commits indicados. Chromium/VM/fixtures são CI automatizado, não teste físico de Tampermonkey.
- Não foram iniciados workflows, reruns, chamadas externas de sinalização, uploads, testes de microfone/tela, quedas físicas de rede ou testes manuais.
- Nenhuma produção foi modificada. A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.

## 2. Heads reais e integridade das branches

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `555f57ff10746529a5f2e0cf7f508cb47c9a6192` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

Comparação QA versus master: **246 commits à frente e 1 atrás**, status `diverged`; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não foi feito rebase.

A PR #82 usa o HEAD QA `555f57f`, mas sua base também está em `a9288cc`, um commit atrás do master atual.

| PR | HEAD | Base | Estado |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | `a9288cc` | open / Draft |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | `9065bc1` | open / Draft |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | `9065bc1` | open / Draft |
| #82 QA | `555f57ff10746529a5f2e0cf7f508cb47c9a6192` | `a9288cc` | open / Draft |

A PR #147 usa base `6b9aba1c`; a QA atual está 9 commits à frente dessa base. A PR #151 é baseada no HEAD da #147 e está quatro commits à frente dele. As candidatas precisam ser revalidadas contra o HEAD QA atual antes de qualquer integração.

PRs de segurança relacionadas:
- #143 dispatcher: HEAD `c4a04fa755b877bc76b1372170a26e7b974264e6`.
- #146 remote-command: HEAD `71c5ce2f730ade8ee3e8b090498202933809ce5c`.
- #143 e #146 estão divergidas: #146 tem 10 commits exclusivos à frente e 15 atrás da #143. Não combinar/publicar sem reconciliação.
- #149 Team Lite call-source: HEAD `77352d2e3b93722d6b69a9eec31a92bb63158230`, base no HEAD da #76.
- #151 admin-role: HEAD `9893efc6d9fb1248a59fd527dd4c0baec7f1ac01`, base no HEAD da #147.
- #129 bloqueio do dispatcher Team Lite: Draft, ainda não incorporada à branch oficial.

Nenhuma review humana foi registrada nas PRs #74, #75, #76, #82, #147, #149 ou #151.

## 3. CI — evidências atuais

| PR / workflow | Resultado | Evidência e limite |
|---|---|---|
| #74 Normal Validate | PASS | [Run 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) |
| #74 Normal Signaling Smoke | PASS | [Run 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336); comentário QA anterior registra 19/19 não autenticados e 136/136 autenticados, WebRTC e rate limit 90 + 1 HTTP 429 |
| #75 Team Lite baseline | PASS histórico | [Run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127); baseline não substitui #76 |
| #76 Team Lite Candidate Checks | PASS | [Run 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080); 16/16 não autenticados, 110/110 autenticados e 11/11 contratos HTTP isolados, conforme evidência registrada no comentário QA |
| #82 QA Validate | **FAIL** | [Run 43189635186](https://github.com/Reekyi/UpStatus/actions/runs/43189635186); log confirma `production updateURL mismatch` em `scripts/validate.mjs:26` |
| #147 updater/chat | PASS completo no head antigo | [Run 43176202190](https://github.com/Reekyi/UpStatus/actions/runs/43176202190); base da PR está 9 commits atrás da QA atual |
| #149 Team Lite call-source Guard | PASS | [Run 43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) |
| #149 Team Lite Candidate Checks | PASS | [Run 43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232); 110/110 autenticados e testes de áudio/vídeo em Chromium |
| #151 admin-role reconciled | PASS direcionado | [Run 43188978762](https://github.com/Reekyi/UpStatus/actions/runs/43188978762); **não é Validate completo** |

### PR #151 — regressão de cobertura do workflow

A #151 remove o fallback nominal do servidor:

```js
const role=a.role||"implementation_user";
```

Também exige `admin(name)` na rota de health e exige identidade de Ricardo mais papel administrativo armazenado para limpar o chat.

Porém, o patch de `.github/workflows/qa-release-target-candidate.yml` removeu a etapa:

```bash
node scripts/validate.mjs
```

O job atual executa somente build/sintaxe e o teste direcionado `scripts/test-qa-release-target.mjs`. O log de steps do run 43188978762 confirma que não houve regressão completa de chat/offline no workflow da #151.

O teste direcionado faz verificações estáticas com `serverTemplate.includes(...)`; não é teste HTTP/runtime da autorização.

Além disso, a rota `POST /api/setup` continua chamando `login(req,true)` sem token de convite. O novo código preserva `a.role` quando já está preenchido. Se uma conta pré-provisionada como admin estivesse sem senha, o primeiro setup ainda poderia reivindicar essa conta. As cinco contas atuais de produção estão configuradas, sem senha ou papel vazio; o risco é latente no fluxo de provisionamento.

**Conclusão:** o guard direcionado passou, mas a cobertura foi reduzida e AUTH-03 continua incompleto. Não considerar a #151 pronta para integração.

### PR #149 — origem autenticada ainda opt-in

A #149 separa a origem autenticada do payload: eventos recuperados pelo polling passam a chamar `receiveCallSignal(p,true)`; broadcasts públicos chamam `receiveCallSignal(...,false)`. Isso elimina a confiança em um campo de origem forjado dentro do próprio payload.

Mas a condição de bloqueio só é aplicada quando `signalTransportFlag` está ligado. O transporte continua `enabled=false` por padrão e o endpoint começa vazio. Com a flag desligada, os listeners públicos legados de `call_signal`, voice-room e screen-share continuam ativos.

O helper público permite somente hints `presence`/ `ended` com `discoveryOnly=true` quando o transporte autenticado está habilitado. Isso é uma melhoria de candidato, não uma proteção default já implantada.

## 4. Código efetivamente implantado nas Edge Functions

Management API confirmou:

| Edge Function de produção | Versão | Source SHA | verify_jwt |
|---|---:|---|---|
| `upstatus` | 480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` | false |
| `upstatus-team-lite` | 15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` | false |
| `upstatus-screen-share-3-1-1-beta10` | 6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` | false |
| `upstatus-test` | 281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` | false |

A produção tem 38 Edge Functions ativas; todas reportam `verify_jwt=false`. Isso, isoladamente, não prova ausência de autenticação: os handlers podem usar sessão própria. Foram inspecionados os handlers relevantes e os bundles embutidos.

Os userscripts foram decodificados diretamente das fontes implantadas:
- Normal v480 contém userscript **3.4.7**.
- Team Lite v15 contém userscript **3.4.30**.

Nos dois bundles:
- O cliente usa `channel(UP_REALTIME_TOPIC)`, sem `private:true` e sem `realtime.setAuth()`.
- O tópico assinado é `upstatus-screen-share-live-3-1-1-beta10`.
- Normal chama diretamente `executeRemoteCommand(c)` quando recebe `remote_command`.
- Team Lite verifica autenticação local, geração de sessão e membro atual, mas também executa o comando do payload. Isso não autentica o emissor.
- Ambos passam `call_signal` aos handlers de chamada e mantêm handlers públicos para voice-room e screen-share.
- Ambos mantêm `POST /api/setup -> login(req,true)`, sem token de convite obrigatório.
- O fallback nominal de `implementation_admin` ainda existe nos bundles implantados.

A API beta10 v6 não contém rotas server-mediated `/api/signal`, `/room/open` ou `/room/leave`; contém o endpoint de remote-status. Não existe Edge Function de sinalização server-mediated em produção.

O laboratório possui `upstatus-signal-test` v32 (SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`) e `upstatus-signal-e2e-once` v3. O endpoint isolado define TTL de evento de 2 minutos, TTL de sala de 2 horas e limite de 90 eventos por minuto; isso não equivale a implantação ou validação em produção.

## 5. Realtime, RLS, grants e SECURITY DEFINER

### Produção

Consulta SELECT em `realtime.messages`:
- **109 registros; 109 private=false**.
- 40 `db_change`, 6 `remote_command`, 6 `remote_result`, 57 `user_status`.
- Todos no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- RLS habilitado, FORCE RLS desabilitado, zero policies.
- SELECT e INSERT efetivos para anon e authenticated.

As três funções `public.upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()`:
- São SECURITY DEFINER.
- Usam `search_path=public`.
- Retornam `trigger`.
- Têm EXECUTE efetivo para anon, authenticated e service_role.
- Supabase Security Advisor retorna 3 WARN para anon e 3 WARN para authenticated. Não foi demonstrada invocação direta de uma função trigger; o problema confirmado inclui os privilégios desnecessários e a publicação pública pelos triggers.

Outros resultados SELECT-only:
- 10 tabelas do schema public com RLS habilitado e zero policies.
- Grants diretos anon/authenticated: public 126, realtime 8, storage 32; total **166**.
- 18 grants TRUNCATE em public, distribuídos em nove tabelas. RLS não protege TRUNCATE.
- Default ACL: **120 entradas direcionadas a clientes**, 300 entradas ACL expandidas.
- Buckets `chat-images` e `profile-images` públicos, limite 20 MiB cada.
- 168 objetos em `chat-images`, 20 em `profile-images`; zero policies próprias em `storage.objects`.
- 296 mensagens; 296 com `file_name` nulo.
- Cinco usuários; zero senha ausente e zero papel ausente.
- AUTH-03 ausente: zero colunas `setup_token_*`, tabela de rate limit ausente e RPCs de consumo de convite/rate limit ausentes.

Security Advisor de produção: 10 INFO de RLS sem policy, 3 WARN anon e 3 WARN authenticated. Performance e Health Advisors sem findings.

### Laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb`:
- 18 tabelas public com RLS e zero policies.
- Zero grants diretos de tabela public para anon/authenticated.
- As três funções de broadcast do laboratório continuam SECURITY DEFINER, mas usam `search_path=""`; EXECUTE é false para anon/authenticated e true para service_role.
- Zero fixtures nas tabelas consultadas: users, messages, sessions, signal_rooms, signal_events e invite_limits.
- Duas Edge Functions ativas: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

O laboratório é isolado para testes de segurança, mas não é um terceiro ambiente full-product TEST. A organização possui somente os dois projetos conhecidos.

## 6. Migrations, Storage e estado da infraestrutura

- Produção: 7 migrations aplicadas.
- Laboratório: 39 migrations.
- Branch gerenciada Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Quatro SQLs registrados no ledger de produção retornam 404 no branch master:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

A proveniência desses arquivos continua sem validação. O dispatcher deve permanecer fail-closed para SQL sem origem verificável.

## 7. Workflow Team Lite e Issues

### Workflow de publicação Team Lite

O workflow oficial `.github/workflows/deploy-production.yml` na branch `team-lite-official` ainda:
- Instala Supabase CLI `latest`.
- Usa `supabase functions deploy upstatus`, que é o slug Normal.
- Não verifica o slug `upstatus-team-lite` antes do deploy.

A PR #129 substitui o workflow legado por um job fail-closed que informa que o alvo antigo aponta para Normal. A PR continua Draft e não foi incorporada à branch oficial. **Não despachar o workflow atual.**

### Issue #78 — reconexão física

Issue #78 continua OPEN, **0/8 critérios físicos aprovados**. O corpo exige queda real de internet, reconexão sem F5, reentrada em sala, novas chamadas, microfone/tela reais e interoperabilidade instalada Normal ↔ Team Lite.

Não houve teste manual nesta execução. CI Chromium/VM não substitui aceitação física do Tampermonkey.

### Issue #79 — Control Center

O comentário QA existente foi atualizado, mantendo o ID `6744331652`. O comentário da Engenharia `6744711778` foi preservado. Não foi criado comentário duplicado. O JSON do Control Center foi atualizado com os gates e atividades desta execução.

## 8. Gates e recomendação

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | BLOCKED | 109/109 eventos Realtime públicos; bundles instalados usam listeners públicos |
| TEST-ISOLATION | DONE | Laboratório isolado, zero fixtures consultadas e sem grants diretos public para clientes |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs registrados retornam 404 em master |
| AUTH-03 | BLOCKED | Produção sem setup token, rate-limit table/RPC; #151 ainda não exige convite |
| ACL-STORAGE | BLOCKED | 166 grants, 18 TRUNCATE, 120 Default ACL client entries, buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8; nenhum teste físico sem F5 |
| HUMAN-REVIEW | PENDING | Nenhuma review humana registrada nas PRs examinadas |

**NOT READY.** Bloqueadores prioritários:
1. Integrar #146 ao dispatcher #143 após reconciliação de 10/15 commits de divergência.
2. Tornar comandos remotos e sinalização autenticados por padrão em Normal e Team Lite; implantar backend server-mediated somente após plano e autorização separados.
3. Integrar AUTH-03 completo nas duas APIs, com convite obrigatório e rate limit, sem preservar papel administrativo de conta não reivindicada.
4. Restaurar a suíte completa de Validate no workflow da #151 e revalidar contra o HEAD QA atual.
5. Corrigir o workflow Team Lite antes de qualquer publicação.
6. Recuperar os quatro SQLs originais e validar o manifesto do dispatcher.
7. Revisar grants, TRUNCATE, Default ACL, SECURITY DEFINER, RLS e Storage com plano de compatibilidade/rollback.
8. Executar os oito critérios físicos da #78 e obter aprovação humana.

Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizada. Todas as consultas SQL foram SELECT-only. Nenhum teste manual ou rerun foi executado.
