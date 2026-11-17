# Auditoria independente de qualidade — UpStatus

**Execução:** 2026-11-15T01:40:06.829Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**. Não liberar, não publicar e não despachar os workflows oficiais.

## 1. Escopo, método e limites

Foram inspecionados heads e comparações do GitHub, PRs #74, #75, #76, #80, #82 e candidatas #164–#167, workflows, logs de Actions, Issues #78 e #79, arquivo `docs/RELEASE_READINESS.md`, código dos templates/userscripts e Edge Functions implantadas, catálogos PostgreSQL, grants, policies, triggers, migrations, Storage, Realtime, Security Advisors e logs do projeto de laboratório.

Todas as consultas SQL foram SELECT-only. Não houve chamada de escrita, teste de exploração, merge, deploy, migration, alteração de secrets/flags, publicação ou operação destrutiva.

**Limite local:** não existe checkout Git nem ambiente local com navegador/Tampermonkey nesta execução. `/mnt/data` está vazio e não foi encontrado diretório `.git` em `/workspace`, `/workspaces`, `/repo` ou `/app`. Portanto, não foram executados testes locais ou testes manuais físicos.

## 2. Heads e governança

| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` (antes do relatório) | `744fe3c1063c36e340b2a278d1771cb7b80ea7f6` |

Antes de anexar este relatório, a comparação QA → master retornava **323 commits à frente e 1 atrás**, com 173 arquivos divergentes, todos sob `docs/`. O commit aditivo desta auditoria é `0566aa4c7e5cb4b480107e3e72612fe107ab9d51`; depois dele, a comparação passou a 324 commits à frente e 1 atrás, com 174 arquivos, ainda todos sob `docs/`. Não houve alteração de runtime.

As quatro branches consultadas retornam `protected=false`; o endpoint de repository rulesets retorna lista vazia. Não há enforcement de checks obrigatórios nem review humana exigida pelas regras de branch. Isso permite que alterações cheguem às linhas principais sem a barreira formal de aprovação.

As PRs #74, #75, #76, #80, #82, #164 e #167 não possuem reviews submetidas.

## 3. Documento de prontidão

`docs/RELEASE_READINESS.md` foi recuperado integralmente pela API de conteúdo: **8.410 linhas**. O último checkpoint interno continua em **08/11/2026, 18:30 UTC**. O documento está desatualizado em relação às auditorias e candidatas de 14–15/11.

O arquivo principal não foi sobrescrito nem editado nesta execução. Este relatório é um arquivo novo e aditivo em `docs/audits/`.

[RELEASE_READINESS.md](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md)

## 4. PRs, commits e CI

| PR | HEAD | Estado/evidência |
|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Draft; Validate [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770142); Smoke [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft; PASS histórico, sem workflow run associado ao HEAD atual consultado |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Draft; Candidate Checks [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| #80 handoff | `46541cad8b5592e183406ed2d78afc2b43c47bff` | Draft, apenas documentação; Validate [FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43651529898): `client signed upload helper missing` |
| #82 QA | `744fe3c1063c36e340b2a278d1771cb7b80ea7f6` | Draft, apenas documentação; Validate [FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43659224234): `production updateURL mismatch` |
| #164 signed upload | `a27ced56564f3d18948c70138f6d6b2a1f2d0907` | Draft; Validate [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43544570609), mas build reporta 3.0.40 / TEST 3.0.40-beta.22 e os testes são de contrato/offline, não upload real em Storage |
| #167 updater/chat | `d100b0820dd7f98e2b78a98e6b6f8c09f13b1867` | Draft; Validate [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43635704388); regressões automatizadas de chat aprovadas, sem Smoke Supabase |

### Detalhes de CI

- **#74:** 136/136 verificações autenticadas passaram; houve WebRTC de chamada, voz e tela em navegador automatizado, mesh de três participantes, rate limit de sinalização (90 aceitos e o seguinte HTTP 429 com Retry-After de 60s) e limpeza de fixtures. A etapa de rate limit distribuído de emissão de setup invites foi **skipped**.
- **#76:** 110/110 verificações autenticadas e 16/16 não autenticadas passaram. O workflow também validou o IIFE completo com Chromium e stubs de Tampermonkey, WebRTC, recuperação de voz/tela, rate limit e setup-invite rate limit.
- Os testes de sala de voz aberta em #74/#76 confirmam entrada livre, sem convite pendente. Isso está de acordo com a regra explícita da [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): sala de voz é canal aberto, sem convite ou aceitação. A ausência de convite nessa RPC **não é defeito**.
- **#80:** a falha não foi causada pelos arquivos documentais. O branch base `develop` não contém o helper de upload que o validator exige. #164 contém uma candidata e passa em Validate, mas continua separada, baseada em `develop` e com build 3.0.40, não equivalente à linha master 3.4.7.
- **#82:** o builder/validator de master ainda diverge no updateURL. #167 corrige o endereço via `release.scriptUrl` em uma candidata separada, mas a correção não está integrada à #82/master.
- **#165 Normal:** o guard de proveniência passou no [run 43619663713](https://github.com/Reekyi/UpStatus/actions/runs/43619663713); o Smoke [43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) foi bloqueado por HTTP 402 do projeto isolado.
- **#166 Team Lite:** guard offline passou no [run 43624572780](https://github.com/Reekyi/UpStatus/actions/runs/43624572780). Não é Smoke Supabase nem teste físico.

## 5. Proveniência de sinais e compatibilidade Normal / Team Lite

Nos candidatos #74/#76, a proteção de origem ainda depende do campo `_authenticatedTransport` dentro do payload de `call_signal`. O campo é controlável por quem publica no canal; portanto não é prova de origem confiável.

As candidatas #165 e #166 corrigem o desenho: `receiveCallSignal(payload, authenticatedSource)` recebe a proveniência como argumento separado; o listener público passa `false`, e somente o caminho autenticado passa `true`. Com a flag ligada, a allowlist pública fica limitada a hints explícitos de descoberta (`presence`/`ended`), não a offer/answer/ICE.

Essa correção ainda está em PRs Draft separadas, não integrada às PRs principais. #165 não completou Smoke por quota; #166 foi validada offline.

O adapter de sinalização nos candidatos continua **opt-in e desativado por padrão** (`GM_getValue(..., false)`); o endpoint padrão é vazio. O cliente exige HTTPS, mesma origem do servidor de sessão e caminho `/functions/v1/upstatus-signal` ou `/functions/v1/upstatus-signal-test`.

Produção não possui uma Edge Function `upstatus-signal`. O único `upstatus-signal-test` está no projeto de laboratório, em outro host. A checagem de mesma origem impede usar diretamente o host do laboratório como endpoint do cliente de produção. Logo, o adapter não é ativável com segurança hoje.

## 6. Realtime: produção versus laboratório

### Produção

Os três triggers de broadcast continuam publicando com `private=false`. `upstatus_broadcast_messages()` serializa OLD/NEW com `to_jsonb`, podendo incluir texto da mensagem, URLs de anexos e metadados. Os outros triggers publicam dados de status e estado remoto.

O snapshot de `realtime.messages` retornou **106 registros nos últimos 14 dias, todos private=false**:
- user_status: 72
- db_change: 26
- remote_command: 4
- remote_result: 4

O tópico dos triggers (`upstatus-live-6f5e7b31-...`) não coincide com o tópico usado pelos clientes instalados (`upstatus-screen-share-live-3-1-1-beta10`). Isso não comprova entrega aos clientes.

Não foi possível confirmar a configuração Allow public access do Dashboard nem reproduzir acesso externo. Portanto, há um caminho de exposição potencial confirmado no desenho, não evidência de vazamento externo comprovado.

### Laboratório

As definições SQL dos triggers minimizam o payload para `{op: TG_OP}`, sem transmitir a linha completa. As funções de broadcast usam `search_path` vazio e EXECUTE restrito a service_role. Porém, os canais ainda são `private=false`; `realtime.messages` mantém grants de cliente e zero policies. Minimização de payload não equivale a Realtime privado/autorizado.

## 7. Supabase: RLS, grants, SECURITY DEFINER e Storage

### Produção (`dlfvkawaiqduhlazsszm`)

- 10 tabelas públicas com RLS habilitado e zero policies.
- 126 linhas de grants diretos para anon/authenticated em tabelas públicas; 18 grants TRUNCATE.
- 24 registros Default ACL, 75 entradas ACL.
- 3 funções SECURITY DEFINER de broadcast, com `search_path=public` e EXECUTE para anon/authenticated.
- O Security Advisor retorna 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated. O Advisor identifica os três endpoints RPC; nenhuma chamada foi executada nesta auditoria.
- `storage.objects`: 8 grants diretos para anon/authenticated e zero policies.
- Buckets públicos: `chat-images` (168 objetos) e `profile-images` (20 objetos), ambos com limite de 20 MiB.
- `realtime.messages`: 6 grants diretos para anon/authenticated e zero policies.

### Laboratório (`bfpjtfqlnypisxljoxkb`)

- 18 tabelas públicas com RLS e zero policies, mas zero grants diretos de tabela pública para anon/authenticated.
- 25 registros Default ACL e 70 entradas ACL.
- `storage.objects`: ainda 8 grants de cliente e zero policies; não há buckets.
- `realtime.messages`: ainda 6 grants de cliente e zero policies.
- Security Advisor: 18 INFO de RLS sem policy, sem WARN de SECURITY DEFINER.
- 39 migrations; projeto `ACTIVE_HEALTHY`.

A ausência de grants nas tabelas públicas do laboratório não significa hardening completo: Storage, Realtime e Default ACL ainda precisam de revisão.

## 8. Identidade, AUTH-03 e Edge Functions

### Produção

- 5 registros em `public.users`, 319 sessões, 5 perfis, 302 mensagens e zero registros em `auth.users`.
- `upstatus_sessions` e `upstatus_profiles` usam `user_name`; não há `user_id` persistido nessas tabelas.
- Nenhuma coluna de setup token; nenhuma tabela/RPC de setup-invite ou rate limit de convite/sinalização.
- `POST /api/setup` continua encaminhando para o fluxo legado `login(req, true)`.
- `POST /api/chat/clear` nas funções instaladas verifica somente `name === "Ricardo"`; não exige também o papel persistido `implementation_admin`. #167 melhora esse controle no template candidato, mas não está implantada.
- 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false` no nível da plataforma. Os handlers core inspecionados validam token de sessão próprio; esse campo, isoladamente, não prova endpoint desprotegido.

