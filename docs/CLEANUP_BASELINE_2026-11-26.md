# UpStatus — baseline da reorganização mínima

**Data:** 2026-11-26  
**Objetivo:** organizar a estrutura existente sem reescrever funcionalidades, alterar comportamento ou fazer deploy.

## Regras do trabalho

- Preservar o comportamento e o desempenho conhecidos da versão 3.4.7.
- Não reescrever módulos nem mudar contratos de API por estética.
- Fazer mudanças pequenas, localizadas e reversíveis.
- Não alterar produção, Supabase, migrations, secrets, policies ou workflows de deploy.
- Não integrar PRs existentes nem fazer merge/rebase amplo sem revisão específica.
- Antes de mover código, confirmar a origem e registrar dependências/imports.
- Validar cada mudança com os scripts existentes e testes focados; se houver regressão, reverter.

## Ponto de partida Git

- Repositório: `Reekyi/UpStatus`
- Branch de trabalho: `chore/cleanup-structure-347`
- Base inicial: `master`
- SHA da base: `9d40461babcec8eb8686c2a04be9c675df7da381`
- A branch foi criada isoladamente. Nenhum arquivo de produção foi alterado.

## Runtime observado no Supabase atual (somente leitura)

- Projeto: `upstatus-normal`
- Project ref: `mvjqunhjxkbfcrxkjtgf`
- Região: `sa-east-1`
- Estado: `ACTIVE_HEALTHY`
- Edge Function `upstatus`: ACTIVE, versão de implantação 2, verify_jwt=false
- SHA-256 de bundle informado pelo Supabase: `f1f6b4aaba1a48c5f9ea92fa75d326f7fccd73194400a8c87b87d6e47a8ab44a`
- O código da função declara `VERSION = "3.4.7"`.
- Funções adicionais ativas observadas: `upstatus-screen-share-3-1-1-beta10` e `upstatus-storage-migrate-once`.

## Divergência que precisa ser resolvida antes de mover código

O runtime atual foi inspecionado diretamente no projeto Supabase, mas não é seguro afirmar que o conteúdo de `master` representa integralmente o bundle implantado:

- `master/release.json` declara 3.4.7, porém aponta para o projeto antigo `dlfvkawaiqduhlazsszm`.
- O userscript embutido no runtime atual aponta seu update/download URL para o projeto atual `mvjqunhjxkbfcrxkjtgf`.
- O userscript embutido no runtime e o artefato `master/UpStatus.user.js` têm tamanhos diferentes (545.607 vs. 544.057 caracteres) e não são idênticos.
- O build script de `master` também contém referências ao projeto antigo.
- Existe documentação anterior em `docs/RECONSTRUCTION_FOUNDATION.md` e PR #178 com um mapa mais amplo de divergências entre runtimes, branches e candidatos.

**Consequência:** esta branch é um ponto de trabalho isolado, não uma declaração de que `master` é a fonte definitiva do runtime atual. Antes da primeira mudança de código, reconciliar a origem do userscript e do backend implantados com os arquivos-fonte e identificar quais diferenças são apenas URLs/ambiente e quais são alterações funcionais.

## Arquivos-fonte identificados em master

- `src/userscript/upstatus.user.template.js` — aproximadamente 543.874 bytes.
- `src/server/index.template.ts` — aproximadamente 102.752 bytes.
- `scripts/build.mjs` — gera o userscript e a Edge Function.
- `scripts/validate.mjs` — build + verificações estáticas e regressões existentes.

O userscript e a Edge Function são grandes arquivos autocontidos. A reorganização deve ser incremental e só começar depois de mapear os pontos de entrada e dependências. Não dividir arquivos apenas por tamanho.

## Pull requests e trabalho anterior

- PR #178: documentação de reconstrução, Draft, baseada em `develop`; não é autorização para merge.
- PR #161: candidata Normal, Draft, ainda não integrada.
- PR #167: candidata de build/chat, Draft, ainda não integrada.
- Há várias outras branches e PRs em andamento. Não apagar, sobrescrever ou incorporar automaticamente.

## Próximo passo

