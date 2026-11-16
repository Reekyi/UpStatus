# Auditoria independente UpStatus — 2026-11-16 04:35 UTC

## Veredito

**NOT READY.** A produção continua com Realtime público, primeiro acesso sem convite obrigatório, grants amplos e workflows de publicação sem proteção suficiente. Os candidatos automatizados avançaram, mas não existe uma candidata integrada e aprovada por revisão humana.

Esta auditoria é uma revalidação read-only de GitHub e Supabase. A única escrita desta execução é este relatório novo na branch QA.

## 1. Método e limites

- Lido `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`.
- O último checkpoint vivo dentro desse documento é **2026-11-15 06:30 UTC**; o documento-base está desatualizado para esta execução.
- Conferidos heads, ancestry, arquivos alterados, PRs, reviews, workflows e logs de CI existentes.
- Consultas Supabase foram SELECT/catalog-only.
- Não foram executados workflows, testes locais, uploads reais, testes de navegador, Tampermonkey, microfone ou captura de tela.
- CI citado abaixo é resultado já existente no HEAD indicado; não é execução manual desta auditoria.
- Não houve merge, deploy, migration, release, publicação de userscript, alteração de secret, flag, role, grant, policy, ACL ou fixture.

## 2. Heads e proteção de branches

| Ref | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `c9817d70b304e37d6abfdf4ba92c7c1bd5a9f924` |

- QA versus master: **357 commits à frente, 1 atrás, 200 arquivos alterados**. A lista dos 200 arquivos do PR #82 contém somente caminhos sob `docs/`; a branch QA continua documental, sem alterações de runtime nesta linha.
- A base comum do PR #82 é `a9288cc`, anterior ao HEAD atual de master. Não fiz rebase nem incorporei o commit concorrente de master.
- A API de branches do GitHub retornou `protected=false` para master, develop, team-lite-official e QA. Isso confirma ausência de proteção clássica nessas quatro branches. A API de rulesets da organização não estava acessível pelo conector, portanto regras organizacionais adicionais não foram verificadas.

**Risco de governança:** sem proteção clássica, não há barreira de branch que obrigue review/checks antes de alterações diretas. Recomenda-se exigir revisão humana e checks de PR nas branches oficiais e manter QA protegida contra alteração concorrente.

## 3. PRs, ancestry e CI

Todos os PRs abaixo continuam abertos e Draft. Não encontrei reviews submetidas nos PRs #74, #75, #76, #82, #161, #167, #168, #170 ou #174.

