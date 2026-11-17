# UpStatus — auditoria independente de qualidade
**Data:** 07/11/2026, 08:30 BRT (11:30 UTC)  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## Escopo e método

Esta auditoria trata o UpStatus como userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Primeiro foi relido `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`. Blob observado antes desta escrita: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0` (6.221 linhas). A branch QA/PR #82 foi reconsultada antes da criação deste arquivo: HEAD `d5d71586a07ea1d7436f868b51c1dc1c09a54f5f`; o arquivo principal não foi alterado.

Foram consultados PRs #74, #75, #76, #82 e #84; issues #78 e #79; commits/comparações; workflows e logs dos jobs associados aos HEADs exatos; fontes de build/templates; projetos, migrations, Edge Functions, Advisors e catálogos PostgreSQL. Todas as consultas SQL foram SELECT-only.

### Vocabulário de evidência

- **AUTOMATED PASS:** workflow concluído com sucesso no SHA exato indicado.
- **CODE INSPECTION:** inspeção estática de fonte, configuração ou catálogo; não equivale a teste de runtime.
- **MANUAL PENDING:** depende de navegador/dispositivo real ou aceite humano.
- **PENDING:** execução ainda não concluída ou evidência ainda ausente.
- **BLOCKED:** dependência ou risco confirmado impede o gate de release.
- **NOT VERIFIED:** não existe evidência suficiente para concluir.

## 1. GitHub: heads reais e estado dos PRs

Heads consultados diretamente em 07/11/2026:

| PR | Head SHA completo | Base | Ahead / behind | Estado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | master | 839 / 0 | Open, Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 / 0 | Open, Draft |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | team-lite-official | 310 / 0 | Open, Draft |
| [#82 QA documentation](https://github.com/Reekyi/UpStatus/pull/82) | `d5d71586a07ea1d7436f868b51c1dc1c09a54f5f` | master | 93 / 0 | Open, Draft |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `66ccc65af430dfee55560e90e1f832336fff0212` | develop | 29 / 0 | Open, Draft |

Todos os cinco PRs permanecem sem merge. As consultas de reviews retornaram zero submissões humanas em todos; as consultas de review threads retornaram zero threads em #74, #76, #82 e #84.

#76 está 251 commits à frente de #75 e zero atrás, tomando o HEAD de #75 como base. #75 é baseline histórico; #76 é a linha atual de signaling. #74 está 839 commits à frente de master: o flag de mergeability do GitHub não substitui revisão de histórico/merge-base e revisão humana.

## 2. CI associado aos HEADs exatos

### Normal #74 — AUTOMATED PASS

- [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089): SUCCESS.
- [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038): SUCCESS.

O job Validate concluiu o guard de build TEST e a validação do build. O Smoke concluiu sintaxe/harness, checks de endpoint não autenticado, integração autenticada/browser, rate limit distribuído, concorrência de recibos e consumo atômico do convite.

Evidência dos logs do Smoke:
- 129/129 checks de integração autenticada.
- WebRTC de chamada, voice e screen-share com entrega de áudio/vídeo remoto.
- Mesh autenticada de três participantes e teardown.
- Tentativas concorrentes de sala/voz, tombstones cancel-before-open, ownership e remoção de bindings.
- Rate limit do endpoint: 90 aceitas, uma rejeitada com HTTP 429 e `Retry-After: 60s`.
- Teste de concorrência do rate limit distribuído.
- Teste de concorrência de chat read receipts.
- Enrollment isolado: NULL/empty eligibility, conta já configurada, token malformado/incorreto/expirado/replay, concorrência one-winner, fallback de papel, preservação literal e padded-admin non-escalation.
- Cleanup das fixtures temporárias verificado pelo próprio job.

### Team Lite #76 — AUTOMATED PASS

- [Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800): SUCCESS.

Evidência dos logs:
- 103/103 checks de integração autenticada.
- WebRTC call/voice/screen com tracks remotas e teardown.
- Mesh autenticada de três participantes.
- Rate limit: 90 aceitas, uma HTTP 429, `Retry-After: 60s`.
- Concorrência do rate limit e atomicidade dos recibos.
- Enrollment: malformed/wrong/expired/replayed tokens, one-winner, NULL/empty/whitespace role fallback, preservação de papel explícito e padded-admin non-escalation.
- Migration-layout guard.
- Team Lite 3.4.31: manifesto/updater, sintaxe de userscript e portais Lucca/Ycaro.
- Testes de leave/rejoin, retry-context, offline teardown, logout gate e recuperação durável de tentativas.

Esses resultados validam candidatos e signaling no projeto isolado. Não são testes físicos de Tampermonkey, nem validação do backend completo de cada produto em um ambiente TEST independente.

### Baseline #75

[Candidate Checks histórico 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS no SHA inalterado `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`. Não substitui a evidência mais recente de #76.

### QA #82 — BLOCKED por validação herdada

[Validate 42364918068](https://github.com/Reekyi/UpStatus/actions/runs/42364918068): FAILURE no SHA exato `d5d71586a07ea1d7436f868b51c1dc1c09a54f5f`.

O job executou o build 3.4.7 / TEST 3.4.7 e falhou em `scripts/validate.mjs:26` com `VALIDATION FAILED: production updateURL mismatch`. O diff de #82 contém apenas documentação (arquivo principal e relatórios de auditoria); não há alteração de runtime para justificar a falha. Não enfraquecer o validador para obter verde.

### TEST guard #84 — AUTOMATED PASS de validação, sem deploy

[Validate 42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144): SUCCESS no SHA exato `66ccc65af430dfee55560e90e1f832336fff0212`.

Passaram:
- Guard de destino de build TEST.
- Contrato de metadata do projeto (ref, organização, ACTIVE_HEALTHY e host do banco).
- Guard do workflow manual-only, pinagem do SHA do dispatch, allowlist de develop, deploy exclusivo de `upstatus-test` e token em escopo de steps.
- Contrato do cliente de upload assinado (rota, bucket, MIME, tamanho, origem, object path, token de uso único, PUT e UI).
- Validação do repositório.

O próprio log construiu UpStatus 3.0.40 / TEST 3.0.40-beta.22 com sentinel inerte. Isso valida a branch de segurança #84, não o candidato Normal 3.4.7. O workflow_dispatch não foi executado e a chamada real à Supabase Management API não ocorreu porque não há projeto TEST completo.

## 3. TEST: guard seguro, ambiente completo ainda inexistente

A organização expõe somente dois projetos:

| Projeto | Ref | Estado | Região |
|---|---|---|---|
| Produção UpStatus | `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | us-west-2 |
| Laboratório signaling/auth | `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | sa-east-1 |

Não existe terceiro projeto TEST completo.

O builder Normal no HEAD #74, blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`, usa `UPSTATUS_TEST_PROJECT_ID`; sem variável, o destino é o sentinel `00000000000000000000`. Rejeita explicitamente produção e o projeto isolado. API e Realtime do artefato TEST derivam do mesmo projeto de destino. Isso corrige o direcionamento automático anterior para produção.