1. Recuperar e comparar o fonte exato do runtime atual com os templates do GitHub.
2. Identificar os blocos de código que podem ser movidos sem alterar lógica ou ordem de execução.
3. Escolher um primeiro bloco pequeno e de baixo risco.
4. Registrar diff, executar validação e só então continuar.

## Continuidade entre conversas

Este arquivo é o checkpoint durável do projeto. Se a conversa atingir o limite, iniciar outro chat e pedir para continuar o projeto UpStatus usando a branch `chore/cleanup-structure-347` e este documento. O trabalho e o estado técnico ficam no GitHub; o novo chat não depende de recuperar toda a conversa anterior.


## Atualização 2026-11-26

A proveniência dos runtimes ativos foi registrada em `docs/RUNTIME_PROVENANCE_2026-11-26.md`. A descoberta principal é que o Normal 3.4.7 é distribuído por `upstatus`, mas utiliza o backend/API beta10, cuja identidade interna é beta8. Não tratar o runtime `upstatus` como o backend completo do cliente nem refatorar os slugs por aparência.

Nenhuma mudança de aplicação foi feita. O próximo passo é comparar as páginas de convidados e mapear os contratos cliente/API antes da primeira extração modular.


## Atualização adicional — contratos e candidato beta (2026-11-26)

A análise comparativa foi aprofundada e registrada em `docs/ROUTE_CONTRACTS_AND_BETA_SOURCE_2026-11-26.md`.

Descobertas:
- O userscript Normal extraído do runtime é idêntico ao `master/UpStatus.user.js` após normalizar apenas project refs e publishable key.
- O template do backend Normal não é equivalente ao runtime: há diferenças de comportamento em chat, upload assinado, avatar, administração e páginas de convidados.
- Para o backend beta, `beta/3.1.1-beta8-loader-fix` é o candidato versionado mais próximo entre as branches examinadas (8 regiões de divergência por comparação de linhas), mas ainda não é fonte idêntica.
- A função beta implantada tem slug beta10, mas executa e embute beta8, e o userscript beta8 aponta internamente para o endpoint beta8. Preservar os nomes/URLs até rastrear o histórico e a utilização pelos clientes.

Nenhuma refatoração de aplicação foi iniciada. O próximo passo é rastrear commits da linha beta8 e mapear contratos HTTP completos antes de escrever testes de caracterização.


## Correção importante — dois projetos Supabase

A investigação posterior identificou dois projetos Supabase:
- Projeto original `UpStatus` (`dlfvkawaiqduhlazsszm`), com `upstatus` implantação v480, `upstatus-test` v281, `upstatus-team-lite` v15 e diversas funções beta/backup.
- Projeto `upstatus-normal` da organização `UpStatus Revived` (`mvjqunhjxkbfcrxkjtgf`), criado em 2026-11-25, com apenas três funções centrais.

Os runtimes Normal 3.4.7 dos dois projetos são idênticos após normalizar o project ref e o userscript embutido. Os userscripts também são idênticos após normalizar project ref e publishable key pública. Os backends beta10/beta8 têm uma diferença na ordem de precedência da chave administrativa. Os bundles originais foram preservados em `recovery/runtime-2026-11-26/original-project-*/`.

A documentação detalhada está em `docs/SUPABASE_ENVIRONMENT_RECONCILIATION_2026-11-26.md`.

**Consequência:** ainda não está provado que Revived substituiu completamente o projeto original. Não remover, desativar ou refatorar funções do projeto original; primeiro identificar uso real e status do cutover. A cópia Revived parece cobrir os runtimes Normal e beta centrais, mas não replica Team Lite, TEST e backups.

## Evidência histórica relevante

A PR #26 documenta um candidato TEST beta.8 separado, implantado somente em `upstatus-test` no projeto original. Seu corpo registra explicitamente que a produção `upstatus` permaneceu ativa e não foi alterada. Isso reforça que branches e candidatas beta/test não podem ser tratadas como fonte da produção Normal.



## Inventário ampliado de runtimes ativos do projeto original

