# Auditoria independente UpStatus — 2026-11-16 14:55 UTC

**Execução:** 2026-11-16T14:55:35.376Z  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, workflows, CI, código candidato/implantado, Edge logs, catálogo PostgreSQL, Security Advisor e migrations. Nenhum teste foi iniciado pela QA nesta execução; foram inspecionados resultados de CI existentes. Todas as consultas SQL foram SELECT-only.

## 1. Documento-base e heads reais

Li `docs/RELEASE_READINESS.md` na branch QA (blob `7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c`, 8.422 linhas). O snapshot-base termina na revalidação de 2026-11-15 06:30 UTC; a atualização mais recente antes desta execução está no relatório separado [2026-11-16 13:44 UTC](2026-11-16-upstatus-qa-audit-1344-utc.md). Mantive o documento-base intacto para não substituir um histórico grande/concurrente; este relatório é um novo arquivo.

| Ref | HEAD observado | Observação |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | release 3.4.7 |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | deploy TEST por push |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | runtime oficial 3.4.30 |
| QA `qa/release-readiness-2026-11-04-master` | `71968063ad4cf886d146983f21680a0cad069964` | igual ao HEAD da #82 |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` | aberta / Draft |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | aberta / Draft |
| PR #76 | `00a578e9174e08238a1289a35feb02d171625421` | aberta / Draft |
| PR #82 | `71968063ad4cf886d146983f21680a0cad069964` | aberta / Draft |

Comparações atuais: #74 está 887 commits à frente e 1 atrás de master; #75 está 59 à frente de team-lite-official; #76 está 389 à frente de team-lite-official e 330 à frente de #75, sem commits atrás; #82 está 369 à frente e 1 atrás de master. A #76 é descendente da #75. A #82 altera somente documentação em 208 arquivos. As quatro PRs seguem Draft e não têm reviews registradas.

## 2. PRs e CI nos HEADs exatos

| PR | Evidência | Classificação |
|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Signaling Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS no HEAD atual | **CI PASS**. Smoke: 19/19 checks não autenticados e 136/136 autenticados; Chromium negociou WebRTC de chamada, voz e tela, com entrega de mídia e teardown. Também passou concorrência de recibos de leitura, consumo atômico de convite e rate limit de sinalização (90 aceitas, 1 rejeitada com 429). A etapa de rate limit de emissão de convite foi **SKIPPED**. |
| #75 Team Lite | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS | **PASS histórico** no HEAD antigo; está contida na linha atual #76 e não substitui a evidência da candidata atual. |
| #76 Team Lite | [Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAILURE no HEAD atual | O job `signed-upload-contracts` passou. O job `candidate-checks` falhou na primeira chamada HTTP: `/health` retornou 402 em vez de 200 e 16 verificações não autenticadas receberam 402. O corpo informa `exceed_edge_functions_invocations_quota` e instrui o proprietário a atualizar o plano ou remover spend caps. As etapas autenticadas, Playwright, Full-IIFE e demais integrações foram **SKIPPED**. Bloqueio de infraestrutura do laboratório, não prova de regressão funcional do código. |
| #82 QA | [Validate 43879118035](https://github.com/Reekyi/UpStatus/actions/runs/43879118035): FAILURE no HEAD atual | `scripts/validate.mjs:26` falha com `production updateURL mismatch`. A PR é documental; a falha vem do build/validator herdado de master, não do texto do relatório. |

Os testes de #74 são CI em Chromium e ambiente isolado, não aceite físico no Sale Smartly/Tampermonkey. Os testes de upload da #76 são contratos offline com mocks: não houve PUT real ao Storage. O servidor valida MIME/tamanho declarados e a URL/token/caminho assinados, mas não inspeciona os bytes efetivamente enviados nem há verificação pós-upload do conteúdo; o MIME declarado não prova o formato real do arquivo.

## 3. Workflows, distribuição e compatibilidade

