# UpStatus — auditoria independente de QA

**Data:** 2026-11-16T23:34:27.810Z  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, workflows, logs, fontes implantadas, catálogos PostgreSQL, migrations e Advisors. Nenhum teste foi iniciado manualmente pela QA. Nenhuma escrita foi feita em produção.

## Veredito

**NOT READY — não liberar Normal nem Team Lite.**

A evidência mais forte desta rodada é a combinação de: (1) 77.925 respostas HTTP 402 observadas nas rotas Normal dentro do recorte de logs disponível; (2) ausência de transporte Realtime privado por padrão; (3) grants e default ACLs amplos na produção; (4) AUTH-03 ausente no runtime e schema de produção; (5) falta de ambiente Full-Product TEST; e (6) workflows de publicação que ainda não coordenam corretamente API e distribuição.

## 1. Heads reais e documento de prontidão

Heads consultados:

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `a2dc5444ababbf69c0faf24ce501a51ccaa17650` |

O commit atual de master `9d40461` é somente documental: `docs: record read-only AUTH-03 migration preflight`. PRs #74 e #82 têm a base registrada em `a9288cc`, ficando uma commit atrás do master atual; o único commit adicional de master não altera runtime.

- PR #74: HEAD `dcaf6a072546eda0089e0cee4018c3047011f600`; 887 commits à frente e 1 atrás de master.
- PR #75: HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`.
- PR #76: HEAD `00a578e9174e08238a1289a35feb02d171625421`; 330 commits à frente de #75, sem commits atrás da base Team Lite.
- PR #82: HEAD `a2dc5444ababbf69c0faf24ce501a51ccaa17650`; 381 commits à frente e 1 atrás de master. Seu diff é documental (readiness e relatórios de auditoria).

Li o conteúdo integral de `docs/RELEASE_READINESS.md`: 8.423 linhas e 1.046.356 caracteres. O último checkpoint do documento é **2026-11-15 06:30 UTC**. Portanto, está desatualizado para a fotografia de 16/11. Não substituí o arquivo grande; este relatório foi criado separadamente para evitar sobrescrita concorrente.

## 2. PRs, CI e workflows

| PR | Resultado observado no HEAD exato | Classificação |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) PASS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS | CI automatizado |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS em 03/11 | PASS histórico, não valida #76 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | Candidate Checks [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) FAIL por restrição de quota | CI parcialmente bloqueado |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | Validate [43971896460](https://github.com/Reekyi/UpStatus/actions/runs/43971896460) FAIL: `production updateURL mismatch` | CI falhou |
| [#176 migrations](https://github.com/Reekyi/UpStatus/pull/176) | Validate [43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) FAIL: `client signed upload helper missing` | CI falhou por dependência ausente em develop |

As quatro PRs principais e a #176 permanecem abertas/Draft e sem review humana registrada.

### #74 Normal

O Smoke executou integração autenticada e navegador Chromium. O log registra 136/136 verificações autenticadas, negociação WebRTC e entrega de áudio/vídeo para chamada, voz e compartilhamento de tela, mesh de três participantes e teardown. O teste de rate limit de sinalização aceitou 90 operações e rejeitou a seguinte com HTTP 429 e Retry-After de 60 segundos. Também passaram os testes de recibos atômicos e de consumo único de convite.

Limite: o candidato não inclui a migration/teste de rate limit de emissão de convites que existe na linha #76. O sucesso do CI não equivale a teste físico no Sale Smartly.

### #76 Team Lite

Os testes locais/offline passaram: adapter de sinalização, recuperação de voz/tela, contrato HTTP isolado (11/11) e contratos de upload assinado. A chamada ao endpoint isolado recebeu HTTP 402 em vez dos 401 esperados. O log mostra **0/16 verificações não autenticadas aprovadas**; Playwright, integração autenticada, concorrência, recibos e convites foram ignorados depois da falha de infraestrutura.

O corpo da resposta do laboratório identifica a causa: `exceed_edge_functions_invocations_quota`. A organização Supabase está no plano Free e possui somente dois projetos. O proprietário precisa avaliar Usage/Billing e spend cap; não foi alterada configuração de cobrança.

### #82 QA

O PR contém apenas documentação. O Validate falha na asserção herdada de master `production updateURL mismatch`; não é falha causada pelo texto dos relatórios. O workflow de validação dispara para o PR inteiro e não filtra mudanças somente Markdown, produzindo CI repetido sem validar código de produto.

### Workflows de publicação

- **Normal #74:** manual-only; confere o project ref aprovado, fixa Supabase CLI 2.122.1 e restringe o release a 3.4.7. Porém, publica somente a função `upstatus`. O build configura a API Normal para `upstatus-screen-share-3-1-1-beta10`; a função beta10 implantada continua na versão interna 3.1.1-beta8. Assim, publicar apenas `upstatus` não atualiza o backend chamado pelo cliente.
- **Team Lite oficial:** o workflow em `team-lite-official` usa CLI `latest` e executa `supabase functions deploy upstatus`, não `upstatus-team-lite`; não contém guards equivalentes de projeto/SHA. **Não despachar esse workflow.**
- **TEST #76:** o workflow é melhor protegido: fixa CLI 2.122.1, rejeita produção e o projeto isolado de sinalização e publica `upstatus-test`. Mas não existe projeto Full-Product TEST para executar esse fluxo de forma válida.

## 3. Supabase — disponibilidade e Edge Functions

A organização tem plano Free e somente estes projetos:

- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY.
- Laboratório `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`), ACTIVE_HEALTHY.

