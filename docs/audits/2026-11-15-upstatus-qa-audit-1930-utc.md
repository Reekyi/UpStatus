# Auditoria independente de qualidade do UpStatus
**Execução:** 2026-11-15 19:30 UTC  
**Recomendação:** NOT READY  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção:** `dlfvkawaiqduhlazsszm`  
**Laboratório:** `bfpjtfqlnypisxljoxkb`

## 1. Escopo e método

Revalidação read-only de branches, commits, PRs, Actions, Issues, workflows, templates, artefatos e documentação; inspeção dos runtimes Edge Functions instalados; consultas SQL exclusivamente SELECT nos catálogos e tabelas de telemetria dos dois projetos Supabase.

Nenhuma migration, alteração de tabela, policy, grant, secret, flag, função, deploy, release, merge ou publicação foi executada. Não houve teste de escrita no Supabase. A única escrita desta execução é este relatório novo na branch QA.

## 2. Heads e divergência entre branches

| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `5b10cd637518eb1d656b0f60d24b7ea2cd6bd153` |

Comparação com master:
- QA: 344 commits à frente e 1 atrás.
- develop: 114 à frente e 147 atrás.
- team-lite-official: 220 à frente e 147 atrás.

As três branches de produto consultadas estão sem proteção clássica (`protected=false`); a API de rulesets retornou lista vazia. A proteção clássica da branch QA não foi confirmada.

`docs/RELEASE_READINESS.md` foi lido integralmente: 8.422 linhas, aproximadamente 1,05 MB. A última seção de revalidação nele registrada é de 2026-11-15 06:30 UTC; este relatório registra evidências posteriores sem reescrever o documento-base.

## 3. PRs obrigatórias e CI

Os resultados abaixo são os runs associados aos SHAs exatos, não testes repetidos nesta execução.

| PR | HEAD | Evidência | Resultado |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | Ambos PASS |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico de 03/11 |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS |
| #82 QA | `5b10cd637518eb1d656b0f60d24b7ea2cd6bd153` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43748185490) | FAIL |

Detalhes importantes:
- #74: Validate e Smoke passaram. No Smoke, a sintaxe do harness de rate limit de setup-invite e a etapa **Verify distributed setup-invite issuance rate limit** foram SKIPPED. O teste de consumo atômico de convite foi executado.
- #76: Candidate Checks passou, incluindo testes de navegador offline, integração autenticada, recuperação de voz/tela, rate limit distribuído e consumo único de convite.
- #82: o passo `Validate build` falhou em `scripts/validate.mjs:26`, com `VALIDATION FAILED: production updateURL mismatch`. O HEAD da PR é um commit documental que adiciona somente o relatório QA de 18:39 UTC; a falha é do contrato de build atual, não de um teste manual.
- As PRs obrigatórias permanecem abertas, Draft e sem reviews submetidas.

## 4. Candidatas posteriores relevantes

| PR | HEAD | CI observado | Leitura QA |
|---|---|---|---|
| #161 Normal | `557814dc31bed779b84a2094358dc6b2a7e67689` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) PASS | Rate limit de setup-invite aprovado; rollout ainda bloqueado |
| #163 HTTP 409 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) e [Contract](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) PASS | Contrato candidato aprovado |
| #164 upload/avatar | `a27ced56564f3d18948c70138f6d6b2a1f2d0907` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) PASS | Não substitui teste real de Storage |
| #165 origem autenticada Normal | `434478771dca54505d3ec8b0cea0ada57d8d6dca` | [HTTP 409 Contract PR](https://github.com/Reekyi/UpStatus/actions/runs/43619801133) PASS; [Guard push](https://github.com/Reekyi/UpStatus/actions/runs/43619663713) PASS; [Smoke push](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) FAIL | O run de Smoke falhou por quota do projeto de teste; não é um PASS de integração |
| #166 origem autenticada Team Lite | `e90e0dbbc0c6d89d77ea359dff0f1e82b4428413` | [Guard PR](https://github.com/Reekyi/UpStatus/actions/runs/43624572780) PASS | Guard focado aprovado |
| #167 updater/anexos | `d100b0820dd7f98e2b78a98e6b6f8c09f13b1867` | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) PASS | Validate apenas |

Todas continuam Draft e sem aprovação humana.