Versões observadas:
- `upstatus` v480
- `upstatus-team-lite` v15
- `upstatus-screen-share-3-1-1-beta10` v6
- `upstatus-test` v281

### Laboratório

- 4 colunas de setup token.
- Tabelas de rate limit de sinalização e setup invite.
- RPCs `consume_upstatus_setup_invite`, `consume_upstatus_signal_rate_limit`, `consume_upstatus_setup_invite_rate_limit` e `open_upstatus_signal_voice_room`.
- Essas RPCs consultadas são SECURITY INVOKER, com `search_path` vazio e EXECUTE restrito a service_role.
- `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

As tabelas de produto, usuários, sessões, salas, memberships, eventos, bindings e tentativas estão vazias após a limpeza dos testes.

O helper cliente reconhece `VOICE_ATTEMPT_ALREADY_ACTIVE` como conflito de domínio, mas preserva o status HTTP recebido. A função `upstatus-signal-test` v32 não mapeia explicitamente esse código para HTTP 409 (mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`); portanto, quando o RPC retorna esse código, o caminho cai no erro genérico 500. O contrato HTTP precisa ser alinhado e testado no endpoint.

## 9. Workflows e releases

O workflow atual de master:
- usa Supabase CLI `latest`;
- não fixa explicitamente `github.sha` no checkout nem compara o SHA conferido;
- não valida o project ref esperado contra um ID fixo;
- publica `upstatus`.