| PR | HEAD / base | CI observado | Estado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a0` / master | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) PASS; [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS | Draft; 887 commits à frente, 1 atrás, 90 arquivos |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b9` / team-lite-official | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico | Draft; 59 commits, 10 arquivos |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4` / team-lite-official | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) PASS | Draft; 386 commits à frente, 0 atrás, 57 arquivos |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `c9817d7` / master | [Validate 43799830619](https://github.com/Reekyi/UpStatus/actions/runs/43799830619) FAIL | Draft; 357 commits à frente, 1 atrás, 200 arquivos documentais |
| [#161 Normal](https://github.com/Reekyi/UpStatus/pull/161) | `557814d` / #74 | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) PASS; [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) PASS | Draft |
| [#167 Normal](https://github.com/Reekyi/UpStatus/pull/167) | `d25b3fb` / master | [Validate 43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392) PASS | Draft; sem Smoke |
| [#168 Retry-After](https://github.com/Reekyi/UpStatus/pull/168) | `c6de3eb` / #161 | [Validate 43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) PASS | Draft; sem Smoke |
| [#170 updater/chat](https://github.com/Reekyi/UpStatus/pull/170) | `693039e` / master | [Validate 43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686) FAIL | Draft |
| [#174 signed-upload backport](https://github.com/Reekyi/UpStatus/pull/174) | `277dd7b` / develop | [Validate 43802407509](https://github.com/Reekyi/UpStatus/actions/runs/43802407509) PASS | Draft; sem Smoke |

### Falhas reproduzidas nos logs de CI existentes

- **#82:** o log do run 43799830619 constrói `UpStatus 3.4.7 / TEST 3.4.7` e falha em `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`.
- **#170:** o log do run 43762594686 falha em `CHAT REGRESSION FAILED: files are staged instead of uploaded immediately`. O teste ainda espera upload imediato, enquanto a #167 usa anexos pendentes.

### Relação entre candidatas

- #76 está **327 commits à frente e 0 atrás** de #75; #76 é a continuação, não uma entrega independente para mesclar junto com #75.
- #161 é baseada na linha #74; #168 é baseada em #161.
- #167 é baseada diretamente em master e não contém as migrations AUTH-03 da linha #74/#161.
- #174 é um backport para develop; não é candidata de produção.

Não se deve fazer merge em lote. A linha Normal precisa de integração deliberada entre #74/#161 e #167/#168, preservando os contratos de anexos e o split de distribuição/API. A linha Team Lite deve continuar separada na #76.

## 4. Updater, workflows e distribuição

### Estado efetivamente implantado

- Normal: função de distribuição `upstatus` v480, userscript embutido 3.4.7.
- O userscript Normal tem `@updateURL` e `@downloadURL` em `/functions/v1/upstatus/upstatus.user.js`, mas `CLOUD_SERVER` aponta para `upstatus-screen-share-3-1-1-beta10` v6.
- Team Lite: função `upstatus-team-lite` v15, userscript embutido 3.4.30, API própria `upstatus-team-lite`.
- Portanto, Normal distribui pelo endpoint novo e usa a API beta10; essa separação precisa ser preservada explicitamente no build até que um cutover coordenado seja aprovado.

### Workflows atuais inspecionados

- Master `.github/workflows/deploy-production.yml`: manual-only, usa `SUPABASE_PROJECT_ID` genérico, fixa `release.json.version === 3.4.7`, instala Supabase CLI `latest` e publica o slug `upstatus`.
- Team Lite `.github/workflows/deploy-production.yml`: manual-only, usa o mesmo secret genérico, CLI `latest` e publica **`upstatus`**, não `upstatus-team-lite`. Não despachar esse workflow.
- Develop `.github/workflows/deploy-test.yml`: tem `workflow_dispatch` e gatilho `push` em develop, usa `SUPABASE_PROJECT_ID` genérico, CLI `latest` e publica `upstatus-test`. O valor do secret não foi inspecionado; sem allowlist explícita de project ref, o destino não está protegido por código.

### Correção de build

O build de master ainda define `updateUrl = cloud + "/upstatus.user.js"`, enquanto `release.json.scriptUrl` aponta para a função `upstatus`. O `cloud` de produção continua beta10. Isso reproduz a falha da #82.

A #167 separa `release.scriptUrl` (distribuição) de `CLOUD_SERVER` (API), que é o desenho correto para o estado atual. Ainda falta coordenar a nova versão estável: 3.4.7 não pode ser republicada com conteúdo diferente e o guard do workflow também precisa ser atualizado de forma revisada.

## 5. Correção importante sobre upload assinado

**Retificação de auditorias anteriores:** decodifiquei os userscripts embutidos nas funções implantadas. Normal 3.4.7 e Team Lite 3.4.30 **já contêm `uploadFileDirect`** e chamam `/api/chat/upload-url` e `/api/profile/avatar-upload-url`. A conclusão anterior de que os clientes instalados não tinham helper de upload assinado estava incorreta por falha na extração do BASE64.

Os servidores beta10 v6, upstatus v480 e Team Lite v15 também possuem `signedUploadRoute`, protegida pelo middleware de sessão customizada. Porém, a validação implantada é mais fraca que a candidata:

- usa `Number.isFinite(size)`, não `Number.isSafeInteger(size)`;
- não valida no servidor a origem HTTPS, rota/bucket, caminho assinado, correspondência do token e URL pública;
- confia no MIME e tamanho declarados pelo cliente;
- não inspeciona magic bytes, não faz quarentena e não verifica conteúdo real.

A #167/#174 adiciona validação de origem/path/token e tamanho inteiro seguro. Os testes de cliente/servidor usam Node VM, fetch e Storage mockados. São regressões offline úteis, mas não comprovam upload real no Storage.

Os buckets atuais continuam públicos; upload assinado não torna o download privado.

## 6. AUTH-03 e autorização

### Produção

- Cinco usuários; zero sem hash de senha e zero sem papel no snapshot.
- A tabela `users` não tem colunas `setup_token_*`.
- Não existem a tabela de rate limit nem as RPCs de convite/rate limit.
- O endpoint `POST /api/setup` continua sem token de convite: se uma conta existente ainda não tiver senha, o primeiro setup pode ser reivindicado sem convite.
- O fallback de papel ainda atribui `implementation_admin` por nome (Ricardo, Lohan e Guilherme) quando o papel está vazio.
- A limpeza global do chat ainda autoriza por `name === "Ricardo"`, sem conferir o papel persistido.
- Política de senha divergente: Normal exige 6 caracteres; Team Lite exige 4.

### Candidatas/laboratório

- #76 contém migrations para hash de convite único, expiração, consumo atômico, normalização de papel e rate limit distribuído.
- #161 adiciona a migration `20261109230000_setup_invite_rate_limit.sql`; o mesmo arquivo está presente na linha #76.
- As RPCs do laboratório `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` são SECURITY INVOKER, `search_path=""`, EXECUTE apenas para service_role.
- #167 muda a limpeza do chat para exigir o nome responsável e o papel persistido `implementation_admin`.

As candidatas passaram nos respectivos checks offline, mas AUTH-03 não foi implantado em produção.

## 7. Realtime

### Produção

- `realtime.messages`: RLS=true, FORCE RLS=false, zero policies próprias e seis grants diretos para anon/authenticated (SELECT, INSERT, UPDATE).
- 106 eventos consultados, todos `private=false`: 72 `user_status`, 26 `db_change`, 4 `remote_result`, 4 `remote_command`.
- Nenhum evento nas últimas 24 horas; o último evento observado foi em 2026-11-13 20:52 UTC.
- Clientes Normal e Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`; os triggers publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- `upstatus_broadcast_messages` é SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role e envia `to_jsonb(OLD/NEW)` completo por `realtime.send(..., false)`.
- Os triggers de remote state e status também publicam em canais públicos.