- `master/.github/workflows/deploy-test.yml` usa o secret genérico `SUPABASE_PROJECT_ID`, Supabase CLI `latest` e publica `upstatus-test`; não valida que o alvo seja um projeto TEST separado.
- `develop/.github/workflows/deploy-test.yml` também usa o secret genérico e CLI `latest`, e dispara automaticamente em push para develop. O projeto de destino efetivo não pode ser confirmado sem ler secrets, o que não foi feito.
- A candidata #74/#76 melhora o guard: exige `SUPABASE_TEST_PROJECT_ID`, rejeita produção e o laboratório de sinalização, valida o formato do project ref e fixa CLI 2.122.1. Porém a organização consultada continua sem um Full-Product TEST separado; o laboratório atual é apenas de segurança/sinalização.
- `team-lite-official/.github/workflows/deploy-production.yml` usa `SUPABASE_PROJECT_ID`, CLI `latest` e executa `supabase functions deploy upstatus`. Esse é o slug Normal, não `upstatus-team-lite`. Não há guard suficiente de projeto/SHA/migrations. A #76 não corrige esse workflow. **Não despachar.**
- O workflow de produção Normal em master usa secret genérico, CLI `latest`, não fixa explicitamente o ref/SHA nem verifica o project ref. A candidata #74 adiciona verificações de master, SHA e projeto e fixa CLI 2.122.1, mas mantém o pin rígido de `release.json.version === 3.4.7`, o que precisa ser revisto antes de um novo versionamento.
- Há um desencaixe importante na candidata Normal: `scripts/build.mjs` ainda configura a API base para `upstatus-screen-share-3-1-1-beta10`, enquanto o updateURL usa `release.scriptUrl` para `/upstatus/upstatus.user.js`. O workflow de produção da #74 publica somente `upstatus`, não beta10. Assim, publicar apenas o artefato `upstatus` não atualiza o backend beta10 que o cliente continua usando.
- O validator em master ainda espera `/upstatus/upstatus.user.js`, mas o build herdado gera o updateURL beta10; isso explica a falha repetida da #82. A candidata #74 corrige o uso do `release.scriptUrl`, mas não está em master.
- Team Lite candidato está em buildVersion 3.4.31; o runtime oficial implantado continua 3.4.30. Normal implantado é 3.4.7.

## 4. Edge Functions e disponibilidade

Os projetos aparecem `ACTIVE_HEALTHY`, mas isso não prova que as invocações Edge estejam liberadas.

### Produção

Inventário observado: 38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Isso não prova acesso anônimo por si só: os handlers usam autenticação própria com token UpStatus. Funções relevantes:

- `upstatus` v480, runtime Normal 3.4.7.
- `upstatus-screen-share-3-1-1-beta10` v6, API base usada pelo Normal.
- `upstatus-team-lite` v15, runtime Team Lite 3.4.30.
- `upstatus-test` v281.

Na janela consultada de 24h foram observadas **28.065 respostas HTTP 402**, com registros de 11:41:55 UTC a 14:44:59 UTC:

| Rota | HTTP 402 |
|---|---:|
| beta10 `/api/chat` | 14.916 |
| beta10 `/api/status` | 6.541 |
| beta10 `/api/remote-status` | 6.529 |
| beta10 `/api/account` | 31 |
| beta10 `/api/members` | 21 |
| beta10 `/api/me` | 21 |
| distribuição `/upstatus/upstatus.user.js` | 6 |

Último 402 observado: **14:44:59.843 UTC**. O Normal 3.4.7 implantado usa beta10 como API base; portanto chat, status, status remoto, conta e membros estão atingidos. O endpoint de distribuição `upstatus/upstatus.user.js` também aparece com 402. Não houve amostra de 402 com mensagem explicativa no log de produção; **a causa exata da restrição em produção não está confirmada**. Não atribuir automaticamente a mesma quota do laboratório. Não houve tráfego de `upstatus-team-lite` nesta janela de logs; isso não prova que Team Lite esteja saudável ou indisponível.

### Laboratório

O projeto `bfpjtfqlnypisxljoxkb` tem duas funções de teste e 39 migrations, não é Full-Product TEST. Os logs registram 48 respostas 402 em 14 rotas entre 12:37:25 e 12:41:42 UTC, incluindo `/health`, autenticação, salas e uma rota inexistente. O log do CI #76 fornece a causa explícita `exceed_edge_functions_invocations_quota`: o serviço está restrito por quota/spend cap. Nenhuma alteração de plano, spend cap ou configuração foi feita pela QA.

## 5. AUTH-03 e paridade Normal/Team Lite

Inspeção do código-fonte implantado:

- Normal `upstatus` v480: versão interna 3.4.7.
- Team Lite `upstatus-team-lite` v15: versão interna 3.4.30.
- API beta10 v6: versão interna 3.1.1-beta8.
- Os três runtimes usam cache de validação de sessão de 30 segundos.
- Os runtimes implantados ainda expõem `needsSetup` em `/api/account` e aceitam `POST /api/setup` via `login(req,true)`, sem `setupToken` nem consumo da RPC `consume_upstatus_setup_invite`.
- Normal exige senha mínima de 6 caracteres; Team Lite aceita 4. A regra diverge.
- Nos runtimes implantados, `isAdmin` aceita o nome literal `Ricardo` antes de consultar o papel persistido; `/api/chat/clear` também autoriza apenas pelo nome `Ricardo`. Isso mantém autorização nominal no caminho de produção.
- Os templates candidatos adicionam `setupToken` e consumo de `consume_upstatus_setup_invite`. Team Lite também chama `consume_upstatus_setup_invite_rate_limit`; Normal não contém essa chamada, e a etapa correspondente do Smoke #74 foi skipped. A paridade de rate limit de emissão de convite ainda não está fechada.