O workflow oficial `team-lite-official` também usa CLI `latest`, não valida branch/SHA/projeto e publica **`upstatus`**, não `upstatus-team-lite`.

A workflow candidata Normal em #74 adiciona checagem de `refs/heads/master`, igualdade entre checkout SHA e `github.sha`, validação do projeto de produção e CLI pinada em 2.122.1; ainda publica apenas `upstatus` e não está integrada.

Versões/manifestos:
- Normal master: 3.4.7; a candidata #74 também mantém 3.4.7, portanto exige bump deliberado antes de publicar código novo sob a mesma versão.
- Team Lite oficial: 3.4.30; candidata #76: 3.4.31.

## 10. Ambiente de teste e aceitação física

O projeto de laboratório está saudável, mas não é Full-Product TEST. Não há usuários, sessões, perfis, buckets, objetos ou fixtures persistentes.

Os logs das últimas 24 horas mostram 19 invocações de `upstatus-signal-test` em **14/11/2026 às 17:10:45 UTC**, todas HTTP 402 por quota. Não houve novas linhas `function_edge_logs` depois desse bloco no período consultado. A quota não foi diagnosticada por billing e não foi repetido Smoke.

A branch Supabase gerenciada `main` de produção continua `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

A Issue #78 permanece sem aceite físico: 0/8 critérios. Não há confirmação manual de reconexão Normal/Team Lite sem F5, nova chamada, microfone/áudio, compartilhamento de tela e interoperabilidade. CI de Chromium e testes com stubs não substituem o navegador real com Tampermonkey.

## 11. Gates QA

| Gate | Estado | Justificativa |
|---|---|---|
| RT-01 | blocked | Produção continua publicando Realtime sem private/auth; backend server-mediated ausente |
| TEST-ISOLATION | blocked | Projeto isolado sem fixtures Full-Product e Smoke bloqueado por HTTP 402 |
| AUTH-03 | blocked | Produção sem setup tokens/invite/rate limit; sessão/perfil sem user_id |
| ACL-STORAGE | blocked | Grants amplos, SECURITY DEFINER, buckets públicos e policies ausentes |
| RECONNECT | pending | Issue #78 0/8, sem confirmação física |
| HUMAN-REVIEW | pending | PRs relevantes sem reviews humanas |
| MIGRATION-PROVENANCE | não atualizado | A proveniência dos SQLs originais não foi reavaliada nesta execução |

## 12. Próximos passos recomendados

1. Integrar, com revisão, a proveniência separada de #165/#166 nas linhas candidatas Normal e Team Lite.
2. Implementar e validar a Edge Function server-mediated em cada origem de produção; manter o transporte legado desligado/removido no corte.
3. Minimizar os broadcasts de produção, restringir EXECUTE das três funções SECURITY DEFINER e revisar RLS/grants/Default ACL.
4. Endurecer Storage, remover grants públicos desnecessários e definir policies por usuário/sessão.
5. Reconciliar #164 com a linha de versão atual e corrigir o builder/updateURL sem regressão de anexos.
6. Corrigir o workflow oficial Team Lite para publicar a função correta, pin de CLI, branch/SHA/project guard e review obrigatória.
7. Proteger master, develop, team-lite-official e QA com checks obrigatórios e aprovação humana.
8. Restaurar a quota do laboratório, provisionar fixtures Full-Product TEST e repetir os testes integrados.
9. Alinhar o contrato HTTP 409 de voz e executar os oito critérios físicos da Issue #78.
10. Obter reviews humanas e autorização explícita antes de qualquer release.

**Conclusão:** os candidatos têm automação útil e há hardening real no laboratório, mas a produção ainda não possui transporte autenticado integrado, mantém broadcasts públicos, permissões excessivas e workflows sem controles suficientes. **NOT READY.**