### Candidata #74

As migrations candidatas reduzem o broadcast de mensagens/status para um aviso mínimo (`op`) e fixam `search_path=""` nas funções de trigger. Isso reduz exposição, mas ainda chama `realtime.send(..., false)`. **RT-01 continua bloqueado:** aviso público minimizado não é Realtime privado/autorizado.

A função isolada `upstatus-signal-test` v32 no laboratório não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`; contém `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`. O contrato HTTP 409 candidato ainda não foi validado em uma função implantada por chamada HTTP real.

## 8. RLS, grants, SECURITY DEFINER e Storage

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Tabelas public com RLS e sem policies | 10 | 18 |
| Grants diretos anon/auth em public | 126 | 0 |
| Entradas de grant TRUNCATE em public | 18 | 0 |
| Privilégios de cliente expandidos em default ACLs | 120 | 96 |
| Funções SECURITY DEFINER de broadcast | 3 | 3 |

- Produção: as três funções de broadcast têm `search_path=public` e EXECUTE para anon/authenticated/service_role. Os grants são desnecessários para funções trigger-only e devem ser revistos com a migration de segurança.
- Laboratório: as funções correspondentes têm `search_path=""` e EXECUTE restrito a service_role. As tabelas public com RLS sem policy não têm grants diretos de cliente.
- `storage.objects`: RLS=true, FORCE=false, zero policies próprias e oito grants anon/authenticated (SELECT, INSERT, UPDATE, DELETE).
- Buckets de produção: `chat-images` público com 168 objetos e `profile-images` público com 20 objetos; ambos com limite de 20 MiB.
- O laboratório não possui buckets/objetos de produto. Zero WARN no Security Advisor não significa ausência de defaults/grants residuais; há 96 privilégios de cliente expandidos em default ACLs.

RLS sem policy restringe acesso por linha para papéis sujeitos a RLS, mas não neutraliza TRUNCATE. Buckets públicos permitem leitura pública dos objetos independentemente da intenção de usar upload assinado.

## 9. Edge Functions, migrations e ambiente de teste

- A organização tem somente dois projetos: produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`. Não existe terceiro projeto Full-Product TEST.
- Produção: 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. A lista inclui funções antigas beta, backup e test dentro do próprio projeto de produção, além de `upstatus` v480, `upstatus-test` v281, beta10 v6 e Team Lite v15. `verify_jwt=false` não prova acesso anônimo por si só, pois os handlers usam token customizado; cada função legado precisa de revisão de autenticação e necessidade.
- Laboratório: duas funções ACTIVE (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3).
- Produção tem 7 migrations; laboratório 39. A branch gerenciada `main` da produção continua `MIGRATIONS_FAILED`, enquanto o preview está `ACTIVE_HEALTHY`.
- Os quatro SQLs originais abaixo continuam 404 em master:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- O laboratório não tem usuários, mensagens, salas, memberships, sessões, eventos ou objetos Storage suficientes para validar o produto integrado.

