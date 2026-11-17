# Auditoria independente QA — 2026-11-13 22:42 UTC

## Escopo e método

Revalidação read-only de GitHub `Reekyi/UpStatus` e Supabase produção `dlfvkawaiqduhlazsszm`, com comparação do laboratório `bfpjtfqlnypisxljoxkb`. Foram consultados heads, PRs, workflows, logs, issues, fontes candidatas, Edge Functions implantadas, migrations, catálogos PostgreSQL, grants, Default ACLs, funções SECURITY DEFINER, Realtime e Storage.

A única escrita desta execução é este relatório novo na branch QA dedicada. Nenhum código de produto, workflow, migration, secret, flag, role, grant, policy, bucket ou fixture foi alterado. Não houve merge, deploy, release, publicação de userscript nem teste físico.

## Resumo executivo

- A PR #164 avançou para o HEAD `3b125a83d5af0b22e26e4e1f8663752dc5d4dbfa`. O Validate passou no SHA exato, run [43516173051](https://github.com/Reekyi/UpStatus/actions/runs/43516173051). A candidata agora solicita URL assinada com `upsert:false` e o cliente não envia `x-upsert:true`. Isso fecha a sobrescrita de objetos existentes pelo caminho candidato, mas não valida os bytes realmente enviados nem vincula o objeto ao usuário proprietário.
- Produção continua diferente: Normal v480, Team Lite v15 e TEST v281 ainda permitem upload assinado de avatar até 20 MiB e usam `upsert:true`. A #164 está baseada em `develop`, não foi integrada às linhas Normal/Team Lite e não foi implantada.
- A produção continua sem setup-invite: nenhuma coluna de setup token nem RPC de consumo existe. Os handlers amostrados não têm rate limit de tentativas de login. Normal exige seis caracteres no login; Team Lite e TEST exigem quatro.
- Realtime permanece público: 106 mensagens observadas nos últimos 14 dias, todas `private=false`, no tópico legado dos triggers. `realtime.messages` tem RLS sem FORCE, nenhuma policy e grants SELECT/INSERT/UPDATE para anon/authenticated.
- A cadeia oficial Team Lite continua apontando o deploy para a função Normal `upstatus`. O deploy Normal candidato fixa o projeto e a CLI, mas mantém o pin rígido da versão 3.4.7 enquanto o build exige incremento para sincronizar um novo artefato.
- Recomendação: **NOT READY**.

## Heads e integridade das referências

| Referência | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `aabbdc7ec693281b1525f77b3983fe6f53c9e6b7` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 | `aabbdc7ec693281b1525f77b3983fe6f53c9e6b7` |
| PR #161 | `557814dc31bed779b84a2094358dc6b2a7e67689` |
| PR #163 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` |
| PR #164 | `3b125a83d5af0b22e26e4e1f8663752dc5d4dbfa` |

QA e PR #82 apontam para o mesmo HEAD. A comparação QA vs master informa 290 commits à frente e 1 atrás. Não fiz rebase nem incorporei o commit exclusivo de master. Master e team-lite-official retornam `protected=false`; a proteção da branch QA não foi confirmada nesta consulta.

Li integralmente `docs/RELEASE_READINESS.md` na branch QA: 8.410 linhas e 1.045.105 caracteres. O último checkpoint técnico do arquivo é de 2026-11-08 às 18:30 UTC; portanto o documento não substitui esta revalidação dos heads e runtimes atuais. O arquivo original foi preservado.

## PRs e CI