Os candidatos de cliente Normal e Team Lite mantêm `signaling_transport_enabled` false por padrão e endpoint de transporte vazio. Não configuram `private: true` nem `realtime.setAuth()`. Portanto, o transporte autenticado server-mediated continua opt-in e o fallback público de Realtime permanece ativo. A função de sinalização server-mediated não está implantada na produção.

## 6. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- Dez tabelas públicas de aplicação têm RLS habilitado e zero policies. Nove delas concedem privilégios efetivos a `anon` e `authenticated` para SELECT, INSERT, UPDATE, DELETE e TRUNCATE. `upstatus_visual_config` não concede esses privilégios.
- `realtime.messages`: RLS habilitado, zero policies, SELECT/INSERT efetivos para `anon` e `authenticated`. O snapshot retém 106 mensagens, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- O trigger de mensagens envia `to_jsonb(OLD/NEW)` completo no campo `record`; o trigger de remote-state publica dados de comando/resultado; o trigger de users publica nome/status/razão/sync. Todos chamam `realtime.send(..., false)`, portanto o broadcast é público.
- As três funções trigger `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, usam `search_path=public` e mantêm EXECUTE para `anon`, `authenticated` e `service_role`. O Security Advisor reporta 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policies.
- Buckets `chat-images` e `profile-images` são públicos, limite de 20 MiB. `storage.objects` tem RLS, zero policies próprias e SELECT/INSERT efetivos para anon/authenticated. A decisão de privacidade e a autorização de acesso aos objetos precisam ser explícitas.
- Default ACLs seguem amplas para `postgres` em `public` e `storage`, e para `supabase_admin` em `public` e `graphql`. As migrations candidatas de revogação ainda não foram aplicadas em produção.

### Laboratório

Security Advisor reporta 18 INFO de RLS habilitado sem policies e nenhum WARN de SECURITY DEFINER executável por anon/authenticated. Isso não o transforma em Full-Product TEST nem elimina a restrição de quota Edge.

## 7. Migrations e proveniência

- Ledger de produção: 7 migrations.
- Ledger do laboratório: 39 migrations.
- Branch gerenciada Supabase `main` da produção permanece `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.
- Os quatro SQLs originais abaixo retornam 404 tanto em master quanto na branch QA:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruir esses SQLs por inferência e não aplicar migrations em produção.

## 8. Issues, teste físico e aprovação

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) continua OPEN, **0/8 critérios físicos** marcados. Não houve teste manual de queda/retorno de internet, reentrada em sala sem F5, microfone/tela reais ou interoperabilidade instalada nesta execução.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) continua OPEN, **16/35** itens marcados. O comentário QA dedicado foi atualizado in-place; o comentário da Engenharia foi preservado.
- PRs #74, #75, #76 e #82 continuam abertas/Draft, sem review humana.

## 9. Gates e recomendação

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | **blocked** | Realtime público, zero policies, grants amplos; transporte autenticado dos candidatos continua desativado por padrão. |
| TEST-ISOLATION | **blocked** | Não existe Full-Product TEST; o laboratório está restrito por quota Edge. |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes e branch gerenciada `main` em MIGRATIONS_FAILED. |
| AUTH-03 | **blocked** | Runtime implantado mantém setup sem convite, autorização nominal e diferença de senha/rate limit. |
| ACL-STORAGE | **blocked** | Grants/TRUNCATE, SECURITY DEFINER executável, default ACLs amplas, buckets públicos e zero policies. |
| RECONNECT | **pending** | Issue #78 permanece 0/8; CI não substitui teste físico sem F5. |
| HUMAN-REVIEW | **pending** | PRs Draft, sem reviews e sem autorização humana de release. |

**Veredito: NOT READY.** Não recomendar merge, deploy, release ou publicação de userscripts.

### Próximas ações

1. O responsável com acesso de proprietário ao laboratório deve restaurar as invocações Edge (plano/spend cap); depois repetir Candidate Checks #76.
2. O responsável pela produção deve confirmar a causa específica dos 402 no painel Supabase; não presumir que é a mesma quota do laboratório.
3. Criar um Full-Product TEST separado antes de permitir deploy-test.
4. Corrigir o workflow Team Lite para o slug `upstatus-team-lite`, com guard de projeto/SHA, CLI pinada e preflight; não despachar o workflow atual.
5. Coordenar o endpoint de API Normal com o workflow de publicação: o cliente continua usando beta10 enquanto o workflow candidato publica somente `upstatus`.
6. Tornar o transporte autenticado padrão, retirar fallback público de eventos sensíveis e revisar grants, policies, triggers e default ACLs.
7. Recuperar os quatro SQLs originais, diagnosticar MIGRATIONS_FAILED e concluir AUTH-03 com rate limit/paridade.
8. Executar os oito critérios físicos da #78 e obter review humana antes de qualquer release.

Nenhum teste foi executado pela QA; foram inspecionados resultados de CI existentes. Nenhuma escrita SQL, alteração de produção, deploy, merge, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizada. A única escrita desta execução é este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.
