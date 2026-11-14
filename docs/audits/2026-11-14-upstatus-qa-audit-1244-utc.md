# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-14T12:44:45.040Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## Escopo e método

Revalidei os heads reais, as PRs obrigatórias #74, #75, #76 e #82, as issues #78 e #79, workflows, logs de CI, candidatos relacionados de Engenharia e os catálogos dos dois projetos Supabase. Decodifiquei os userscripts embutidos nas Edge Functions implantadas para comparar o que está instalado com os candidatos do GitHub.

Li integralmente `docs/RELEASE_READINESS.md` na branch QA: 8.410 linhas, 1.045.105 caracteres, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint interno do documento é de **08/11/2026 15:30 BRT**; os relatórios de 14/11 estão em arquivos separados.

A execução foi de inspeção. Todas as consultas SQL foram SELECT-only. Não houve execução manual de testes no navegador, alteração de fixtures, exploração de broadcasts, escrita em produção, merge, deploy, migration, release ou publicação de userscript. Não havia checkout local para executar uma suíte nova; resultados de testes abaixo são exclusivamente CI já existente.

## Heads e governança

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA / #82 | `07afab5d64588bf50a0fffa27e5337b1038def1e` |

As branches `master`, QA e `team-lite-official` estão sem proteção de branch. A QA está **306 commits à frente e 1 atrás de master**.

| PR | HEAD | Relação com a base | Estado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 à frente, 1 atrás de master | Aberta, Draft |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 à frente, 0 atrás | Aberta, Draft |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | 386 à frente, 0 atrás | Aberta, Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `07afab5d64588bf50a0fffa27e5337b1038def1e` | 306 à frente, 1 atrás | Aberta, Draft |

A #82 contém 160 arquivos, todos sob `docs/`. As PRs obrigatórias #74, #75, #76 e #82 não têm reviews humanas registradas. A #75 é baseline histórica; #76 é o candidato Team Lite mais avançado e não deve ser tratado como uma segunda entrega independente da #75.

## CI: resultados observados