A PR #84, workflow blob `1ca0c4ef4f633724280b81691471d8acc777edd2`, configura `workflow_dispatch`, checkout do SHA exato do evento, exige `GITHUB_REF=refs/heads/develop`, compara checkout com `GITHUB_SHA`, verifica metadata do projeto e limita o token aos steps necessários. O workflow implanta somente `upstatus-test`. Nenhum deploy foi executado nesta auditoria.

**Bloqueio remanescente:** o laboratório não é backend completo Normal/Team Lite e é rejeitado pelo guard como destino de TEST full-product. Não há projeto aprovado para o preflight real nem para deploy TEST.

### Team Lite sem runtime TEST próprio

No builder Team Lite do HEAD #76, blob `41fe447508ac3e48cdbf3a7b85446bf7291be004`, `renderTeamLiteFunction()` não recebe variante TEST e grava somente `upstatus-team-lite`. O build também gera `upstatus` e `upstatus-test`, mas não `upstatus-team-lite-test`.

O workflow TEST da #84 implanta apenas `upstatus-test`. Portanto, Candidate Checks #76 valida o cliente Team Lite e integração com signaling isolado, mas não um runtime Edge Function Team Lite em TEST. Criar ambiente e pipeline TEST para Team Lite é gate separado.

## 4. Divergência confirmada no backend/distribuição Normal

**BLOCKER DE CUTOVER — CODE INSPECTION.**

No `scripts/build.mjs` da #74 (blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`):
- produção `CLOUD_SERVER` é montado com `upstatus-screen-share-3-1-1-beta10`;
- `updateUrl` usa `release.scriptUrl`.

O `release.json` do mesmo HEAD (blob `93caf1701ea508575c90d002c0b8c3037b34d82a`) aponta para `/functions/v1/upstatus/upstatus.user.js`.

Assim, distribuição/UpdateURL aponta para `upstatus`, enquanto chamadas de API continuam para beta10. O workflow de deploy de produção da linha revisada implanta `upstatus`, não a beta10. A versão beta10 implantada é v6; `upstatus` é v480. O candidato precisa alinhar distribuição, API, autenticação, signaling, Storage e rollback como uma única mudança revisada.

## 5. Compatibilidade e AUTH-03

### Candidato — AUTOMATED PASS + CODE INSPECTION