### 4.1 #161: rate limit correto no candidato, mas rollout/versionamento incompletos

A candidata adiciona `consume_upstatus_setup_invite_rate_limit`:
- cinco emissões por administrador em janela de 900 segundos;
- chave por identidade administrativa com hash;
- tabela com RLS;
- revogação de privilégios de PUBLIC, anon e authenticated;
- RPC SECURITY INVOKER, `search_path = ''`, EXECUTE somente para service_role;
- validação de limites e limpeza oportunista limitada a 100 linhas.

O Smoke #161 executou com sucesso a etapa **Verify distributed setup-invite issuance rate limit**. O teste concorrente permite cinco de 24 requisições e rejeita as outras 19; também testa isolamento de buckets e cleanup.

Pendências:
1. O handler responde HTTP 429 sem cabeçalho `Retry-After`.
2. A tabela/RPC e os campos de setup ainda não existem em produção.
3. **Nova incompatibilidade de release:** #161 muda o `CLOUD_SERVER` do Normal de beta10 para `upstatus`, mas mantém `release.json.version = 3.4.7`. O artefato rastreado `UpStatus.user.js` continua em 3.4.7 e ainda aponta para beta10. O updater compara versão servida e instalada e só habilita a atualização quando `served > installed`; com 3.4.7 dos dois lados, a atualização não é oferecida. O build também exige versão maior para sincronizar o artefato raiz quando há mudança de conteúdo. O workflow de produção candidato continua permitindo somente 3.4.7. **É necessário coordenar bump de versão, artefato, validator e guard do workflow antes do cutover**, e testar a atualização real no gerenciador de userscripts.

## 5. Build, distribuição e workflows

### Normal

Em master:
- `release.json` declara `3.4.7` e `scriptUrl=https://.../functions/v1/upstatus/upstatus.user.js`.
- `scripts/validate.mjs:26` exige esse caminho `/upstatus/upstatus.user.js`.
- `scripts/build.mjs:42-43` ainda monta o cloud server de produção com `upstatus-screen-share-3-1-1-beta10` e deriva o updateURL desse endereço legado. Isso explica o FAIL de #82.

Na candidata #74, o build lê `release.scriptUrl`, mas ainda aponta o API cloud para beta10. A candidata #161 altera o API cloud para `PROD_FUNCTION` (`upstatus`), corrigindo o destino do backend, porém não resolve a versão sem bump descrita acima.

### Team Lite

Em `team-lite-official`:
- `release.json` da raiz: `3.0.40`, `preRelease=beta.22`.
- `team-lite/release.json`: `buildVersion=3.4.30`, canal stable.
- `.github/workflows/deploy-production.yml` lê o manifesto raiz, só rejeita pre-release, instala CLI `latest` e executa `supabase functions deploy upstatus`.

O workflow oficial, portanto, não consome o manifesto próprio e aponta para a função Normal, não `upstatus-team-lite`. O guard atual deve bloquear o manifesto beta.22; remover apenas o guard não tornaria o deploy correto.

### TEST

`develop/.github/workflows/deploy-test.yml` dispara em push para develop e usa `secrets.SUPABASE_PROJECT_ID` genérico. Não compara o destino com o ID autorizado do laboratório e instala CLI `latest`. O comando publica `upstatus-test`. O destino efetivo do secret não foi consultado.

O workflow de produção em master também usa projeto vindo de secret e CLI `latest`; o workflow candidato Normal melhora isso com SHA conferido, projeto esperado fixo e CLI 2.122.1, mas mantém o guard de versão 3.4.7.

## 6. Runtimes instalados e compatibilidade Normal/Team Lite

Inventário Supabase de produção:
- 38 Edge Functions ACTIVE; as 38 reportam `verify_jwt=false` no gateway.
- Funções centrais: `upstatus` v480, `upstatus-screen-share-3-1-1-beta10` v6, `upstatus-team-lite` v15 e `upstatus-test` v281.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3, ambas ACTIVE.

`verify_jwt=false` não prova, isoladamente, ausência de autenticação: os handlers centrais inspecionados usam `x-upstatus-token`, hash SHA-256 da sessão e expiração no banco. A cobertura das 38 funções não foi auditada rota por rota nesta execução.

