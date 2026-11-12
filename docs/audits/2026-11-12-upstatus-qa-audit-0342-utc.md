# Auditoria independente UpStatus — 2026-11-12 03:42 UTC

**Veredito: NOT READY.** Esta rodada foi somente de inspeção. Não foram executados testes manuais, workflows ou alterações no Supabase. A única escrita técnica é este novo relatório na branch QA; a atualização do comentário dedicado da Issue #79 é o registro operacional solicitado.

## 1. Escopo, evidências e limitação documental

- Repositório: `Reekyi/UpStatus`.
- Supabase produção: `dlfvkawaiqduhlazsszm`.
- Supabase laboratório: `bfpjtfqlnypisxljoxkb`.
- Foram consultados heads, PRs, issues, workflows, arquivos de candidatos, Edge Functions, migrations, Security Advisor e catálogos PostgreSQL.
- Todas as consultas SQL executadas foram SELECT-only.
- **Limitação:** `docs/RELEASE_READINESS.md` existe na branch QA com blob SHA `7cfbd70886df42ce790c078c224b19284a632595`; a comparação QA/master indica 8.409 linhas adicionadas. Nesta execução, `fetch_file` devolveu conteúdo vazio mesmo para ranges de linhas e a leitura raw falhou por tamanho. Portanto, não afirmo ter relido integralmente o arquivo nesta rodada. O arquivo não foi alterado.

## 2. Heads e estado das PRs

| Referência | HEAD | Estado |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | branch sem proteção |
| QA `qa/release-readiness-2026-11-04-master` | `6b9aba1c4ec96a8e8472343bfbc0221636b1c872` | 237 commits à frente, 1 atrás de master |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | branch sem proteção |

A API de rulesets retornou lista vazia. A proteção da branch QA não pôde ser consultada diretamente nesta execução; não a classifico como desprotegida sem evidência específica.

