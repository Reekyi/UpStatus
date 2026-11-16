# Auditoria independente de qualidade — 2026-11-16 00:33 UTC

## Veredito

**NOT READY.** A auditoria encontrou correções candidatas relevantes em #167 (Normal) e #76 (Team Lite), mas elas não estão integradas/implantadas. A produção continua com primeiro acesso legado, autorização nominal para limpar o chat e Realtime público. Não houve teste manual.

## Escopo e limites

- Repositório: `Reekyi/UpStatus`.
- Supabase produção: `dlfvkawaiqduhlazsszm`.
- Supabase laboratório: `bfpjtfqlnypisxljoxkb`.
- GitHub e Supabase foram consultados em modo read-only.
- SQL executado somente com SELECT/catálogo.
- Não foram iniciados workflows, testes mutáveis, deploys, migrations, merges, releases, alterações de secrets/flags/grants/policies ou operações destrutivas.
- Não havia sessão Tampermonkey/Sale Smartly nem dispositivos físicos para aceitação manual.

## Heads e integridade da QA

| Branch | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `aca7f840c56a27ce1c50a4d2cf7f5e973321e99c` |

Comparação QA vs master: 352 commits à frente, 1 atrás; estado diverged. Não houve rebase. O HEAD QA foi confirmado também pela ref GitHub e pelo HEAD da PR #82.

`docs/RELEASE_READINESS.md` foi lido na QA. Tem 8.423 linhas e 1.046.356 caracteres; o último snapshot interno é de 2026-11-15 06:30 UTC, portanto está defasado em relação a esta auditoria.

## CI e PRs

| PR | Resultado observado | Classificação |
|---|---|---|
| #74 Normal | Validate + Signaling Smoke SUCCESS | CI histórico no HEAD documentado |
| #75 Team Lite | Candidate Checks SUCCESS | PASS histórico; não substitui #76 |
| #76 Team Lite | Candidate Checks SUCCESS | CI no HEAD candidato |
| #82 QA | Validate FAILURE, run [43776040353](https://github.com/Reekyi/UpStatus/actions/runs/43776040353) | Falha reproduzida no log |
| #161 Normal | Validate + Smoke SUCCESS | CI no candidato |
| #167 Normal | Validate SUCCESS, run [43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) | CI no candidato |
| #168 | Validate SUCCESS, run [43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) | CI no candidato; sem Smoke confirmado |
| #170 Normal | Validate FAILURE, run [43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686) | Falha no teste de regressão de anexos |

Os resultados acima são execuções existentes consultadas nesta auditoria, não testes repetidos pela QA. As PRs examinadas continuam sem aprovação humana registrada.

### Reconciliação das candidatas Normal

- **#167** já reúne separação entre URL de atualização e endpoint da API, autorização do botão/endpoint de limpeza do chat por conta proprietária + papel persistido `implementation_admin`, anexos pendentes e migration/RPC de rate limit de setup-invite. Seu Validate passou.
- A #167 mantém deliberadamente o `CLOUD_SERVER` legado beta10 enquanto separa a URL do atualizador. Ela **não** efetua sozinha o cutover da API Normal.
- **#161** muda o alvo da API Normal para `upstatus` e contém o rate limit distribuído de convites; está em outra linha-base (`chore/continuity-foundation`). A integração de #161 com #167 precisa ser reconciliada e validada em um único HEAD.
- **#170** tenta combinar updater/API e autorização, mas seu Validate falha porque o teste ainda espera upload imediato enquanto #167 adota anexos staged/pending. Não tratar #170 como correção independente pronta; preservar a regressão de anexos e integrar os contratos.
- **#76** já contém o guard de papel persistido no template dedicado Team Lite, fluxo de convite de primeiro acesso, rate limit e testes de isolamento. Seu Candidate Checks passou. A versão candidata Team Lite é 3.4.31; a branch oficial ainda está em 3.4.30.
- **#171** foi fechada sem merge; era um backport redundante da proteção de papel já existente em #76.

### Falhas atuais dos workflows

- Master: `scripts/build.mjs` continua gerando `updateURL` a partir do endpoint beta10, enquanto `release.json` aponta para `/upstatus/upstatus.user.js`. O Validate #82 falha em `scripts/validate.mjs:26` com `production updateURL mismatch`.
- Master também fixa o deploy em versão 3.4.7 e usa Supabase CLI `latest`.
- Team Lite oficial ainda executa `supabase functions deploy upstatus`, não `upstatus-team-lite`; usa CLI `latest` e não tem as mesmas verificações de projeto/SHA/preflight do fluxo Normal. **Não despachar esse workflow.**
- Develop/TEST usa `SUPABASE_PROJECT_ID` genérico vindo de secret e não valida o ID contra uma allowlist explícita do laboratório.

## Runtime efetivamente implantado

| Função produção | Versão | SHA de origem |
|---|---:|---|
| upstatus | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| upstatus-team-lite | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| beta10 Normal | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| upstatus-test | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |

Produção lista 38 Edge Functions ACTIVE; laboratório lista duas. Todas reportam `verify_jwt=false`. Isso não prova ausência de autenticação: os handlers principais usam token de sessão próprio. O risco está nos caminhos de setup/ações administrativas sem as verificações necessárias.

As fontes implantadas Normal e Team Lite foram inspecionadas e os userscripts embutidos decodificados:
- Normal instalado: 3.4.7; updater aponta para `/upstatus/upstatus.user.js`, mas o cliente usa API beta10.
- Team Lite instalado: 3.4.30; updater GitHub próprio e API Team Lite.
- Ambos assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Ambos não contêm `private:true`, `setAuth()` ou transporte autenticado de sinalização.
- Ambos mantêm handlers de voz/tela ligados a eventos Realtime públicos.