Além de Normal e beta10, foram lidos e preservados:
- `upstatus-test` implantação v281 / versão declarada 3.3.28;
- `upstatus-team-lite` implantação v15 / versão declarada 3.4.30;
- `upstatus-screen-share-3-1-1-beta8` implantação v2 / versão declarada 3.1.1-beta8.

A função beta10 embute um userscript beta8 que aponta para o slug beta8. Esse slug existe no projeto original, mas não existe em Revived. O projeto Revived também não contém TEST nem Team Lite. Portanto o novo projeto não replica todos os runtimes e dependências do original.

A branch `team-lite/3.4.31-candidate` foi comparada com o Team Lite ativo 3.4.30 e apresentou muitas diferenças comportamentais. Não é substituta comprovada.

Detalhes e snapshots em `docs/SUPABASE_ENVIRONMENT_RECONCILIATION_2026-11-26.md` e diretórios `recovery/runtime-2026-11-26/original-project-*/`.


## Marco técnico — baseline Normal recuperada

Foi criado `src/server/normal-3.4.7.recovered.template.ts`, a partir do snapshot do runtime original. Ele parametriza apenas versão, userscript Base64 e HTML Ycaro.

A reconstrução integral foi comparada com o snapshot original do Supabase: **894.196 caracteres, igualdade exata**. Isso estabelece uma fonte reproduzível do backend Normal 3.4.7, sem depender do template divergente de `master`.

Foi criado o verificador offline `scripts/verify-normal-runtime-recovery.mjs`, que escreve somente em `dist/recovered-normal-3.4.7/index.ts` e compara o resultado ao snapshot. Workflow dedicado adicionado em `.github/workflows/verify-runtime-recovery.yml`. O CI ainda não foi confirmado; a igualdade foi verificada diretamente no processo de reconstrução.

Auditoria dos limites de módulos: `docs/MODULE_BOUNDARY_AUDIT_2026-11-26.md`. A primeira extração sugerida é de helpers HTTP puros, depois do CI verde. Nenhum módulo funcional foi movido ainda.


## Primeira reorganização de código concluída, sem alteração funcional

O backend Normal 3.4.7 recuperado foi dividido em 13 fragmentos nomeados em `src/server/normal-3.4.7/fragments/`. A ordem é fixa e documentada no README da pasta. Os fragmentos mantêm o mesmo escopo lexical e não alteram nenhuma função ou contrato; são uma etapa intermediária antes de módulos ES isolados.

Verificação direta:
- 13 fragmentos montam exatamente o template recuperado (105.120 caracteres).
- A renderização final gera 894.196 caracteres.
- O resultado é exatamente igual ao snapshot do runtime original, sem diferença de conteúdo.

O script `scripts/verify-normal-runtime-recovery.mjs` agora verifica fragmentos → template → runtime snapshot e escreve somente em `dist/`. O workflow offline foi ajustado para disparar também quando os fragmentos mudarem. Ainda não foi possível confirmar o resultado do GitHub Actions nesta execução.

**Estado:** primeira divisão estrutural feita e igualdade exata comprovada; nenhuma mudança de lógica, produção ou banco. Próxima etapa: executar o verificador no CI e então extrair helpers HTTP como primeiro módulo real com dependências explícitas.


## Contratos HTTP Normal 3.4.7 mapeados

Foi criado `docs/NORMAL_347_HTTP_CONTRACTS_2026-11-26.md` com rotas públicas, autenticadas, convidados, métodos e guardrails. Esse mapa deve ser usado como contrato para a próxima etapa; paths, métodos, payloads, status HTTP, cookies, headers, buckets, autorização e tópicos Realtime não podem mudar durante a refatoração.


## Primeiros módulos reais extraídos

Foram extraídos dois módulos com dependências explícitas:
- `modules/http.js`: `response` e `readBody`, com CORS injetado.
- `modules/state.js`: `stateValue` e `setState`, com o cliente DB injetado.

Testes offline para ambos passaram localmente em Node v22.16.0, usando apenas Request/Response nativos e DB falso. O builder `scripts/build-normal-modular-candidate.mjs` monta um candidato isolado em `dist/modular-normal-candidate/`. A reversão dos dois blocos e imports restaura exatamente o template original, provando que o restante do código não foi alterado.