Os userscripts embutidos nos runtimes:
| Produto | Versão | API efetiva | Tópico Realtime |
|---|---:|---|---|
| Normal | 3.4.7 | beta10 v6 | `upstatus-screen-share-live-3-1-1-beta10` |
| Team Lite | 3.4.30 | upstatus-team-lite v15 | `upstatus-screen-share-live-3-1-1-beta10` |

Ambos não contêm `private:true` nem `setAuth()`. A flag candidata `signaling_transport_enabled` é opt-in e fica false por padrão; portanto, a candidata não torna automaticamente o transporte privado o padrão para instalações existentes.

Os handlers beta10 e Team Lite instalados ainda:
- expõem `needsSetup` em `/api/account` e mantêm `POST /api/setup` sem token de convite de uso único;
- não contêm `setup_token`, `setup-invite` nem RPC de rate limit de convite;
- usam fallback de papel administrativo por nomes quando o papel persistido está ausente;
- autorizam limpeza do chat por comparação com o nome Ricardo, em vez de exigir exclusivamente o papel administrativo persistido;
- têm cache local de validação de sessão de 30 segundos.

A senha mínima também diverge: Normal exige seis caracteres; Team Lite exige quatro. A candidata #161 remove a dependência do fallback nominal no fluxo novo e exige consumo do convite, mas isso ainda não está instalado.

## 7. Realtime, triggers e SECURITY DEFINER

Na produção, a consulta a `realtime.messages` encontrou 106 registros em 14 dias, todos `private=false`:
- user_status: 72;
- db_change: 26;
- remote_result: 4;
- remote_command: 4.

O último registro observado foi em 2026-11-13. Isso é um snapshot histórico de mensagens armazenadas, não prova de tráfego atual nem de acesso externo.