## AUTH-03 e autorização

As fontes implantadas `upstatus` v480, `upstatus-team-lite` v15 e beta10 v6:
- não contêm `setupToken`, `consume_upstatus_setup_invite` ou `consume_upstatus_setup_invite_rate_limit`;
- mantêm consulta de `needsSetup` e rota de setup legado;
- mantêm fallback nominal de papel administrativo para nomes conhecidos quando o papel está vazio;
- mantêm limpeza global do chat autorizada por `name === "Ricardo"`, sem exigir o papel persistido no endpoint.

A tabela `upstatus_setup_invite_rate_limits` e a RPC `consume_upstatus_setup_invite_rate_limit` estão ausentes em produção e presentes no laboratório. A RPC de consumo de convite também está ausente em produção e presente no laboratório. Portanto, AUTH-03 está implementado em candidatos/lab, não no runtime de produção.

O banco de produção tinha cinco usuários no último snapshot de engenharia, sem hashes de senha ou papéis vazios; não foi reproduzida tomada de conta. A ausência de convite obrigatório continua sendo uma falha de desenho do fluxo, não uma exploração comprovada.

## Realtime

Snapshot read-only atual de produção:
- 106 mensagens Realtime com `private=false`; zero privadas no snapshot.
- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies.
- anon e authenticated têm SELECT, INSERT e UPDATE (seis grants no total).

Os três broadcasts PostgreSQL continuam SECURITY DEFINER:
- `search_path=public`;
- EXECUTE efetivo para anon, authenticated e service_role;
- os triggers enviam payloads de estado/mensagem, incluindo registros completos OLD/NEW no broadcast de mensagens.

No laboratório, as três funções usam search_path vazio e EXECUTE apenas para service_role, mas `realtime.messages` ainda mantém os seis grants de cliente e zero policies; a tabela estava sem mensagens.

O snapshot anterior de readiness registra tópico de trigger `upstatus-live-6f5e7b31-...`, diferente do tópico usado pelos clientes `upstatus-screen-share-live-3-1-1-beta10`. Nesta execução o bundle cliente e a contagem de mensagens públicas foram revalidados; a definição do tópico dos triggers não foi reconsultada separadamente.

## RLS, grants, ACL e Storage

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Tabelas public com RLS e sem policies | 10 | 18 |
| Grants diretos de clientes em public | 126 | 0 |
| Grants TRUNCATE de clientes em public | 18 | 0 |
| Privilégios expandidos em default ACLs | 300 | 277 |
| Default ACL entries para anon/authenticated | 120 | 96 |
| Grants anon/auth em realtime.messages | 6 | 6 |
| Policies em storage.objects | 0 | 0 |

Os números de default ACL são privilégios expandidos em vários schemas, não grants diretos de tabela; exigem revisão por schema/owner, sem revogação cega.

Storage de produção:
- `chat-images`: público, 168 objetos, limite 20 MiB.
- `profile-images`: público, 20 objetos, limite 20 MiB.
- Zero policies próprias em `storage.objects`.
- Laboratório: nenhum bucket/objeto.

Security Advisor: produção 6 WARN/10 INFO; laboratório 0 WARN/18 INFO. O laboratório está mais restrito nas tabelas public, mas não está completamente fechado: default ACLs e grants em schemas Realtime/Storage permanecem.

## Migrations, branches Supabase e logs

- Produção: sete migrations no ledger; branch gerenciada `main` em `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Laboratório: 39 migrations; nenhuma branch de desenvolvimento; zero usuários, mensagens, sessões, salas, memberships, objetos Storage e fixtures de produto.
- Quatro SQLs originais seguem ausentes segundo o snapshot de readiness: visual config, file_name, MIME de documentos e limites de upload. Não foram reconstruídos.
- Logs consultados não forneceram amostra Edge suficiente para calcular HTTP 402 na janela; não declarar recuperação nem contagem nova.

## Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados.
- Não houve sessão Tampermonkey/Sale Smartly nem dispositivos reais; reconexão sem F5, áudio bidirecional, microfone, compartilhamento de tela e interoperabilidade Normal ↔ Team Lite continuam pendentes.
- Não houve teste manual nesta execução.

## Gates e próximos passos

| Gate | Estado |
|---|---|
| RT-01 | blocked |
| TEST-ISOLATION | blocked |
| MIGRATION-PROVENANCE | blocked |
| AUTH-03 | blocked |
| ACL-STORAGE | blocked |
| RECONNECT | pending |
| HUMAN-REVIEW | pending |

Prioridades:
1. Reconciliar #167 + #161 + #168 em um único candidato Normal, mantendo staged attachments, papel persistido, setup-invite e cutover API coordenado.
2. Definir nova versão Normal estável e alinhar manifesto, build, guard e artefato; não deixar usuários 3.4.7 presos no backend antigo.
3. Corrigir o workflow Team Lite para projeto/SHA/CLI fixos e slug `upstatus-team-lite`; manter TEST com validação explícita do projeto isolado.
4. Tornar Realtime privado/autenticado por padrão em Normal e Team Lite, validar identidade/membership/destinatário no servidor e alinhar tópicos.
5. Revisar RLS, grants, default ACLs, SECURITY DEFINER e Storage por schema/owner.
6. Recuperar os SQLs originais, diagnosticar `MIGRATIONS_FAILED` e provisionar Full-Product TEST.
7. Executar os oito critérios físicos da #78 e obter aprovação humana antes de qualquer release.

**Integridade:** a única escrita de repositório desta execução é este relatório novo na branch QA. O comentário QA existente na #79 foi atualizado; o comentário da Engenharia não foi alterado. Produção/laboratório permaneceram read-only.