| PR | Estado | Evidência no HEAD consultado | Classificação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | Open / Draft | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200), ambos no SHA `dcaf6a0` | PASS automatizado |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | Open / Draft | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), no SHA `7bbf9b9` | PASS histórico; não é a linha Team Lite ativa |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | Open / Draft | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881), no SHA `83a6cc4` | PASS automatizado |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | Open / Draft | [Validate 43512667170](https://github.com/Reekyi/UpStatus/actions/runs/43512667170), no SHA `aabbdc7` | FAIL |
| [#161 Normal](https://github.com/Reekyi/UpStatus/pull/161) | Open / Draft | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445), no SHA `557814d` | PASS automatizado |
| [#163 Voz](https://github.com/Reekyi/UpStatus/pull/163) | Open / Draft | [Validate 43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) e [Voice Contract 43488822237](https://github.com/Reekyi/UpStatus/actions/runs/43488822237), no SHA `00f357b` | PASS de contrato offline |
| [#164 Upload](https://github.com/Reekyi/UpStatus/pull/164) | Open / Draft | [Validate 43516173051](https://github.com/Reekyi/UpStatus/actions/runs/43516173051), no SHA `3b125a8` | PASS automatizado com mocks |

Detalhes de cobertura:

- #74: 19/19 verificações não autenticadas e 136/136 autenticadas. O Smoke executou Chromium/WebRTC, entregou tracks remotas de áudio e vídeo, mesh de três participantes, teardown e rate limit de sinalização. O passo de rate limit distribuído de emissão de setup-invite ficou **SKIPPED** nesta execução; consumo atômico de convite passou.
- #76: 16/16 não autenticadas, 11/11 contratos HTTP isolados e 110/110 autenticadas. Inclui Chromium com stubs de Tampermonkey, WebRTC de chamada/voz/tela, mesh, rate limit e consumo de convite. Não equivale a instalação física no Tampermonkey com permissões reais.
- #161: 19/19 não autenticadas e 136/136 autenticadas. Diferentemente do Smoke da #74, o passo de rate limit distribuído de emissão de setup-invite passou.
- #163: o contrato mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409, mas o teste constrói respostas localmente. Não executa chamada HTTP contra a Edge Function implantada.
- #164: o Validate executou testes VM/mocks de cliente e servidor e terminou em `Validation OK: PROD 3.0.40 / TEST 3.0.40-beta.22`. O run é do SHA exato `3b125a8`. Não houve upload real ao Storage.

As PRs #74, #75, #76, #82 e #164 não possuem reviews registradas. Nenhuma aprovação humana foi observada.

### Falha da QA #82

O log do run [43512667170](https://github.com/Reekyi/UpStatus/actions/runs/43512667170) termina em:

`VALIDATION FAILED: production updateURL mismatch`

O workflow fez checkout do mesmo SHA atual da branch QA. Não removi assertions nem executei rerun. A validação é herdada do contrato de build/artefato da branch base.

## PR #164 — upload assinado e risco residual

O novo HEAD usa:

- limite declarado de 2 MiB para avatar e 20 MiB para chat;
- validação de `Number.isSafeInteger(p.size)`;
- allowlist de MIME declarada;
- URL assinada com `createSignedUploadUrl(path,{upsert:false})`;
- cliente sem cabeçalho `x-upsert:true`.

O teste de servidor verifica a opção `upsert:false`; o teste de cliente verifica rota, bucket, MIME/tamanho declarados, origem, caminho, token e PUT.

Limitações ainda abertas por inspeção de código:

1. `signedUploadRoute` confia em `p.size` e `p.mime` enviados pelo cliente. O PUT dos bytes vai diretamente ao Storage; a Edge Function não inspeciona os bytes recebidos nem compara o tamanho real.
2. `profileRoute` valida origem, bucket e formato do caminho, mas não comprova que o objeto pertence à identidade autenticada nem vincula o caminho a `users.id`. Um usuário autenticado pode referenciar um caminho de avatar de outro objeto do bucket se souber a URL.
3. A resposta da rota informa validade de 7.200 segundos. Recomenda-se reduzir a janela e limitar o token ao fluxo de upload pendente.
4. Os buckets de produção continuam públicos, então a validação posterior ao upload não elimina a janela de exposição.

A correção `upsert:false` é real e passou no CI, mas resolve somente sobrescrita. Recomenda-se upload para bucket privado de quarentena ou endpoint server-mediated, inspeção de magic bytes/tamanho real, vínculo do objeto ao usuário e publicação somente após validação. Não foi realizada exploração.

## Produção — Edge Functions e autenticação

Inventário read-only:

| Função | Versão | `verify_jwt` |
|---|---:|---|
| `upstatus` | v480 | false |
| `upstatus-team-lite` | v15 | false |
| `upstatus-test` | v281 | false |
| `upstatus-screen-share-3-1-1-beta10` | v6 | false |

Há 38/38 Edge Functions ACTIVE e 12 com prefixo `upstatus-test`; todas retornam `verify_jwt=false`. Isso não prova que todas sejam anônimas: os handlers primários amostrados usam autenticação própria por `x-upstatus-token`, hash SHA-256, consulta de sessão e expiração. Não foi feita auditoria rota a rota de todas as 38 funções.

Nos handlers Normal, Team Lite e TEST inspecionados:

- primeiro acesso não exige setup token/convite;
- não foi encontrado rate limit de tentativas de login;
- fallback de role administrativa por nome continua quando a role está vazia;
- Normal exige senha mínima de seis caracteres no login; Team Lite e TEST exigem quatro;
- sessões e perfis usam `user_name`, sem `user_id`.

A tabela `users` tem cinco usuários, zero hashes de senha vazios, zero roles vazias e cinco nomes distintos. Porém, não há constraint UNIQUE para `users.name`. A coluna `users.id` existe, mas `upstatus_sessions` e `upstatus_profiles` não possuem `user_id`. Não há colunas de setup-invite nem RPC `consume_upstatus_setup_invite` em produção.

## Realtime, RLS, grants e SECURITY DEFINER

### Realtime

SELECT read-only em `realtime.messages` encontrou 106 mensagens nos últimos 14 dias, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:

| Evento | Quantidade |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_command | 4 |
| remote_result | 4 |

`realtime.messages` tem RLS habilitado, FORCE RLS desabilitado, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated. A função trigger de mensagens envia o registro completo via `to_jsonb(OLD/NEW)` em broadcast público.

O validator de master exige que o userscript instalado assine `upstatus-screen-share-live-3-1-1-beta10`, enquanto os triggers observados publicam em `upstatus-live-6f5e7b31-...`. A divergência de tópico permanece. Não foi testada entrega externa nem explorado o canal.

### Tabelas, grants e Default ACL

- 10 tabelas public têm RLS sem policies.
- Nove tabelas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER. A décima (`upstatus_visual_config`) não aparece nesse conjunto.
- RLS sem policies impede acesso por linha, mas não substitui a remoção de grants desnecessários; TRUNCATE não é controlado por RLS.
- Default ACLs de postgres em public continuam amplas para anon/authenticated em sequences, functions e tables: 6 entradas de sequence, 2 de function e 16 de table por papel, com privilégios amplos.
- Security Advisor de produção: 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated.

### SECURITY DEFINER

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, configuram `search_path=public` e concedem EXECUTE a anon/authenticated. Todas retornam `trigger`; portanto, não são funções RPC comuns invocáveis diretamente via PostgREST. O grant amplo continua desnecessário e o search_path deve ser endurecido. O laboratório tem versões equivalentes com search_path vazio e sem EXECUTE para papéis clientes; seu Security Advisor não apresentou WARNs.

## Storage

| Bucket | Público | Limite | Objetos |
|---|---|---:|---:|
| chat-images | Sim | 20 MiB | 168 |
| profile-images | Sim | 20 MiB | 20 |

Não há policies próprias em `storage.objects`. Os limites implantados continuam divergentes da configuração versionada. A candidata #164 ainda não foi portada para Normal/Team Lite nem implantada.

## TEST, migrations e branches gerenciadas

Existem somente dois projetos Supabase:

- produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY;
- laboratório signaling/auth `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, sem buckets Storage.

Não existe Full-Product TEST independente. Produção possui 7 migrations no ledger; laboratório possui 39. `master/supabase/migrations` contém apenas três arquivos. Permanecem ausentes as fontes locais correspondentes a:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A branch gerenciada Supabase `main` aponta para Git master e está `MIGRATIONS_FAILED`; o preview está ACTIVE_HEALTHY. Não reconstruir SQLs ausentes a partir do schema atual.

## Workflows de publicação

### Normal

O workflow candidato Normal fixa Supabase CLI 2.122.1, exige execução a partir de master, confere SHA do checkout e projeto `dlfvkawaiqduhlazsszm`. Porém, `release.json` continua em 3.4.7 e o workflow exige exatamente 3.4.7. O build guard impede sincronizar uma nova versão sem incremento. O processo precisa reconciliar o version bump com a autorização de release antes de qualquer despacho.

### Team Lite

O workflow em `team-lite-official` ainda executa `supabase functions deploy upstatus`, usa CLI `latest` e não verifica projeto/SHA com a mesma rigidez do Normal. O destino correto é `upstatus-team-lite`. Não despachar o workflow oficial atual.

## Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios marcados. Reconexão Normal/Team Lite sem F5, microfone real, permissões reais de tela e teste manual continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16/35 itens marcados.
- Não foi realizado teste manual nesta execução. CI Chromium com stubs não substitui Tampermonkey instalado, permissões reais ou teste físico de rede.

## Gates atualizados

| Gate | Estado | Evidência desta rodada |
|---|---|---|
| RT-01 | BLOCKED | 106 broadcasts private=false; zero policies e grants clientes em realtime.messages |
| TEST-ISOLATION | BLOCKED | Apenas produção e laboratório signaling/auth; nenhum Full-Product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Ledger produção 7, apenas 3 SQLs locais; quatro fontes ausentes |
| AUTH-03 | BLOCKED | Sem setup-token columns/RPC; sem rate limit de login nos handlers amostrados |
| ACL-STORAGE | BLOCKED | Grants amplos, Default ACLs, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8; nenhum teste físico sem F5 nesta rodada |
| HUMAN-REVIEW | PENDING | PRs principais sem reviews; nenhuma autorização humana de release |

## Veredito

**NOT READY.** O novo HEAD #164 passou Validate e impede sobrescrita de objetos, mas ainda confia nos metadados do cliente e não comprova ownership. Produção permanece com o contrato antigo. Realtime, AUTH-03, ACL/Storage, Full-Product TEST, proveniência das migrations, publicação Team Lite e aceitação física continuam bloqueando release.

Todas as consultas SQL desta auditoria foram SELECT-only. Nenhuma produção foi modificada; nenhum deploy, merge, migration, release, publicação de userscript, alteração de secrets/flags ou teste físico foi realizado.