| PR | HEAD | CI / estado observado |
|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Draft; Validate e Signaling Smoke PASS nos runs [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft; PASS histórico de 03/11 no [run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite signaling | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Draft; Candidate Checks PASS no [run 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) |
| #82 QA | `6b9aba1c4ec96a8e8472343bfbc0221636b1c872` | Draft; Validate FAIL no [run 43142972348](https://github.com/Reekyi/UpStatus/actions/runs/43142972348) |
| #131 Normal AUTH-03 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | Draft; Signaling Smoke PASS no [run 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) |
| #146 Normal remote hints | `71c5ce2f730ade8ee3e8b090498202933809ce5c` | Draft; Validate PASS reportado no [run 43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) |
| #147 QA release target | `e6c1b740d3f3b2b5c05fcc603f7420e1c131aea3` | Draft; teste direcionado PASS nos runs [43147567694](https://github.com/Reekyi/UpStatus/actions/runs/43147567694) e [43147563019](https://github.com/Reekyi/UpStatus/actions/runs/43147563019) |

As revisões consultadas para #74, #75, #76, #82 e #147 não retornaram reviews humanas.

### QA e PR #147

A falha do Validate do HEAD QA continua sendo `production updateURL mismatch`. A candidata #147 corrige o alvo Normal usando `PROD_FUNCTION` e `release.json.scriptUrl`, separa o updater TEST do manifesto de produção e adiciona um workflow candidate-only com `contents: read`, checkout sem credenciais persistidas e sem secrets.

O teste direcionado da #147 passou. O Validate completo no merge-ref [run 43147344544](https://github.com/Reekyi/UpStatus/actions/runs/43147344544) falhou porque a suíte exige `setPendingAttachment(file)`, ausente no template da base QA. A assertion foi preservada; não foi enfraquecida. O slug `upstatus-test` continua no projeto Supabase de produção, portanto o isolamento do updater não cria um ambiente full-product TEST.

**Novo achado de autorização na #147:** a PR remove o atalho visual `member==='Ricardo'` para exibir exclusão administrativa e a UI passa a usar o papel recebido do servidor. Porém, `src/server/index.template.ts` ainda contém, dentro de `login(req,true)`, a atribuição `a.role || (['Ricardo','Lohan','Guilherme'].includes(name) ? 'implementation_admin' : 'implementation_user')`. O endpoint `POST /api/setup` não exige `setupToken` nesse candidato. Assim, a mudança da UI não remove o fallback de promoção por nome no servidor. O `admin(name)` consulta o papel persistido, mas o próprio primeiro setup ainda pode derivar esse papel do nome. A rota de health também mantém allowlist nominal. A consulta de produção encontrou cinco contas atuais e nenhuma sem senha ou papel; o risco é latente para uma conta privilegiada ainda não configurada/recriada, não uma conta atualmente incompleta.

## 3. AUTH-03: candidatos versus produção

Os candidatos Normal #131 e Team Lite #76 contêm o fluxo de convite com token de 64 caracteres hexadecimais, consumo atômico por RPC e rate limit de emissão. O servidor Normal #131 chama `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`; o servidor Team Lite #76 também exige `setupToken` e chama as RPCs.

Os runtimes implantados não têm essa implementação:

- Normal `upstatus` v480, userscript 3.4.7.
- Team Lite `upstatus-team-lite` v15, userscript 3.4.30.
- API Normal beta10 v6.

A inspeção dos três códigos implantados encontrou `POST /api/setup -> login(req,true)`, sem `setupToken`, sem RPC de consumo e sem RPC de rate limit. Normal e Team Lite implantados ainda têm o fallback nominal descrito acima. O catálogo de produção confirmou zero colunas `setup_token_*`, tabela de rate limit ausente e as duas RPCs ausentes.

As cinco contas existentes têm senha e papel preenchidos. Isso reduz o risco imediato de uma conta já cadastrada, mas não corrige o endpoint de primeiro acesso sem convite.

## 4. Bundles instalados, comandos remotos e Realtime

Os userscripts foram decodificados dos bundles `USERSCRIPT_BASE64` das Edge Functions implantadas:

- Normal v480 contém userscript 3.4.7. O listener `remote_command` chama diretamente `executeRemoteCommand(c)` quando `c.target===member`; os listeners públicos também chamam `receiveCallSignal`, `voiceRoomReceive` e `screenShareReceive`.
- Team Lite v15 contém userscript 3.4.30. Ele verifica a sessão local e a geração de autenticação antes de processar o comando, mas ainda chama `executeRemoteCommand(c)` a partir do payload público. Essa verificação autentica o cliente local, não o emissor do broadcast.
- Ambos usam `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` e sem `realtime.setAuth()`.

O banco publica em outro tópico: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. O snapshot read-only encontrou 109 eventos, todos `private=false`, nesse tópico legado. Portanto, os clientes instalados não estão assinando o mesmo tópico usado pelos triggers.

A candidata Normal #146 transforma `remote_command` e `remote_result` em avisos para polling autenticado. A candidata Team Lite #76 também usa avisos e polling autenticado para comandos/resultados. Porém:
- #143 e #146 estão divergentes: #146 está 10 commits à frente e 15 atrás de #143.
- O template da branch #143 ainda executa diretamente o comando recebido por broadcast.
- A workflow da #143 declara `pull_request.branches: [master]`; como a PR #143 tem base #142, o Guard próprio não roda como check de PR nessa base. O push check não substitui um check de PR.
- Team Lite #76 deixa `signaling_transport_enabled=false` por padrão. Com a flag desligada, os listeners públicos de `call_signal`, voice-room e screen-share continuam ativos. #146 não implementa transporte server-mediated de voz/tela.

O backend server-mediated `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 existe apenas no laboratório; não existe função `upstatus-signal-test` em produção.

## 5. PostgreSQL, RLS, grants, SECURITY DEFINER e Storage

### Produção

Snapshot read-only de 12/11:

- 10 tabelas em `public` com RLS habilitado e sem policies.
- 126 grants diretos em tabelas `public` para anon/authenticated, distribuídos em nove tabelas.
- 8 grants em `realtime` e 32 em `storage` para anon/authenticated.
- Privilégios observados incluem DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. RLS não protege TRUNCATE.
- 24 linhas de Default ACL, 75 itens ACL e 300 entradas expandidas por privilégio. Esses números representam níveis diferentes da mesma consulta, não devem ser somados.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, com `search_path=public` e EXECUTE para anon/authenticated. O Security Advisor retornou 3 WARN para anon e 3 WARN para authenticated, além de 10 INFO de RLS sem policy. Não foi feita chamada RPC para provar execução direta; o achado confirmado é o ACL excessivo e os triggers públicos.
- `upstatus_broadcast_messages` transmite o registro OLD/NEW completo; os triggers de estado transmitem metadados de comando/resultado e status em broadcast público.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- Buckets `chat-images` e `profile-images` públicos, limite de 20 MiB, zero policies próprias em `storage.objects`; 188 objetos.
- `public.messages`: 296 registros, todos com `file_name` nulo.
- AUTH-03 ausente no catálogo.

O Advisor é um sinal de configuração, não prova isolada de exploração. Não foi realizado teste externo de leitura, escrita, upload ou injeção.

### Laboratório

- Projeto `bfpjtfqlnypisxljoxkb` ACTIVE_HEALTHY, 39 migrations e duas Edge Functions: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Contagens read-only de users, messages, sessions, state, signal events/rooms/members, call attempts, voice-room attempts, invite rate limits e realtime.messages: todas zero.
- Zero grants diretos em tabelas `public` para anon/authenticated.
- `realtime.messages` ainda concede SELECT/INSERT/UPDATE a anon/authenticated.
- As três funções trigger SECURITY DEFINER usam `search_path=""` e EXECUTE somente para postgres/service_role.
- Security Advisor: 18 INFO de RLS habilitado sem policy; nenhum WARN de SECURITY DEFINER.
- Default ACL do laboratório ainda possui 25 linhas, 70 itens e 277 entradas expandidas; há defaults residuais fora do escopo public.

A organização lista somente dois projetos: produção e laboratório. O slug `upstatus-test` v281 está dentro do projeto de produção. Não há terceiro projeto full-product TEST.

## 6. Migrations, Edge Functions e workflows

- Produção tem sete migrations aplicadas; master contém somente três arquivos SQL originais.
- O dispatcher #143 lista as sete migrations obrigatórias, mas quatro fontes estão marcadas `ledger-recovered-only` e sem Git blob SHA verificável. O preflight rejeita corretamente essas fontes.
- A migration `20261109230000_setup_invite_rate_limit` ainda não está no manifesto do dispatcher.
- Branch Supabase gerenciada `main`: `MIGRATIONS_FAILED`; preview: `ACTIVE_HEALTHY`.
- Produção lista 38 Edge Functions ativas. Os runtimes principais `upstatus`, `upstatus-team-lite` e beta10 reportam `verify_jwt=false`; seus handlers usam autenticação de sessão customizada, então esse flag sozinho não prova ausência de autenticação.
- Workflow oficial `team-lite-official/.github/workflows/deploy-production.yml` usa CLI `latest` e executa `supabase functions deploy upstatus`, alvo do Normal, não `upstatus-team-lite`.
- A PR #129 propõe bloquear esse workflow legado, mas continua Draft e não está incorporada à branch oficial.

## 7. Testes: classificação

**CI confirmado**
- #74: Validate e Signaling Smoke PASS no HEAD atual consultado.
- #75: PASS histórico, sem mudança de HEAD.
- #76: Candidate Checks PASS no HEAD atual consultado.
- #131: Signaling Smoke PASS no HEAD consultado.
- #146: Validate PASS no HEAD consultado.
- #147: teste direcionado PASS; Validate completo FAIL por helper de anexos ausente na base QA.

**Inspeção de código / banco**
- Decodificação dos userscripts implantados, comparação de tópicos, handlers de broadcast, AUTH-03, RLS, grants, ACL, SECURITY DEFINER, Storage, Edge Functions e dispatcher.

**Manual**
- Nenhum teste manual de navegador, Sale Smartly, Tampermonkey, microfone, câmera, compartilhamento de tela ou rede foi executado nesta rodada.

**Pendente**
- Issue #78 continua aberta, com oito critérios físicos desmarcados, incluindo reconexão Normal e Team Lite sem F5.

**Bloqueado**
- Full-product TEST inexistente; migrations originais incompletas; runtime AUTH-03 não implantado; Realtime e sinalização pública; ACL/Storage; workflow Team Lite incorreto; PR #143 sem Guard no evento de PR da base empilhada; Validate QA vermelho; review humana ausente.

## 8. Veredito e próximos passos

**NÃO LIBERAR.**

1. Corrigir o primeiro setup Normal e Team Lite com convite obrigatório; remover qualquer promoção administrativa derivada de nome, inclusive no servidor e na rota de health.
2. Integrar AUTH-03 completo no Normal #131 e Team Lite #76, incluindo rate limit, sem perder a proteção na API final.
3. Reconciliar #146 com #143 e garantir Guard no evento PR da base real; não publicar o template antigo.
4. Implementar transporte server-mediated de voz/tela no backend de produção antes de torná-lo default; alinhar os tópicos e remover listeners públicos sensíveis.
5. Recuperar/provar os quatro SQLs originais e incluir a migration AUTH-03 no manifesto.
6. Corrigir workflow Team Lite para slug correto, CLI pinada, SHA/projeto/preflight e revisão humana.
7. Endurecer grants e Default ACL com owners autorizados; decidir privacidade de Storage e alinhar limites.
8. Criar ambiente full-product TEST separado do projeto de produção.
9. Corrigir o Validate da QA sem remover assertions legítimas; integrar o helper de anexos ausente.
10. Obter aprovação humana e executar os oito critérios físicos da #78.

Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizada. Nenhum workflow foi iniciado ou repetido manualmente pela auditoria. A única alteração de repositório é este novo arquivo documental na branch QA; nenhum arquivo existente foi sobrescrito.