Normal e Team Lite contêm convite de primeiro acesso:
- Token aleatório de 32 bytes (256 bits); apenas SHA-256 é persistido.
- Expiração de 15 minutos.
- Emissão atrás de contexto autenticado e verificação de papel administrativo.
- Setup exige token hexadecimal de 64 caracteres.
- RPC `consume_upstatus_setup_invite` faz consumo atômico; replay/expiração/concor­rência são cobertos no laboratório.
- Papéis NULL/vazios/whitespace recebem papel comum; papéis não vazios são preservados literalmente. ` implementation_admin ` não é promovido a administrador.
- A RPC isolada é SECURITY INVOKER, search_path vazio e EXECUTE restrito a service_role.

Os logs exatos de #74 e #76 aprovam o teste de RPC com tokens malformados/incorretos/expirados/replay e one-winner. **Isso não é prova do fluxo HTTP completo.**

### Pendências AUTH-03/AUTH-02

- Não foi exercitada a rota HTTP real `/api/setup-invite` → entrega privada → `/api/setup`; não há evidência de HTTP 403 para emissor não administrador nem de ausência de token em logs.
- Não há UI administrativa dedicada para emissão; a operação depende de cliente interno autenticado e entrega privada.
- Não existe `upstatus_auth_rate_limits` nem `consume_upstatus_auth_rate_limit` no projeto isolado ou produção. O rate limit de signaling não limita login/setup.
- Política de senha de novo setup diverge: Normal exige 6 caracteres; Team Lite aceita 4. Login existente aceita mínimo 4 em ambos. Isso é divergência de política de criação, não evidência de incompatibilidade do login atual.
- Normal e Team Lite usam cache de sessão de 5 segundos. A janela deve ser considerada na análise de revogação imediata.

## 6. Produção: Edge Functions e autenticação legada

Inventário atual: 38 Edge Functions ACTIVE em produção; todas reportam `verify_jwt=false`. Isso descreve a configuração do gateway e, isoladamente, não prova ausência de autenticação, pois as funções centrais validam sessão customizada `x-upstatus-token`. É necessário manter revisão por rota.

Fontes implantadas inspecionadas individualmente:

| Função | Versão | SHA da implantação |
|---|---:|---|
| `upstatus` | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-test` | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |
| `upstatus-team-lite` | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| beta10 | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

As quatro fontes ainda contêm:
- `POST /api/setup` antigo sem convite.
- Fallback de papel administrativo baseado em nome quando role está ausente.
- `GET /api/account` com exposição do estado `needsSetup`.
- Nenhuma rota `/api/setup-invite`.
- Nenhum auth rate limiter.

Consulta agregada SELECT em `public.users`: 5 contas, 0 password_hash NULL/vazio, 0 role NULL/em branco, 3 administradores explícitos. Não há conta atualmente reivindicável nesta fotografia; o risco é latente para provisionamento futuro enquanto as funções antigas continuarem implantadas.

Produção: 7 migrations até `20261027155438`. Não existem setup-token columns/RPC, auth rate-limit, signaling rate-limit ou RPC de read receipts atômicos. Nenhuma migration candidata foi aplicada.

## 7. PostgreSQL, RLS, grants e SECURITY DEFINER

### Produção

Security Advisor observado em 07/11/2026 11:30 UTC:
- 6 WARN: três funções SECURITY DEFINER executáveis por anon e as mesmas três por authenticated.
- 10 INFO: tabelas com RLS habilitado sem policies.
- Performance Advisor sem findings; Health Advisor sem findings.

Catálogo SELECT:
- 10 tabelas public com RLS e zero policies.
- Nove tabelas backend-owned têm grants de cliente para anon e authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER. `upstatus_visual_config` não tem grants de tabela para esses papéis.
- RLS sem policy não prova acesso a linhas; TRUNCATE não é protegido por RLS e os grants são superfície de privilégio desnecessária.
- `realtime.messages`: RLS=true, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

As três funções de broadcast são SECURITY DEFINER, `search_path=public`, com EXECUTE efetivo para PUBLIC/anon/authenticated/service_role:
- `upstatus_broadcast_messages()`: publica linha OLD/NEW completa via `to_jsonb`.
- `upstatus_broadcast_remote_state()`: publica metadados de comandos e resultados.
- `upstatus_broadcast_users()`: publica name/status/reason/update/sync.

Os três triggers estão habilitados e chamam `realtime.send(..., private=false)`. O broadcast de mensagens é divulgação de conteúdo/metadata em canal público; RLS na tabela não impede o trigger SECURITY DEFINER de publicar o payload.

### Projeto isolado

33 migrations até `20261107061242`; duas Edge Functions ACTIVE: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

Security Advisor: zero WARN; 17 INFO de RLS sem policy. Performance: quatro INFO de índices não utilizados. Health: sem findings.

Catálogo SELECT:
- Tabelas public backend-owned sem grants diretos para anon/authenticated.
- RPCs `consume_upstatus_setup_invite`, `consume_upstatus_signal_rate_limit` e `merge_chat_read_receipts` existem, são SECURITY INVOKER, search_path vazio e EXECUTE apenas para service_role.
- Não existe auth rate limiter.
- Três funções de broadcast são SECURITY DEFINER com `search_path=pg_catalog, public`, EXECUTE somente para postgres/service_role e payload reduzido a `{op}`. Ainda usam `private=false`.
- `realtime.messages` continua RLS=true, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

### ACL-02

Produção mantém default ACLs amplos associados a postgres em public/storage e a supabase_admin em schemas gerenciados, incluindo public/graphql/graphql_public. A sessão postgres não é superuser e não é membro de supabase_admin; supabase_admin é superuser. A auditoria não tentou alterar ACLs. Correção requer caminho administrativo autorizado, validação e rollback.

## 8. Fixtures e segurança operacional

Consulta SELECT pós-workflows no laboratório retornou zero linhas nas tabelas verificadas: users, sessions, rooms, memberships, call attempts, voice attempts, events e signaling rate-limit buckets. Isso é fotografia pontual; nenhuma limpeza manual foi executada.

Não foi iniciado workflow, workflow_dispatch, rerun ou script mutável por esta auditoria. O Validate #84 foi consultado como evidência existente; não foi iniciado pela QA.

## 9. Issues e aceitação manual

- [#78 Reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 26 comentários, 0/8 critérios marcados. Último checkpoint de engenharia em 07/11 07:00 BRT confirma que não houve teste físico no Tampermonkey com perda de internet/retorno sem F5, encerramento/reabertura offline, permissões reais de microfone/display ou interoperabilidade instalada Normal ↔ Team Lite. **MANUAL PENDING.**
- [#79 Release](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 92 comentários. O corpo principal ainda conserva snapshot de 03/11. Último comentário consultado, 07/11 07:55 BRT, registra a pinagem de SHA do deploy TEST e o Validate PASS da #84. O corpo precisa ser reconciliado pelo responsável; não foi editado nesta auditoria.

## 10. Próximos gates

1. Alinhar CLOUD_SERVER/API, UpdateURL/distribuição, Storage, signaling e rollback do Normal; exigir teste que compare os destinos renderizados.
2. Provisionar ambiente TEST full-product dedicado, sem reutilizar produção ou o laboratório de signaling/auth.
3. Criar runtime e workflow TEST próprios para Team Lite; não declarar backend Team Lite validado por testes apenas do cliente/signaling.
4. Executar preflight Management API e deploy TEST somente após provisionamento e autorização explícita; validar ambos os runtimes em ambiente isolado.
5. Completar integração HTTP do enrollment: emissão admin, 403 não-admin, token privado, consumo real e ausência de token em logs.
6. Implementar rate limit distribuído e fail-closed separado para login/setup/invite, com concorrência, 429/Retry-After e recuperação.
7. Unificar a política de novas senhas ou documentar explicitamente o contrato compartilhado.
8. Planejar cutover das quatro funções legadas e retirar primeiro-setup público/fallback por nome, com rollback testado em TEST.
9. Remover payloads completos de broadcast em produção; desenhar troca de JWT confiável ou transporte mediado antes de habilitar Realtime privado. Não apenas alternar `private=false` sem política/JWT compatível.
10. Reduzir grants das nove tabelas, resolver `realtime.messages` e ACL-02 por caminho administrativo autorizado.
11. Completar os oito critérios físicos de #78, reconciliar #79 e obter reviews humanas dos PRs.

## Registro de segurança

- Produção e laboratório consultados sem SQL writes; todas as queries foram SELECT-only.
- Nenhuma migration aplicada; nenhuma Edge Function implantada/alterada.
- Nenhum secret, flag, role, grant, policy ou ACL alterado.
- Nenhuma fixture criada, modificada ou removida pela auditoria.
- Nenhum workflow iniciado, rerun, cancelado ou despachado pela auditoria.
- Nenhum merge, release ou publicação de userscript.
- Nenhuma branch de engenharia alterada.
- Única escrita desta rodada: este relatório novo na branch QA dedicada, sem sobrescrever arquivo existente.

Não há percentual de conclusão. CI automatizado, inspeção de código, runtime isolado, catálogo de produção, aceitação física e prontidão de release permanecem estados distintos.

## Links de evidência

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA](https://github.com/Reekyi/UpStatus/pull/82)
- [PR #84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84)
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089)
- [Normal Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038)
- [Team Lite Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800)
- [QA Validate 42364918068](https://github.com/Reekyi/UpStatus/actions/runs/42364918068)
- [TEST guard Validate 42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144)
- [Supabase lint: SECURITY DEFINER callable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase lint: SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase lint: RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
