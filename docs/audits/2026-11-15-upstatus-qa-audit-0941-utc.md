# Auditoria independente UpStatus — 2026-11-15T09:41:37.502Z

**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Veredito:** **NOT READY**

Esta execução revalidou `docs/RELEASE_READINESS.md`, os heads reais, PRs #74/#75/#76/#82, Issues #78/#79, workflows, jobs de CI, bundles servidos pelas Edge Functions e os catálogos/logs dos dois projetos Supabase.

## 1. Heads e governança

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e...` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA antes deste relatório | `2bef52f6bf5435bafbb2d2d70c3f095e765013da` |

As quatro branches consultadas retornam `protected=false`; a API de repository rulesets retorna lista vazia. A QA está 333 commits à frente e um atrás de master. Não há review humana nas PRs obrigatórias.

## 2. PRs e CI

| PR | HEAD | Comparação com base | Resultado observado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 à frente, 1 atrás de master | Validate e Smoke SUCCESS |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 à frente de team-lite-official | PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | 386 à frente de team-lite-official | Candidate Checks SUCCESS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `2bef52f6bf5435bafbb2d2d70c3f095e765013da` | 333 à frente, 1 atrás de master | Validate FAILURE |

Evidências exatas:
- [#74 Validate, run 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), HEAD `dcaf6a...`, SUCCESS.
- [#74 Signaling Smoke, run 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200), SUCCESS.
- [#75 Candidate Checks, run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), HEAD `7bbf9b...`, SUCCESS em 03/11; é evidência histórica.
- [#76 Candidate Checks, run 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881), HEAD `83a6cc...`, SUCCESS.
- [#82 Validate, run 43694966239](https://github.com/Reekyi/UpStatus/actions/runs/43694966239), HEAD `2bef52f...`, FAILURE.

O job #76 passou pelos guards de projeto TEST, autenticação do adapter, enrollment, recuperação de tentativas de voz, recuperação de screen-share, contrato HTTP, browser smoke com IIFE completo e stubs, concorrência de rate limit, recibos e consumo único de convites. Isso é CI automatizado, não teste físico.

O log de #82 confirma:
```
Built UpStatus 3.4.7 / TEST 3.4.7
VALIDATION FAILED: production updateURL mismatch
scripts/validate.mjs:26
```

A branch master ainda usa uma checagem antiga de URL; a candidata #74 valida a URL contra `release.scriptUrl`. O novo relatório é documental e não recebeu rerun de Validate.

## 3. Workflows de publicação

### Normal

O workflow de master usa Supabase CLI `latest`, não fixa explicitamente o SHA despachado nem valida o project ref esperado. A candidata #74 adiciona guard de branch/SHA/projeto e fixa CLI 2.122.1, mas seu deploy publica somente `upstatus`. O userscript Normal implantado usa a API beta10; o cutover precisa coordenar os dois serviços.

### Team Lite

O workflow oficial [deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml):
- valida o `release.json` da raiz, não o manifesto Team Lite;
- usa CLI `latest`;
- não fixa projeto/SHA;
- executa `supabase functions deploy upstatus`, embora o alvo seja `upstatus-team-lite`.

O userscript Team Lite implantado usa `@updateURL` e `@downloadURL` de uma raw branch GitHub mutável (`team-lite-official`), que está desprotegida. Não executar o workflow atual.

## 4. Bundles e compatibilidade Normal/Team Lite

As fontes implantadas foram inspecionadas e os userscripts embutidos decodificados:

| Runtime | Versão da função | Userscript embutido | Distribuição |
|---|---:|---:|---|
| `upstatus` | v480 | 3.4.7 | Supabase Function `upstatus` |
| `upstatus-team-lite` | v15 | 3.4.30 | raw GitHub branch `team-lite-official` |
| `upstatus-test` | v281 | 3.3.28 | endpoint legado de teste |
| `upstatus-screen-share-3-1-1-beta10` | v6 | script launcher beta8 | API legada beta10 |

Os dois bundles principais:
- assinam `upstatus-screen-share-live-3-1-1-beta10`;
- não usam `private:true` nem `realtime.setAuth()`;
- não contêm o adapter autenticado candidato;
- mantêm listeners públicos de `call_signal`, voz e screen-share.

A política de senha também diverge no runtime: Normal exige seis caracteres para login/setup; Team Lite exige quatro. Ambos ainda permitem primeiro setup sem token de convite. Os candidatos #74/#76 usam seis caracteres no setup, quatro no login e consumo de convite único.

No runtime instalado, `/api/account?name=` revela `needsSetup`; `/api/setup` não consome convite; o fallback de papel administrativo usa nomes quando o role está vazio; `/api/chat/clear` verifica somente `name === Ricardo`. Os candidatos exigem token de setup e papel persistido `implementation_admin` para limpar o chat.

O fluxo de upload assinado aceita MIME/tamanho declarados pelo cliente e limita a 20 MiB, sem inspeção dos bytes nesse caminho. `sniffMime()` retorna o MIME declarado quando não reconhece a assinatura. O client ainda aceita vídeo até 25 MiB em um fluxo, enquanto backend e buckets limitam a 20 MiB. É inspeção de código; nenhum exploit ou upload malicioso foi executado.

## 5. HTTP 402 — disponibilidade

Janela consultada: 2026-11-14 09:34 UTC a 2026-11-15 09:34 UTC.

**Produção: 94 respostas HTTP 402**
- 88 em `function_edge_logs`;
- 6 no gateway Realtime (`edge_logs`).
- Downloads Normal: 21 GET + 1 HEAD.
- Downloads Team Lite: 24 GET + 1 HEAD.
- API beta10 chat: 21.
- API beta10 status: 10.
- API beta10 remote-status: 10.
- WebSocket Realtime: 6.
- Última ocorrência: 2026-11-14 20:57:39.868 UTC.

**Laboratório: 19 respostas HTTP 402** em `function_edge_logs`, entre 17:10:45.422 e 17:10:45.867 UTC de 14/11, todas na função `upstatus-signal-test`.

Não foram encontrados registros 2xx posteriores à última falha de produção nas fontes/status consultados até 09:34 UTC. Isso não prova indisponibilidade total, mas também não comprova recuperação. A causa não foi identificada; não atribuir automaticamente a quota/billing sem evidência. Os dois projetos reportam `ACTIVE_HEALTHY`, o que não comprova disponibilidade dos endpoints.

## 6. Realtime

### Produção

- `realtime.messages`: RLS habilitado, zero policies; anon/authenticated têm SELECT e INSERT efetivos.
- 106 linhas observadas, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os clientes assinam `upstatus-screen-share-live-3-1-1-beta10`; o tópico não coincide com o dos triggers.
- `upstatus_broadcast_messages()` é SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated e transmite `to_jsonb(OLD/NEW)` completo.
- `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` também são SECURITY DEFINER, `search_path=public`, com EXECUTE amplo e broadcast público.

### Laboratório

- Os três triggers publicam somente `{op: TG_OP}`.
- As funções SECURITY DEFINER têm `search_path` vazio e EXECUTE somente para service_role.
- `realtime.messages` continua RLS sem policies e com SELECT/INSERT para anon/authenticated, embora sem linhas.

A minimização de payload no laboratório é uma melhoria real; RT-01 não está concluído porque os canais continuam públicos e os clientes oficiais não autenticam o transporte.

## 7. RLS, grants, SECURITY DEFINER e Storage

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Tabelas públicas com RLS | 10 | 18 |
| Policies no schema public | 0 | 0 |
| Grants diretos anon/auth em tabelas public | 126 | 0 |
| Grants TRUNCATE anon/auth | 18 | 0 |
| Funções SECURITY DEFINER de broadcast | 3 | 3 |

Em produção, os 126 grants estão distribuídos em nove tabelas (63 para anon e 63 para authenticated); os 18 grants TRUNCATE são 9 por papel. RLS não bloqueia TRUNCATE.

As três funções de broadcast têm EXECUTE para anon/authenticated. Security Advisor: produção 6 WARN e 10 INFO; laboratório zero WARN e 18 INFO.

Storage de produção:
- `chat-images`: público, 168 objetos, 20 MiB.
- `profile-images`: público, 20 objetos, 20 MiB.
- zero policies próprias em `storage.objects`;
- anon/authenticated têm SELECT/INSERT/UPDATE efetivos em `storage.objects`.

O laboratório não tem buckets/objetos, mas mantém grants e Default ACL amplos em `storage`; também há defaults de `supabase_admin` em GraphQL. Defaults de postgres em `public` no laboratório estão restritos a service_role.

## 8. AUTH-03, Edge Functions e migrations

### AUTH-03

Produção:
- cinco usuários; zero sem senha e zero sem role;
- 319 sessões e 302 mensagens;
- zero colunas `setup_token_*`;
- zero tabelas de rate limit/sinalização e zero RPCs de setup invite/sinalização.

Laboratório:
- `users` tem `setup_token_hash`, expiração, emissor e data de emissão;
- `upstatus_setup_invite_rate_limits`, tabelas de signaling, call attempts e voice attempts;
- duas funções de setup invite e sete de signaling, SECURITY INVOKER, search_path vazio e EXECUTE somente service_role;
- zero usuários/fixtures.

AUTH-03 existe apenas no laboratório; ainda não foi integrado à produção.

### Edge Functions

Produção tem 38 funções ACTIVE; 34 são nomes históricos test/beta/backup. Todas reportam `verify_jwt=false` no nível da plataforma. Os handlers principais têm autenticação própria por sessão, então esse campo não prova sozinho ausência de autenticação. `upstatus-test` v281 continua ativo com código legado. Laboratório tem duas funções ACTIVE.

### Migrations

- Produção: sete migrations no ledger.
- Laboratório: 38 migrations.
- Quatro migrations aplicadas em produção continuam sem seus arquivos-fonte em master, QA e candidato Normal:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

O ledger confirma a aplicação, mas não recupera a proveniência dos SQLs originais. A branch gerenciada Supabase `main` permanece `MIGRATIONS_FAILED`, com preview `ACTIVE_HEALTHY`.

A organização tem somente dois projetos Supabase: produção e laboratório de segurança. O laboratório está vazio e não é Full-Product TEST.

## 9. Issues e testes manuais

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados.

Não havia checkout local nem navegador com Tampermonkey/dispositivos reais nesta execução. Nenhum teste manual foi executado. CI de Chromium/WebRTC com stubs não substitui queda real de internet, reconexão sem F5, microfone, captura de tela e interoperabilidade instalada.

## 10. Veredito e próximos passos

**NOT READY.**

1. Diagnosticar os HTTP 402 em produção e laboratório e comprovar recuperação por respostas de sucesso.
2. Corrigir o workflow Team Lite antes de qualquer uso; o slug atual aponta para Normal. Substituir updateURL de branch mutável por artefato imutável.
3. Migrar Realtime para canal privado com autenticação de sessão, membership/recipient/replay/expiry validados no servidor; remover listeners públicos sensíveis.
4. Aplicar AUTH-03 em produção somente após revisão e autorização.
5. Restringir SECURITY DEFINER, grants, Default ACL, RLS, Storage e Realtime; decidir privacidade dos buckets.
6. Recuperar e validar os quatro SQLs originais.
7. Provisionar Full-Product TEST isolado.
8. Executar os oito testes físicos e obter reviews/aprovação humana.

### Limites desta execução

GitHub e Supabase foram usados para inspeções read-only, exceto a criação deste relatório documental na branch QA e a atualização do comentário QA da Issue #79. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL, escrita em produção ou operação destrutiva.