O workflow dedicado foi ampliado para executar os testes e gerar o candidato. Ainda não há confirmação de execução do GitHub Actions. Nenhum arquivo em `supabase/functions` foi alterado; nenhum deploy ou acesso ao Supabase foi realizado.


## Terceiro módulo real extraído

Foi isolado `modules/auth-crypto.js` com `tokenHash`, `passwordHash` e `checkPassword`, recebendo por injeção as mesmas primitivas de `node:crypto` e `Buffer`. O algoritmo scrypt, salt, formato `salt:hash` e comparação timing-safe foram preservados.

O teste `scripts/test-normal-auth-crypto.mjs` passou localmente em Node v22.16.0. O builder modular agora extrai HTTP, state e auth crypto; uma reversão dos três blocos e imports reconstrói exatamente o template recuperado. O candidato segue isolado em `dist/`, não publicado.


## Quarto módulo real extraído: sessões Lucca/Ycaro

Foi criado `modules/guest-sessions.js` com cookies, tokens Bearer, leitura/expiração de estado e mensagens de saída. DB, state store e randomBytes são injetados. Os mesmos cookies, chaves de estado, limite de 12 segundos, mensagens e system_type foram preservados.

O teste offline `scripts/test-normal-guest-sessions.mjs` passou localmente em Node v22.16.0. O builder modular agora extrai quatro blocos: HTTP, state, auth crypto e guest sessions. A reversão dos quatro blocos e imports reconstrói exatamente o template recuperado. O candidato permanece isolado em `dist/`.


## Quinto módulo real extraído: roster de membros

Foi isolado `modules/members.js` com a consulta ao roster oficial e seu cache de 10 segundos. A allow-list e o formato de resposta permanecem iguais. O cache agora pertence à instância criada uma vez no runtime, preservando o ciclo de vida anterior.

O teste `scripts/test-normal-members.mjs` passou localmente em Node v22.16.0 com DB falso. O builder modular agora extrai cinco blocos (HTTP, state, auth crypto, guest sessions e members); a reversão dos cinco blocos e imports reconstrói exatamente o template original.


## Sexto módulo real extraído: saúde, status e histórico

Foi criado `modules/status.js` com `healthRoute`, `statusRoute` e `historyRoute`, recebendo DB, helpers HTTP, account/admin e versão por injeção. Foram preservados os contratos de autorização, presença de 15s, cabeçalho de versão, validação de status, actor/target e limite de histórico.

O teste offline `scripts/test-normal-status.mjs` passou localmente em Node v22.16.0 usando DB falso. O builder modular agora extrai seis módulos reais, e a reversão dos seis blocos e imports reconstrói exatamente o template original.


## Sétimo módulo real extraído: status remoto

Foi isolado `modules/remote-status.js` com fila e resultados remotos. State store, autorização, HTTP, roster e randomBytes são injetados. O registro continua em `upstatus_state` / `remote-status`; regras de admin, target, status, motivo, IDs e respostas foram preservados.

O teste offline `scripts/test-normal-remote-status.mjs` passou localmente em Node v22.16.0. O builder modular agora extrai sete módulos reais e a reversão dos sete blocos e imports reconstrói exatamente o template original.


## CI confirmado

O workflow dedicado `Verify Recovered Normal Runtime` passou integralmente no GitHub Actions (run #29, commit `c68a199`). Passaram: reconstrução exata do snapshot, seis testes de módulos e build do candidato modular isolado.

O workflow legado `UpStatus Validate` continua falhando em `scripts/validate.mjs:26` por `production updateURL mismatch`. Nenhum arquivo de build/validação/release foi alterado nesta reorganização; essa falha é separada e não foi mascarada. Deve ser tratada em trabalho próprio depois de reconciliar as URLs de distribuição.

**Marco:** baseline recuperada + sete módulos extraídos + testes offline e build isolado verdes. Nenhum deploy, alteração Supabase ou mudança de runtime.