Os logs consultados nas últimas 24 horas retornaram apenas fontes PgBouncer/PostgreSQL, sem amostra Edge suficiente. Não calculei HTTP 402 nem declarei recuperação de disponibilidade. A tabela de mensagens tem 302 linhas; a mais recente é de 2026-11-12 20:16 UTC, sem novas mensagens nas últimas 24 horas. Isso indica ausência de evidência recente de uso, não prova de indisponibilidade.

## 10. Aceitação manual

[Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta com 0/8 critérios físicos marcados.

Pendentes:
- reconexão Normal e Team Lite sem F5 após queda real de rede;
- reentrada em sala e novas chamadas após reconexão;
- áudio bidirecional e microfone reais;
- captura real de tela/aba;
- ausência de peers, áudio ou polling órfãos;
- interoperabilidade instalada Normal ↔ Team Lite.

Não havia perfil Tampermonkey/Sale Smartly autenticado nem dispositivos reais nesta execução. Nenhum teste manual foi executado.

## 11. Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 106 eventos públicos; triggers usam private=false; [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) |
| TEST-ISOLATION | blocked | só dois projetos; laboratório sem fixtures de produto; [projetos Supabase](https://supabase.com/dashboard/org) |
| MIGRATION-PROVENANCE | blocked | quatro SQLs 404; produção MIGRATIONS_FAILED; [PR #74](https://github.com/Reekyi/UpStatus/pull/74) |
| AUTH-03 | blocked | runtime sem convite; migrations apenas candidatas; [PR #161](https://github.com/Reekyi/UpStatus/pull/161) |
| ACL-STORAGE | blocked | grants/ACL e buckets públicos; [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) |
| RECONNECT | pending | Issue #78 continua 0/8; [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) |
| HUMAN-REVIEW | pending | PRs Draft sem reviews; [PR #74](https://github.com/Reekyi/UpStatus/pull/74) |

## 12. Próximos passos recomendados

1. Proteger master, develop e team-lite-official com review obrigatória e checks; revisar regras de organização quando a API estiver disponível.
2. Integrar #74/#161 com #167/#168 em uma candidata Normal única, preservando `release.json.scriptUrl` separado de `CLOUD_SERVER`, bump de versão e guard coerente; exigir Validate + Smoke.
3. Corrigir o workflow Team Lite para publicar `upstatus-team-lite`, fixar CLI, validar projeto/SHA e impedir deploy cruzado. Substituir project ID genérico por allowlist explícita.
4. Integrar AUTH-03 nos dois produtos e planejar migration/rollout de produção somente após revisão e autorização explícita.
5. Tornar Realtime privado/autorizado por padrão; payload mínimo público é melhoria, não conclusão de RT-01.
6. Endurecer servidor de upload, decidir Storage privado, inspecionar conteúdo real/quarentena e alinhar limites.
7. Recuperar os quatro SQLs originais, diagnosticar `MIGRATIONS_FAILED` e provisionar Full-Product TEST independente.
8. Executar os oito critérios físicos da #78 e obter revisão humana antes de qualquer release.

**Conclusão:** os clientes já avançaram no upload assinado e as candidatas contêm boas correções de autenticação, rate limit e minimização de broadcasts. O bloqueio agora é integrar e validar essas mudanças, corrigir workflows e governança, e reduzir a distância entre o código candidato e os runtimes implantados.

Nenhuma alteração em produção ou laboratório foi feita. Todas as consultas SQL foram SELECT-only. Esta auditoria não autoriza merge, deploy, migration, release ou publicação.