Não existe projeto Full-Product TEST. A branch gerenciada `main` de produção permanece `MIGRATIONS_FAILED`, embora o preview esteja ACTIVE_HEALTHY. O laboratório não possui branches Supabase.

Edge Functions:
- Produção: 38/38 ACTIVE. `upstatus` v480 (código 3.4.7), `upstatus-screen-share-3-1-1-beta10` v6 (código 3.1.1-beta8), `upstatus-team-lite` v15 (código 3.4.30) e `upstatus-test` v281 (código 3.3.28).
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3, ambas ACTIVE.
- Todas as funções listadas reportam `verify_jwt=false`. Isso não prova que todas as rotas sejam anônimas: os runtimes usam autenticação própria em partes da API. Exige revisão rota a rota e não substitui autorização de aplicação.

### HTTP 402 em produção

A consulta ao stream `function_edge_logs` retornou **77.925 respostas 402**, de 11:41:55 a 21:00:47 UTC em 16/11:

| Rota | 402 |
|---|---:|
| Normal `/api/chat` | 41.630 |
| Normal `/api/status` | 18.104 |
| Normal `/api/remote-status` | 18.086 |
| `/api/members` | 33 |
| `/api/me` | 33 |
| `/api/account` | 33 |
| Distribuição `/upstatus/upstatus.user.js` | 6 |

O último registro disponível nesse stream foi 21:00:47 UTC; a consulta não retornou registros posteriores. Isso **não prova recuperação** nem permite atribuir a causa. A mensagem específica de quota foi observada no laboratório, não em produção. Não apareceu 402 do slug Team Lite nesse recorte; ausência de registro não comprova saúde ou tráfego.

## 4. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