Há divergência de tópico:
- clientes Normal e Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`;
- triggers publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

Os três triggers de produção chamam funções SECURITY DEFINER:
- `upstatus_broadcast_messages`: envia `to_jsonb(OLD/NEW)` completo para `db_change`, com private=false;
- `upstatus_broadcast_remote_state`: envia campos selecionados de comandos/resultados, com private=false;
- `upstatus_broadcast_users`: envia campos selecionados de status, com private=false.

As três funções de produção têm `search_path=public` e EXECUTE efetivo para anon e authenticated. Como retornam trigger, esses grants não demonstram por si só uma exploração RPC direta; são, contudo, privilégios desnecessários e uma configuração mais ampla que a candidata segura.

No laboratório, as três funções de broadcast estão com `search_path` vazio e EXECUTE restrito a service_role. O payload de mensagens candidato foi minimizado, mas os canais e grants de Realtime ainda não estão privados/autorizados.

## 8. RLS, grants, default ACL e Storage

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Tabelas public com RLS e sem policies | 10 | 18 |
| Grants diretos anon/authenticated em tabelas public | 126 linhas de privilégio em 9 tabelas | 0 |
| Grants TRUNCATE em public | 18 | 0 |
| Buckets Storage | 2 públicos | 0 |
| Objetos Storage | 188 | 0 |
| Policies próprias em storage.objects | 0 | 0 |

Em ambos os projetos, `realtime.messages` e `storage.objects` têm RLS habilitado, sem policies próprias, e `has_table_privilege` retorna SELECT/INSERT para anon e authenticated. RLS sem policies tende a negar acesso a linhas, mas os grants continuam amplos e não devem ser tratados como proteção suficiente.

Default ACLs ainda concedem privilégios de cliente para objetos futuros:
- produção: defaults de postgres e supabase_admin em public, além de GraphQL/GraphQL Public e Storage;
- laboratório: defaults de supabase_admin continuam em public/GraphQL/GraphQL Public e defaults de postgres continuam em Storage.

A remoção dos grants atuais em tabelas public do laboratório não elimina esses defaults de outros owners/schemas.

Buckets de produção:
- `chat-images`: público, 168 objetos;
- `profile-images`: público, 20 objetos.
Ambos têm limite de 20 MiB. Não há policies próprias em `storage.objects`.

## 9. Migrations e isolamento do laboratório

- Produção: 7 migrations registradas.
- Laboratório: 39 migrations.
- Branch Supabase `main` de produção: `MIGRATIONS_FAILED`; preview: `ACTIVE_HEALTHY`.
- Os quatro SQLs originais abaixo retornam 404 em master e QA:
  1. `20261023154754_create_upstatus_visual_config.sql`
  2. `20261026195855_add_chat_message_file_name.sql`
  3. `20261027154329_allow_chat_document_mime_types.sql`
  4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

O laboratório contém tabela de rate limit de setup-invite e RPC com RLS, SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role. Produção não contém a tabela, a RPC nem as quatro colunas `setup_token_*`.

Contagens no laboratório: users 0; messages 0; chat_reads 0; sessions 0; signal rooms 0; room members 0; signal events 0; call attempts 0; voice attempts 0; invite-rate-limit rows 0; realtime.messages 0; Storage buckets 0; Storage objects 0.

O projeto é um laboratório isolado útil para regressões de autenticação/sinalização, mas não é Full-Product TEST e não permite validar integração completa de chat, mídia e Storage com dados de produto.

## 10. Logs HTTP 402: correção da contagem anterior

Consulta correta por `response.status_code` e `request.pathname`, na janela 2026-11-14 19:30 UTC a 2026-11-15 19:30 UTC:
- 2 respostas HTTP 402 em produção, ambas GET de download:
  - Team Lite `/functions/v1/upstatus-team-lite/upstatus-team-lite.user.js`, 2026-11-14 20:55:03 UTC;
  - Normal `/functions/v1/upstatus/upstatus.user.js`, 2026-11-14 20:57:39 UTC.
- Laboratório: nenhum log de invocação Edge na mesma janela.

A contagem anterior de 64 HTTP 402 não é sustentada por esta projeção correta. O histórico do run push [43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) registra `exceed_edge_functions_invocations_quota`, mas isso não prova que a quota continua excedida agora. Zero logs no laboratório também não prova recuperação; significa que não houve tráfego Edge observável no recorte.

## 11. Issues e testes manuais

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados. Incluem reconexão Normal e Team Lite sem F5, reentrada em sala, iniciar/receber chamadas, ausência de peers/áudio/polling duplicados, interoperabilidade e teste manual no navegador.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados.

Nenhum teste manual foi executado nesta execução. Há Chromium no ambiente, mas não há checkout local, perfil Tampermonkey autenticado, sessão Sale Smartly nem dispositivos reais de áudio/tela disponíveis. Não se declara teste físico concluído.

## 12. Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | Tópicos públicos e divergentes; triggers private=false |
| TEST-ISOLATION | blocked | Laboratório isolado, mas sem fixtures/dados Full-Product |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs ausentes; branch main MIGRATIONS_FAILED |
| AUTH-03 | blocked | Produção sem setup-token/rate-limit; handlers instalados aceitam setup legado |
| ACL-STORAGE | blocked | Grants/default ACL amplos; buckets públicos e sem policies próprias |
| RECONNECT | pending | Issue #78 sem testes físicos |
| HUMAN-REVIEW | pending | PRs Draft, sem reviews; nenhuma autorização humana de release |

## 13. Próximas ações técnicas

1. Corrigir o build master para respeitar `release.json.scriptUrl` e alinhar distribuição/API.
2. Na #161, coordenar bump de versão, artefato, updater e guard de release; incluir `Retry-After` no 429.
3. Corrigir workflows Team Lite e TEST: manifesto correto, slug correto, projeto esperado fixado e CLI versionada.
4. Tornar Realtime privado/autenticado por padrão nos dois produtos e alinhar os tópicos dos triggers/clientes.
5. Aplicar AUTH-03 nos runtimes Normal e Team Lite com migração revisada e rollout coordenado.
6. Revisar RLS, grants, default ACL, SECURITY DEFINER e Storage; reduzir privilégios de cliente e remover defaults desnecessários.
7. Recuperar os quatro SQLs originais e resolver `MIGRATIONS_FAILED`.
8. Provisionar Full-Product TEST com fixtures controladas.
9. Executar testes físicos Normal/Team Lite sem F5 e obter aprovação humana antes de qualquer release.

**Conclusão:** NOT READY. CI candidato positivo não substitui a integração dos artefatos, a migração, o transporte privado nem a aceitação física. Nenhuma alteração de produção foi feita; todas as consultas SQL desta execução foram SELECT-only.