| PR / execução | Resultado | Classificação |
|---|---|---|
| [#74 Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | PASS | CI no HEAD consultado |
| [#74 Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS | CI isolado; passo de rate limit distribuído de emissão de convite foi SKIPPED |
| [#75 Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS | CI histórico/baseline |
| [#76 Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS | CI completo; Playwright, integração isolada, voz/tela, rate limits e convite único |
| [#82 Validate 43592032287](https://github.com/Reekyi/UpStatus/actions/runs/43592032287) | FAIL | `production updateURL mismatch` no HEAD exato `07afab5d` |
| [#158 Validate 43363857861](https://github.com/Reekyi/UpStatus/actions/runs/43363857861) | FAIL | Regressão de chat: arquivos ficam staged em vez de serem enviados imediatamente |
| [#89](https://github.com/Reekyi/UpStatus/pull/89) / 42840853509 | PASS | CI de candidato AUTH-03/cutover; não aplicado à produção |
| [#133](https://github.com/Reekyi/UpStatus/pull/133) / 42804903827 e 42804903887 | PASS | Validate + Smoke no SHA candidato; branch está 4 commits atrás da base #74 |
| [#149](https://github.com/Reekyi/UpStatus/pull/149) / 43173176077 e 43173176232 | PASS | Guard + Candidate Checks; branch está 2 commits atrás da base #76 |
| [#157](https://github.com/Reekyi/UpStatus/pull/157) / 43333849082 | PASS | CI de ownership de avatar Team Lite |
| [#161](https://github.com/Reekyi/UpStatus/pull/161) / 43479685384 e 43479685445 | PASS | Validate + Smoke |
| [#163](https://github.com/Reekyi/UpStatus/pull/163) / 43488822143 e 43488822237 | PASS | Validate + contrato offline HTTP 409 |
| [#164](https://github.com/Reekyi/UpStatus/pull/164) / 43544570609 | PASS | Validate de upload/avatar Normal |

### Causa do Validate da QA

Em master, `scripts/build.mjs` ainda deriva o endpoint de atualização do endpoint beta10, enquanto `scripts/validate.mjs` exige `/upstatus/upstatus.user.js`. O Validate da #82 falha por essa divergência herdada.

A #158 separa o endpoint de API do updateURL e lê `release.json.scriptUrl`, mas sua regressão de chat falha. A #133 também alinha o destino da API Normal ao endpoint `upstatus` e move a proveniência de chamada para fora do payload; entretanto, está 4 commits atrás da base #74 e precisa ser reconciliada antes de ser considerada integrável.

### Sinalização e proveniência nos candidatos

- #74/#76 transformam `remote_command` em aviso para consulta autenticada, mas ainda usam `_authenticatedTransport` dentro do payload de chamada. Esse marcador pode ser forjado por um emissor público.
- #133 (Normal) e #149 (Team Lite) corrigem esse limite passando a proveniência fora do payload: polling autenticado chama `receiveCallSignal(payload, true)`; broadcast público chama com `false`. Os guards aceitam apenas presença/fim como dicas públicas quando o transporte autenticado está habilitado.
- Nas duas linhas, `signalTransportFlag` continua **false por padrão** e o endpoint começa vazio. Com a flag desligada, o fallback público permanece ativo. Portanto, os candidatos não comprovam um cutover seguro por padrão.
- #149 está 2 commits atrás da base #76; #133 está 4 commits atrás da base #74.
- #146 melhora o uso de broadcasts como wake-up hints para comandos remotos, mas é uma candidata separada e não substitui a correção de proveniência de call-signal.
- O helper de laboratório `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`, que o contrato candidato #163 espera. O contrato HTTP real ainda não foi demonstrado no helper implantado.

## O que está instalado

Inventário read-only das Edge Functions:

- Produção: **38 funções ACTIVE**, todas reportando `verify_jwt=false` no nível da plataforma.
- Funções principais: `upstatus` v480, `upstatus-test` v281, `upstatus-screen-share-3-1-1-beta10` v6 e `upstatus-team-lite` v15.
- Também permanecem várias funções antigas `upstatus-test-*` e `upstatus-backup-*` ACTIVE no projeto de produção.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Não existe função `upstatus-signal` implantada em produção.

`verify_jwt=false` desativa a verificação JWT da plataforma; os handlers principais possuem autenticação própria por token. Isso não prova, sozinho, que todas as rotas sejam públicas. As funções antigas de teste/backup precisam de inventário de rotas e autorização, pois aumentam a superfície operacional.

Os bundles embutidos foram decodificados diretamente das funções implantadas:

| Produto | Userscript | API |
|---|---|---|
| Normal | 3.4.7 | beta10 v6 |
| Team Lite | 3.4.30 | Team Lite v15 |

Ambos os bundles instalados usam o tópico `upstatus-screen-share-live-3-1-1-beta10`, criam canais sem `private:true` e não chamam `realtime.setAuth()`. O Normal processa `remote_command` chamando a rotina local de execução; Team Lite verifica a sessão local antes do processamento, mas nenhum dos dois comprova criptograficamente a identidade do publicador. Os listeners de call-signal, voz e tela também permanecem no transporte Realtime legado.

## Realtime, RLS, grants e SECURITY DEFINER

### Realtime

Em produção, nos últimos 14 dias, foram observados 106 registros em `realtime.messages`, todos `private=false`:

| Tópico dos triggers | Evento | Registros |
|---|---|---:|
| `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` | user_status | 72 |
| mesmo tópico | db_change | 26 |
| mesmo tópico | remote_result | 4 |
| mesmo tópico | remote_command | 4 |

O tópico dos triggers **não coincide** com o tópico assinado pelos clientes. Logo, os 106 registros não demonstram entrega aos userscripts atuais.

A tabela `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado, zero policies e sete partições diretas. `anon` e `authenticated` têm SELECT, INSERT e UPDATE efetivos.

Os triggers consultados confirmam:
- `upstatus_broadcast_messages` publica `to_jsonb(OLD/NEW)` completo como `db_change`.
- `upstatus_broadcast_remote_state` publica os campos de comando/resultado como `remote_command` e `remote_result`.
- `upstatus_broadcast_users` publica nome, status, motivo, atualização e sync como `user_status`.
- Os três usam `private=false`.

A configuração pública e o caminho de exploração externa não foram testados. A conclusão é de exposição estrutural no desenho e nos dados observados, não de exploração reproduzida.

### PostgreSQL e ACL

- 10 tabelas públicas com RLS e sem policies.
- 126 linhas de grants diretos para anon/authenticated, sendo 72 privilégios de mutação, distribuídos por nove tabelas.
- 18 concessões TRUNCATE no conjunto de grants; RLS não protege TRUNCATE.
- 120 privilégios em Default ACLs para anon/authenticated: public 48, graphql 24, graphql_public 24 e storage 24.
- Três funções SECURITY DEFINER de broadcast, com `search_path=public`, retorno `trigger` e EXECUTE concedido a anon/authenticated.

O Security Advisor de produção reporta 6 WARN (três funções para anon e três para authenticated) e 10 INFO (RLS sem policies). O Advisor descreve as funções de trigger como RPC executáveis; não foi demonstrada invocação direta via PostgREST para funções cujo retorno é `trigger`. Os privilégios continuam desnecessários e devem ser revistos.

## Autenticação e identidade

Produção: cinco usuários, 319 sessões e cinco perfis; zero hashes de senha vazios, zero roles vazias e zero nomes duplicados na fotografia atual.

Ainda não existem:
- Colunas `setup_token_*` em `users`.
- RPC `consume_upstatus_setup_invite`.
- Tabela de rate limit de emissão de convite.
- Índice/constraint UNIQUE em `users.name`.

As sessões continuam vinculadas por nome, não por identidade imutável `users.id`. O candidato #89 passou CI para o fluxo de convite único e rate limit distribuído de emissão (cinco tentativas por administrador em 15 minutos, falha fechada), mas nada disso está aplicado em produção. Rate limit de convite não equivale a rate limit de tentativas de senha/login.

## Storage e avatar

Produção tem dois buckets públicos, ambos com limite de 20 MiB e zero policies próprias em `storage.objects`:

| Bucket | Objetos |
|---|---:|
| chat-images | 168 |
| profile-images | 20 |

A API beta10 v6 e Team Lite v15 aceitam URLs públicas de avatar sem validar ownership pelo `users.id`. Os uploads assinados legados confiam em MIME/tamanho declarados pelo cliente e usam `upsert:true`.

A #157 melhora ownership Team Lite por ID, mas continua no fluxo de upload assinado e não verifica os bytes reais antes do Storage. A #164 adiciona validação server-side para avatar Normal, limite de corpo, sniff de MIME, limite de 2 MiB e `upsert:false`; porém está baseada em develop, não foi portada ao Team Lite e seus testes usam harnesses/mocks, não upload real no Storage. Não há decoder de imagem confiável nem limite de dimensões/pixels. Anexos do chat continuam em upload assinado direto.

## Migrations e isolamento

- Produção: 7 migrations.
- Laboratório: 39 migrations.
- Quatro SQLs recuperados em `docs/migration-recovery/` coincidem exatamente, byte a byte, com os statements do ledger de produção:
  - `20261023154754_create_upstatus_visual_config`
  - `20261026195855_add_chat_message_file_name`
  - `20261027154329_allow_chat_document_mime_types`
  - `20261027155438_set_upstatus_upload_limits_20mb`

Isso recupera o texto executado, mas não os arquivos originais com histórico Git, comentários e proveniência. Os arquivos recuperados permanecem em documentação e não foram executados.

A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, com preview `ACTIVE_HEALTHY`.

Existem somente dois projetos. O laboratório tem zero usuários, sessões, perfis, buckets e objetos; não é Full-Product TEST. A função `upstatus-test` v281 e várias variantes antigas de teste permanecem no projeto de produção.

## Workflows

- O workflow candidato Normal #74 fixa CLI 2.122.1, checkout por SHA e valida projeto; deploya somente `upstatus`. A mudança do cliente Normal de beta10 para upstatus precisa ser coordenada com esse alvo.
- O workflow oficial Team Lite `.github/workflows/deploy-production.yml` publica **`upstatus`**, não `upstatus-team-lite`; usa CLI `latest`, segredo genérico de projeto e não valida SHA/projeto. **Não despachar.**
- O workflow oficial Team Lite de TEST também usa projeto genérico e CLI `latest`; o candidato #76 contém guards melhores, mas não substitui o workflow oficial.
- O builder de master e o validator continuam divergentes no updateURL; a #158 corrige essa parte, mas falha na regressão do chat.

## Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios marcados. Reconexão Normal/Team Lite sem F5, nova entrada/chamada, áudio sem duplicação e teste manual permanecem pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados.
- Nenhum teste manual foi realizado nesta execução. CI automatizado, inspeção estática e aceitação física permanecem categorias distintas.

## Gates e recomendação

| Gate | Estado | Evidência/razão |
|---|---|---|
| RT-01 | blocked | Clientes instalados ainda usam Realtime público; não há endpoint server-mediated em produção |
| TEST-ISOLATION | blocked | Laboratório sem Storage/fixtures de produto; Full-Product TEST não existe |
| MIGRATION-PROVENANCE | in_progress | Quatro statements exatos recuperados, arquivos originais ainda ausentes |
| AUTH-03 | in_progress | Candidato #89 passa CI, produção ainda sem schema/rotas de convite |
| ACL-STORAGE | blocked | RLS/grants/Default ACL/Storage ainda amplos |
| RECONNECT | pending | Issue #78 permanece 0/8; nenhum teste físico confirmado |
| HUMAN-REVIEW | pending | Sem reviews/aprovação explícita |

**Recomendação: NOT READY.** Não iniciar release, deploy ou publicação de userscript até resolver o transporte público, a divergência dos workflows, as permissões do banco/Storage, a integração Normal/Team Lite e a aceitação física.

## Segurança da execução

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs, alteração de fixtures ou operação destrutiva. A única escrita desta rodada é este novo relatório na branch QA, em caminho que não existia; o arquivo `docs/RELEASE_READINESS.md` foi lido e preservado.