A tabela `realtime.messages` contém 106 registros, todos `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 72 `user_status`;
- 26 `db_change`;
- 4 `remote_command`;
- 4 `remote_result`.

A tabela tem RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE efetivos para anon e authenticated; FORCE RLS está desabilitado. As partições consultadas não têm RLS próprio. O broadcast continua público.

Os candidatos Normal e Team Lite já usam o tópico `upstatus-live-...`, alinhado ao tópico dos triggers. Isso corrige a divergência de nome no candidato, mas não fecha a autorização: ambos mantêm `signaling_transport_enabled` default false. Sem a flag, o cliente continua no fallback público de broadcast. Não há `private:true` nem autenticação Realtime obrigatória no caminho default.

### RLS e grants

Produção: 10 tabelas públicas com RLS e zero policies. Nove concedem privilégios diretos amplos a anon e authenticated, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE; `upstatus_visual_config` é a exceção e não concede esses privilégios. RLS sem policies não protege TRUNCATE.

Laboratório: 18 tabelas públicas com RLS e zero policies, mas os privilégios diretos de tabela para anon/authenticated estão revogados nas tabelas consultadas. É uma melhoria real de ACL no laboratório, não uma correção de produção.

### SECURITY DEFINER e default ACL

Produção tem três funções `SECURITY DEFINER` (`upstatus_broadcast_messages`, `upstatus_broadcast_remote_state`, `upstatus_broadcast_users`) com `search_path=public` e EXECUTE concedido a anon/authenticated. As funções retornam `trigger` e estão anexadas a triggers; não há evidência de que sejam RPCs PostgREST invocáveis. Portanto, não classifiquei isso como exploração RPC comprovada. Os grants continuam desnecessários e o search_path deve ser endurecido.

No laboratório, as mesmas funções usam `search_path=""` e não concedem EXECUTE a anon/authenticated.

Default ACLs de produção continuam amplas: defaults de postgres em public/storage e de supabase_admin em public/graphql/graphql_public concedem a anon/authenticated privilégios de tabelas, sequences e funções, inclusive TRUNCATE e EXECUTE.

### Storage

- `chat-images`: público, 20 MiB, 168 objetos.
- `profile-images`: público, 20 MiB, 20 objetos.
- Zero policies próprias em `storage.objects`.

A visibilidade pública depende da configuração de bucket e da posse da URL; não há isolamento por usuário comprovado nesta auditoria.

## 5. AUTH-03 e migrations

Produção não possui `upstatus_setup_invites`, nenhuma coluna `setup_token_*` e nenhuma RPC de consumo de convite/rate limit. Os runtimes Normal 3.4.7 e Team Lite 3.4.30 ainda mantêm `POST /api/setup` sem convite e fallback de papel administrativo por nomes fixos (Ricardo, Lohan e Guilherme). As candidatas têm token de primeiro acesso, mas o Normal #74 ainda não incorpora o rate limit de emissão que existe no candidato #76.

Migrations: produção 7; laboratório 39.

A PR #176 recupera quatro arquivos SQL do ledger de produção. Fiz comparação independente dos quatro arquivos com os statements armazenados em `supabase_migrations.schema_migrations`: todos coincidem após remover somente a quebra de linha final. Isso comprova a recuperação do texto SQL registrado, não os bytes originais dos arquivos, comentários ou formatação. A PR continua Draft e seu CI falha por dependência ausente (`client signed upload helper missing`). Não houve replay nem escrita SQL.

## 6. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios marcados. Não houve teste físico de perda/retorno de internet, reentrada em sala, chamadas, microfone, tela ou interoperabilidade Normal ↔ Team Lite sem F5.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16 itens marcados e 19 pendentes no corpo. O comentário QA dedicado foi atualizado no mesmo comentário, sem duplicar nem tocar no comentário da Engenharia.

## 7. Gates e próximos passos

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, sem policies e transporte autenticado default |
| TEST-ISOLATION | BLOCKED | Só produção e laboratório de sinalização; quota bloqueia integração |
| MIGRATION-PROVENANCE | IN_PROGRESS | SQL do ledger conferido, identidade dos arquivos originais e preflight Full-Product TEST pendentes |
| AUTH-03 | BLOCKED | Schema/RPC ausentes em produção e setup legado nos runtimes |
| ACL-STORAGE | BLOCKED | Grants/default ACLs, buckets públicos e policies ausentes |
| RECONNECT | PENDING | 0/8 testes físicos na Issue #78 |
| HUMAN-REVIEW | PENDING | PRs sem review e sem autorização humana |

Prioridades:
1. Investigar a causa específica dos 402 em produção e confirmar o último estado de disponibilidade com logs novos.
2. O administrador da organização deve verificar Usage/Billing e spend cap do laboratório.
3. Consolidar um corte Normal que atualize distribuição e API efetivamente chamada; escolher versão e validar updater.
4. Corrigir o workflow Team Lite para slug correto, projeto/SHA explícitos e CLI pinada.
5. Tornar sinalização server-mediated/autorizada o default seguro em Normal e Team Lite; remover fallback público sensível.
6. Planejar e revisar migrations AUTH-03, grants, default ACLs e Storage antes de qualquer aplicação autorizada.
7. Provisionar Full-Product TEST, concluir os 8 testes físicos e obter review/aprovação humana.

## Limites

Nenhum teste foi executado diretamente pela QA nesta rodada. Os resultados citados são CI já existente e inspeção de código/configuração. Todas as consultas SQL foram SELECT-only. Não houve deploy, merge, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs, fixtures ou operação destrutiva. A única escrita desta execução é este relatório documental na branch QA e a atualização do comentário QA existente na Issue #79.
