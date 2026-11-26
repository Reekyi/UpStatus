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


## Oitavo módulo real extraído: dados do chat

Foi isolado `modules/chat-data.js` para menções e leitura/normalização de mensagens. Foram preservados `@todos`, deduplicação de menções, janela de 48h, limites de 200/1.000 mensagens e shape de resposta. O teste offline `scripts/test-normal-chat-data.mjs` passou localmente em Node v22.16.0 com DB falso.

O builder modular agora extrai oito módulos e a reversão dos oito blocos e imports restaura exatamente o template recuperado. Os handlers de chat que escrevem/alteram mensagens ainda não foram extraídos, por serem a parte mais sensível para desempenho e comportamento.


## Nono módulo real extraído: mídia e perfis

Foi criado `modules/media.js` para perfis, decodificação Data URL, detecção MIME, extensões e upload Storage. DB e randomBytes são injetados. Foram preservados buckets, assinaturas de arquivos, erros, cacheControl e upsert.

O teste offline `scripts/test-normal-media.mjs` passou localmente em Node v22.16.0 usando Storage falso. O builder modular agora extrai nove módulos reais e a reversão dos nove blocos e imports reconstrói exatamente o template original.


## Décimo módulo real extraído: contexto de autenticação

Foi criado `modules/auth-context.js` para resolução de usuário normal, Lucca, Ycaro ou ausência de sessão. A ordem, expiração prévia de convidados, short-circuit e formato `{ name, guest, joinedAt }` foram preservados.

O teste offline `scripts/test-normal-auth-context.mjs` passou localmente em Node v22.16.0. O builder modular agora extrai dez módulos reais e a reversão dos dez blocos e imports reconstrói exatamente o template original.


## CI atualizado: 10 módulos verdes

O workflow dedicado passou no GitHub Actions (run #60). Foram aprovados a reconstrução exata do Normal 3.4.7, os dez testes de módulos e o build isolado do candidato modular.

O workflow legado continua com a falha conhecida de `production updateURL mismatch` em `scripts/validate.mjs:26`; nenhum arquivo de build/release foi alterado para mascarar essa divergência.

## Décimo primeiro módulo real extraído: rota principal de chat

Foi isolado `modules/chat-route.js`, cobrindo leitura normal/rápida, contagem de não lidas, perfis, digitação, presença Lucca e criação de mensagens com menções/resposta.

Antes de aceitar a extração, o bloco completo foi comparado diretamente com `src/server/normal-3.4.7/fragments/08-chat-routes.part`: **4.384 caracteres, igualdade exata**. A extração apenas encapsula o mesmo bloco em uma factory e injeta DB, helpers, leitura de chat, menções, expiração Lucca e randomBytes. O builder continua verificando que a reversão dos onze blocos restaura o template integralmente.

Foi adicionado `scripts/test-normal-chat-route.mjs`, com mocks do DB e verificações dos modos fast/normal, recibos de leitura, não lidas, resposta e envio. O workflow offline agora executa esse teste antes de gerar o candidato isolado.

A comparação estática também confirmou os contratos do bloco original: GET normal/fast, overlap de 2s, TTL typing de 4,5s, janela de 48h, recibos, não lidas, limites, tipos de anexo, replies e escrita em `messages`. O handler retorna HTTP 405 para métodos diferentes de GET/POST, alinhado ao dispatch original.

**Validação pendente:** o CI mais recente ainda é do commit anterior à extração de chat. O workflow dedicado passou no run #68; o teste de chat precisa de execução no novo HEAD. O `UpStatus Validate` legado continua falhando pela divergência conhecida `production updateURL mismatch` em `scripts/validate.mjs:26`, sem relação com esta refatoração.

Nenhum deploy, Supabase write, migration, alteração de schema, RLS, secrets, workflow de deploy ou runtime ativo foi realizado.

## Validação do décimo primeiro módulo — CI verde

Após corrigir a fronteira entre os ramos GET e POST no módulo extraído e ajustar uma expectativa incorreta no teste de fallback `since` inválido, o workflow `Verify Recovered Normal Runtime` passou no GitHub Actions para o HEAD `d4ae058db56550fa4c75896cb240ce2593566724` (run #82).

O run confirmou: reconstrução exata do runtime original; os onze testes de módulos; e geração do candidato modular isolado. Em particular, o teste da rota de chat passou cobrindo polling normal/rápido, estado de leitura, envio, anexo, reply e validações. O builder ainda valida a reversão dos onze blocos para o template original antes de escrever em `dist/modular-normal-candidate/`.

O workflow legado `UpStatus Validate` continua sendo acompanhado separadamente; sua falha histórica é a divergência `production updateURL mismatch`, não a validação estrutural do runtime recuperado.

O PR permanece Draft. Nenhuma integração, deploy ou alteração no Supabase foi feita.

## Décimo segundo módulo real extraído: rotas de mídia e perfil

Foi isolado `modules/media-routes.js`, com as rotas de perfil/avatar, upload direto de imagem/áudio/documento e geração de URL assinada para upload. As dependências de resposta HTTP, leitura do body, Storage, DB, helpers de mídia, bytes aleatórios e URL do projeto são injetadas. O corpo das três rotas foi preservado a partir do fragmento original; somente anotações de tipo TypeScript foram removidas para que o módulo seja JavaScript executável pelo Node usado nos testes.

Foi adicionado `scripts/test-normal-media-routes.mjs`, cobrindo GET de perfis, upload de avatar e upsert, limites por tipo de mídia, upload de vídeo/áudio, sanitização de nome, bucket de avatar, resposta assinada, rejeição de MIME/tamanho inválido e divergência de path retornado pelo Storage.

O builder agora extrai/restaura as três rotas, importa o factory no candidato modular e valida que a reconstrução integral do template não sofreu alterações fora dos blocos extraídos.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `469649df8a1d5151263cd40faf1ff39d8d572fa2` (run #85). Reconstrução exata, testes dos doze módulos e build isolado do candidato passaram. O workflow legado `UpStatus Validate` continua falhando separadamente por `production updateURL mismatch`.

Nenhum deploy, alteração no Supabase, migration, schema, RLS, secrets ou runtime ativo foi realizado. A PR continua Draft.


## Décimo terceiro módulo real extraído: rotas HTTP de convidados

Foi isolado `modules/guest-routes.js`, cobrindo os endpoints Lucca e Ycaro de login, consulta de sessão, heartbeat e logout. O módulo recebe por injeção os helpers HTTP, estado/sessão, DB, geração de bytes aleatórios, leitura das senhas de ambiente e `EdgeRuntime.waitUntil`.

Foram preservados os caminhos e normalização de URL, nomes de cookies, atributos `HttpOnly; SameSite=Lax; Secure`, validade de 24 horas, payloads, códigos HTTP, verificação de senha, persistência de sessão e mensagens de entrada/saída em background. As senhas continuam sendo lidas de `LUCCA_PASSWORD` e `YCARO_PASSWORD` no runtime, sem copiar ou registrar valores em arquivos.

Foi adicionado `scripts/test-normal-guest-routes.mjs`, cobrindo senha incorreta, login, cookie, token, estado online, mensagem de entrada, endpoint `me`, heartbeat autorizado e não autorizado, logout, limpeza do cookie e rota inexistente para ambos os convidados. O workflow dedicado executa esse teste antes de gerar o candidato modular.

A extração é estrutural: o builder remove os dois handlers do template e os restaura antes de comparar o resultado integral, exigindo igualdade exata do template fora dos blocos extraídos. O candidato permanece isolado em `dist/modular-normal-candidate/`.

**Validação:** o GitHub Actions `Verify Recovered Normal Runtime` passou no HEAD `6d338e7c96cd1e12c27bbfacffc1d3b50224c1b5` (run #111). A reconstrução exata do runtime, os treze testes de módulos e o build do candidato modular isolado passaram. O primeiro run desta extração apontou apenas um matcher incorreto no teste de autorização; o fixture foi corrigido e o run #111 passou integralmente. O workflow legado `UpStatus Validate` continua falhando separadamente por `production updateURL mismatch` em `scripts/validate.mjs:26`.

O PR permanece Draft. Nenhum deploy, alteração no Supabase, migration, schema, RLS, secrets ou runtime ativo foi realizado.


## Décimo quarto módulo real extraído: rotas de interação do chat

Foi isolado `modules/chat-interaction-routes.js`, cobrindo leitura/recibos, presença de digitação, reações, edição e exclusão de mensagens. DB, helpers HTTP, leitura do body e verificação administrativa são injetados.

Foram mantidos os contratos de `chat_reads`, limite de 1.000 IDs, exclusão de auto-leitura dos recibos, TTL de digitação de 4,5 segundos, allow-list de emojis, alternância de reações, validações de edição, propriedade da mensagem e regra administrativa de exclusão. O handler original considera Ricardo administrador diretamente; o teste de negação usa outro usuário para não confundir essa regra com o callback administrativo.

Foi adicionado `scripts/test-normal-chat-interaction-routes.mjs`, com DB encadeável falso e testes para recibos, digitação GET/POST, adicionar/remover reações, edição e exclusão permitida/negada. O builder extrai os cinco handlers e exige reconstrução exata do template ao restaurá-los.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `c1d823d5080e7ba3ee1b412814a057e733fd8781` (run #122). Reconstrução exata, quatorze testes de módulos e build isolado do candidato modular passaram. Os dois primeiros runs desta extração revelaram apenas lacunas no mock de teste (`maybeSingle` ausente e identidade Ricardo já privilegiada); os fixtures foram corrigidos antes do run verde.

Nenhum deploy, Supabase write, migration, alteração de schema/RLS/secrets ou runtime ativo foi realizado. O PR continua Draft.


## Décimo quinto módulo real extraído: núcleo de autenticação

Foi isolado `modules/auth-core.js`, contendo resolução de sessão por token, consulta de contas, verificação de administrador, criação de sessão e login/setup. As dependências de DB, cache de sessão, leitura do token, hash de token, aleatoriedade, helpers HTTP e verificação/hash de senha são injetadas.

Foram preservados:
- Cache de sessão em memória, expiração e janela de revalidação de 30 segundos.
- Consulta por `token_hash`, remoção de sessões expiradas e persistência no cache.
- Seleção de campos da tabela `users` e regra de role `implementation_admin`.
- Limpeza de sessões expiradas antes de criar nova sessão.
- Token aleatório de 32 bytes, hash persistido e validade de 30 dias.
- Validação de login/setup, mensagens e códigos HTTP.
- Regra de role inicial: Ricardo, Lohan e Guilherme recebem `implementation_admin`; demais contas recebem `implementation_user` quando não há role preexistente.

Foi adicionado `scripts/test-normal-auth-core.mjs`, cobrindo cache quente/expirado, lookup de sessão no DB, expiração persistida, conta/admin, login válido/inválido, setup já configurado, setup inicial de equipe e usuário comum, além da criação de sessão.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `d854e399aeb06d7599aa2f288691f2c655ef08f9` (run #134). Reconstrução exata, quinze testes de módulos e build isolado do candidato modular passaram. O workflow legado `UpStatus Validate` segue falhando separadamente por `production updateURL mismatch`, já conhecido e não mascarado.

Nenhum deploy, Supabase write, migration, alteração de schema/RLS/secrets ou runtime ativo foi realizado. O PR continua Draft.


## Décimo sexto módulo real extraído: endpoints de autenticação

Foi isolado `modules/auth-routes.js`, reunindo:
- `accountRoute`: consulta se uma conta ainda precisa de configuração;
- `meRoute`: resposta do contexto autenticado, role e permissões;
- `logoutRoute`: remoção do token persistido e do cache local.

As dependências são injetadas: resposta HTTP, consulta de conta, DB, extração do token, hash do token e cache compartilhado. O dispatcher mantém os mesmos caminhos, métodos e posição relativa das verificações de autenticação.

Foi adicionado `scripts/test-normal-auth-routes.mjs`, cobrindo conta configurada/não configurada/inexistente, payload de `/api/me` para anônimo/admin/usuário sem setup, logout com token e logout sem token.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `305c2038f52361242c177ed51748e8d424bdabf1` (run #145). Reconstrução exata, dezesseis testes de módulos e build isolado do candidato modular passaram. O primeiro build desta extração detectou que três blocos inline ainda precisavam ser reinseridos no comparador de equivalência; os marcadores de restauração foram adicionados e a execução posterior passou.

Nenhum deploy, Supabase write, migration, alteração de schema/RLS/secrets ou runtime ativo foi realizado. O PR continua Draft.


## Décimo sétimo módulo real extraído: manutenção do chat

Foi isolado `modules/chat-maintenance.js`, com o handler de limpeza do chat. O módulo mantém a autorização exclusiva de Ricardo, leitura e exclusão das mensagens, identificação de objetos do bucket `chat-images`, filtragem de caminhos inválidos, remoção em lotes de 100 e inserção da mensagem de sistema após a limpeza.

O cliente DB, URL do projeto, gerador aleatório, resposta HTTP e logger são injetados. Não houve mudança em bucket, prefixo de Storage, tabela, payload ou texto da mensagem.

Foi adicionado `scripts/test-normal-chat-maintenance.mjs`, cobrindo bloqueio de usuário comum, deduplicação e filtragem de caminhos, lotes de Storage, falha parcial de remoção, mensagem de sistema e propagação de erros de leitura/exclusão.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `f3a188cdb30b2323b06d0ca7d47835b6decb424e` (run #154). Reconstrução exata, dezessete testes de módulos e build isolado do candidato modular passaram. O workflow legado `UpStatus Validate` continua falhando separadamente na divergência conhecida de `production updateURL mismatch`.

Nenhum deploy, Supabase write, migration, alteração de schema/RLS/secrets ou runtime ativo foi realizado. O PR continua Draft.


## Marco de integração: candidato modular real emitido

O builder agora preserva duas versões durante a validação:
1. `modularSource`: fonte com imports ES modules e factories de dependências injetadas;
2. `source`: versão temporariamente restaurada, usada para provar que reverter extrações/imports recompõe o template recuperado exatamente.

Após a comparação exata, o artefato em `dist/modular-normal-candidate/index.ts` é gerado a partir de `modularSource`, não da versão restaurada. O build também verifica que o candidato difere do monolito, que todos os 17 imports de módulos estão presentes e que todos os módulos são copiados para o diretório isolado.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `79ed055a3d441ff3f481dc6fa5d98f44f9d6abd4` (run #157). Os testes de módulos, prova de reconstrução exata e geração do candidato modular integrado passaram.

Este é um candidato offline para revisão, não um deploy nem prova de execução em produção. A próxima etapa é validação de sintaxe/tipos e caracterização integrada do entrypoint modular. O entrypoint Deno, dispatch global, HTML embutido e boundary de erros continuam preservados; não foram reescritos. Nenhum deploy ou alteração no Supabase/runtime ativo foi realizado.


## Validação estrutural ampliada: parse e bundle do candidato

O builder passou a validar explicitamente as 17 chamadas de factory, além dos 17 imports. O workflow dedicado adicionou um passo de parse/bundle com esbuild para o entrypoint modular e todo o grafo local de módulos. Isso complementa a prova de reconstrução exata: não basta reverter para o original, a versão modular emitida também precisa formar um grafo de módulos sintaticamente válido.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `cc44f6378f49ca2f950bffee144ce6449218557a` (run #161). Build do candidato, 17 testes, imports/factories e parse/bundle passaram.

A documentação `src/server/normal-3.4.7/README.md` foi atualizada com a lista dos 17 módulos e os limites do entrypoint. `docs/MODULE_BOUNDARY_AUDIT_2026-11-26.md` agora registra o estado atual e distingue parse/bundle de execução integrada.

Próximo gate: caracterização integrada do entrypoint com dependências simuladas e comparação de contratos HTTP. Não extrair o dispatcher apenas para aumentar a contagem de módulos. Nenhuma ação Supabase/deploy foi realizada.


## Caracterização integrada de módulos e dispatcher

Foi adicionado `scripts/test-normal-modular-integration.mjs`, que compõe os factories reais de HTTP, state store, auth crypto/core, guest sessions, auth context e auth routes com um DB em memória. O teste percorre setup/login, persistência de sessão, resolução de usuário autenticado, resposta de `/api/me`, logout/invalidação de cache e resolução de sessão Lucca via cookie. Nenhuma conexão Supabase é aberta.

O builder também passou a exigir marcadores explícitos do dispatcher: entrypoint `Deno.serve`, rotas de convidado, setup/login, account/me/logout, autorização, status/histórico, chat/interações, mídia, remote status e limpeza do chat. Assim, a emissão modular falha se algum factory deixar de estar ligado ao fluxo HTTP existente.

**Validação:** `Verify Recovered Normal Runtime` passou no HEAD `556f60fcb642706bccb3e8a30ab576d96896b633` (run #173). A caracterização integrada, 17 testes unitários, prova de reconstrução exata, verificações de wiring do dispatcher e parse/bundle do grafo modular passaram.

O teste integrado cobre composição de autenticação e convidados; não deve ser confundido com teste completo de todos os endpoints ou execução Deno em produção. O próximo passo é ampliar contratos integrados por domínio, mantendo o dispatcher no entrypoint. Nenhum deploy ou Supabase write foi realizado.

## Caracterização integrada do chat

Foi adicionado `scripts/test-normal-chat-integration.mjs`, compondo os módulos reais de roster/cache de membros, normalização e consulta de mensagens, rota principal de chat e rotas de interação com um DB em memória. O fluxo cobre roster oficial ordenado, criação de mensagem com menções (`@nome` e `@todos`), leitura de histórico e perfis, contagem de não lidas, read receipts, sincronização rápida, reação, edição e exclusão com autorização. O teste não conecta ao Supabase.

A primeira execução encontrou apenas uma expectativa de ordenação incorreta no próprio teste: `members()` aplica `.order("name")`, portanto `@todos` segue a ordem alfabética retornada pelo banco. A expectativa foi corrigida sem alterar código de runtime.

**Validação:** `Verify Recovered Normal Runtime` passou no run #179, commit `b82154a8e887062087c6cf9bd951c06a0343e73e`. Passaram reconstrução byte a byte, 17 testes individuais, integração auth/guest, integração do chat, build modular real e parse/bundle com esbuild. O workflow legado `UpStatus Validate` continua uma verificação separada e não é mascarado.

O teste integrado cobre o caminho de chat e suas interações em dependências simuladas; ainda não prova execução completa do dispatcher Deno nem integração com o Supabase real. Próxima etapa: caracterização integrada de mídia e status, depois contratos HTTP/erros/headers/cookies e validação de runtime em ambiente isolado. Nenhum deploy, Supabase write ou alteração do runtime ativo foi realizado.

## Integração de mídia e status concluída

Foram adicionados dois testes de composição com dependências simuladas:
- `scripts/test-normal-media-integration.mjs`: combina media store e media routes; cobre mapa de perfis, upload direto de avatar/imagem, validação de MIME, URL assinada, token, bucket, caminho sanitizado e limites de arquivo.
- `scripts/test-normal-status-integration.mjs`: combina status handlers e remote status; cobre alteração de status, histórico, leitura de membros/presença, health check, fila de comando remoto, confirmação e consulta de resultado.

Ambos foram integrados ao workflow dedicado. A validação inicial revelou duas expectativas incorretas no teste de mídia (boundary de erro pertence ao dispatcher e o segundo argumento de mediaRoute é o tipo de mídia); as expectativas foram corrigidas sem alterar módulos de runtime.

**Validação:** `Verify Recovered Normal Runtime` passou no run #189, commit `17bfe9a788c6fd2ddcdf82962edd8e8ad2fcf64d`. Passaram recuperação exata, 17 testes individuais, integrações auth/guest, chat, mídia e status, build do candidato modular e parse/bundle com esbuild.

A cobertura integrada agora atravessa os principais domínios funcionais com DB/Storage simulados. Ainda não representa execução completa do dispatcher Deno nem validação contra Supabase real. Próximo gate: contratos HTTP transversais (status codes, headers, cookies, payloads e boundary de erros), depois execução Deno isolada. Nenhum deploy, Supabase write ou alteração do runtime ativo foi realizado.

## Contrato e precedência do dispatcher HTTP

O builder `scripts/build-normal-modular-candidate.mjs` foi fortalecido para verificar não apenas a presença das rotas, mas também sua ordem efetiva dentro de `Deno.serve`. A auditoria agora cobre preflight OPTIONS, entrega do userscript, normalização do path, endpoints públicos, páginas Lucca/Ycaro, rotas de convidado, setup/login, resolução de contexto, `/api/me` antes da exigência de autenticação, logout, rotas autenticadas por domínio, fallback 404 e boundary global de erro 500.

A primeira execução da nova verificação identificou uma colisão de texto com blocos JavaScript embutidos no HTML de convidado: o primeiro `catch` encontrado não era o boundary do dispatcher. Ajustei a auditoria para localizar o `catch` final do `Deno.serve`, sem modificar o runtime. A execução seguinte passou.

**Validação:** `Verify Recovered Normal Runtime` passou no run #196, commit `bf458086b479cb9d54798e8ad192c61017f961ea`. Recuperação exata, 17 testes individuais, quatro integrações por domínio, build modular e parse/bundle passaram. O workflow legado `UpStatus Validate` permanece uma falha independente por `production updateURL mismatch`.

A verificação da ordem é estática e complementa, mas não substitui, execução do dispatcher Deno. Próximo gate: exercitar o entrypoint em Deno isolado com Supabase/EdgeRuntime simulados, sem credenciais ou writes reais. Nenhum deploy, Supabase write ou alteração do runtime ativo foi realizado.

## Execução real do entrypoint em Deno isolado

Foi criado `scripts/deno-entrypoint-test/` com um import map que substitui `npm:@supabase/supabase-js@2` por um cliente falso em memória. O harness executa o candidato modular construído, inicia o `Deno.serve` real em `127.0.0.1:8000`/`0.0.0.0:8000` e faz requisições HTTP reais ao processo Deno. O escopo de rede é limitado ao servidor local e as únicas variáveis de ambiente são valores fictícios de teste.

Cobertura exercitada no entrypoint real: `/health` e seus headers JSON/CORS, preflight OPTIONS, `/api/me` sem autenticação, bloqueio 401 em rotas protegidas, precedência do gate de autenticação sobre o 404 protegido, `/api/account`, roster público, entrega do userscript, páginas HTML de Lucca/Ycaro e boundary global de erro 500 quando o cliente Supabase simulado falha.

**Validação:** `Verify Recovered Normal Runtime` passou no run #207, commit `223a24564b35649130b8c1ad66a72ffeeab470e7`. Passaram recuperação exata, 17 testes individuais, quatro integrações de domínio, build do candidato, execução Deno isolada e parse/bundle esbuild. A primeira execução do harness encontrou diferença na ordenação do roster simulado; o mock foi ajustado para respeitar `.order("name")`, sem mudança no runtime.

Este é o primeiro teste que executa o entrypoint Deno e o grafo modular em um servidor local real, mas com Supabase/Storage simulados. Não é teste contra o projeto Supabase real, nem deploy ou validação de Edge Runtime gerenciado. Próximo gate: ampliar o harness para setup/login e sessão autenticada no dispatcher, depois revisar contratos HTTP de rotas protegidas. Nenhum segredo real, Supabase write ou runtime ativo foi utilizado.

## Dispatcher Deno: autenticação e rotas protegidas

O harness de Deno foi ampliado para atravessar os endpoints reais do dispatcher com o cliente Supabase em memória. A cobertura agora inclui setup de conta e emissão de sessão, rejeição de senha incorreta, login, `/api/me` autenticado, logout e invalidação da sessão; status/presença, validação de status, histórico e health; comando remoto com leitura pendente, ACK por outro usuário e consulta do resultado; chat GET/POST, menções, leitura, typing, reação, edição e exclusão; upload direto de avatar/imagem e URL assinada; login/heartbeat/logout dos convidados Lucca e Ycaro, incluindo cookies; limpeza do chat e boundary global de erro.

O mock Supabase suporta as operações necessárias em tabelas locais e Storage falso. Nenhuma chamada de rede para Supabase é feita. Os testes criam dados apenas no processo de teste e usam senhas/segredos fictícios.

**Validação:** `Verify Recovered Normal Runtime` passou no run #219, commit `cc97676d3d482f583cdc6ff5e3bfe658726161c1`. Passaram recuperação exata, 17 testes individuais, quatro integrações de domínio, build modular, execução Deno HTTP ampliada e parse/bundle.

A execução cobre o entrypoint e os principais endpoints com DB/Storage simulados. Não cobre a integração de rede com Supabase real, concorrência/latência de produção, nem Edge Runtime gerenciado. Próximo gate: contratos HTTP negativos e autorização entre usuários/roles nos endpoints restantes, e revisar o comportamento do candidato sob cenários de falha do DB/Storage. Nenhum deploy, Supabase write ou runtime ativo foi tocado.

## Matriz de autorização, falhas e concorrência no Deno

O harness foi ampliado com uma conta de teste `Tester` (role `implementation_user`) além das contas de implementação/admin. A matriz comprova que a conta padrão não consulta health/histórico, não lê resultados nem cria comandos de status remoto, não altera ou exclui mensagens alheias e não limpa o chat. Também verifica que um admin de implementação diferente de Ricardo não ultrapassa a regra específica de `/api/chat/clear`, que permite somente Ricardo. Um usuário padrão consegue atualizar o próprio status, mas não consegue falsificar `actor`/`target` no histórico.

Foram adicionadas injeções determinísticas de falha no mock para DB e Storage. O entrypoint foi exercitado com JSON inválido, falhas de insert/upsert/select no DB, falha ao salvar imagem, falha ao gerar URL assinada e falha ao remover mídia. As respostas 500 e mensagens de erro foram verificadas; a limpeza de mídia mantém o comportamento existente de retornar sucesso com `removedFiles: 0` quando o Storage remove falha.

Cobertura adicional: `/api/update-info`, mapa de perfil, upload direto de imagem/documento/áudio/vídeo, MIME/tamanho inválido, senha e heartbeat de convidados inválidos e 12 mensagens concorrentes com IDs únicos.

**Validação:** `Verify Recovered Normal Runtime` passou no run #231, commit `c7afa1bc76f9ec5de19895852956ce4069df7dfa`, incluindo reconstrução exata, 17 testes individuais, quatro integrações, build modular, execução HTTP Deno ampliada e parse/bundle.

Toda a matriz continua usando DB/Storage em memória. Isso confirma os contratos exercitados no Deno local, não permissões reais do Supabase, isolamento RLS do projeto remoto ou comportamento sob carga de produção. Próximo gate: comparação diferencial do candidato modular contra a referência monolítica recuperada, para verificar equivalência HTTP nos mesmos cenários. Nenhum deploy, Supabase write ou runtime ativo foi tocado.

## Comparação HTTP diferencial: monólito recuperado × candidato modular

O builder agora gera dois artefatos isolados para testes: o candidato modular com 17 módulos e uma cópia de referência do monólito recuperado. A única diferença aplicada à referência é a porta local do `Deno.serve` (8001); versão, userscript, HTML e lógica de rotas são os mesmos artefatos recuperados. O harness inicia os dois servidores Deno em processos separados, cada um com mock Supabase próprio e dados iniciais equivalentes.

Antes dos testes extensos do candidato, o harness dispara os mesmos requests contra os dois servidores e compara status HTTP, headers relevantes e body byte a byte em health, `/api/me`, rotas protegidas sem sessão, account, members, update-info, userscript, páginas Lucca/Ycaro, prefixo `/upstatus`, preflight OPTIONS e credenciais de convidado inválidas.

**Validação:** `Verify Recovered Normal Runtime` passou no run #252, commit `72dbbd0868700a944a5113c703cd0749feea8de8`. Passaram reconstrução exata, 17 testes unitários, quatro integrações, geração dos dois servidores, comparação HTTP diferencial, matriz Deno de autorização/falhas/concorrência e parse/bundle.

A comparação diferencial atual cobre contratos públicos e sem autenticação; as rotas autenticadas continuam cobertas em profundidade pelo harness modular e testes integrados por domínio. Próximo passo: ampliar a comparação diferencial para fluxos autenticados determinísticos (setup/login, sessão, status e chat) e documentar o limite final de cutover. Nenhum deploy, Supabase write ou runtime ativo foi tocado.

## Comparação diferencial autenticada

O harness agora compara fluxos autenticados entre os dois servidores isolados, mantendo banco separado para cada um. Como as credenciais iniciais são diferentes entre os ambientes por construção, a conta Ricardo é criada com setup na referência monolítica e autenticada por login no candidato modular; a resposta é comparada após remover somente o token aleatório.

Foram comparados exatamente `/api/me`, mudança e leitura de status/presença, entrada específica no histórico, criação e interação de chat (read receipt, reação, edição e exclusão) e o ciclo de remote status (comando, leitura pendente, ACK por outra conta e consulta do resultado). Apenas IDs aleatórios e timestamps são normalizados; os demais campos e contratos são comparados. Os IDs de mensagem/comando de cada servidor são usados contra seu próprio servidor.

**Validação:** `Verify Recovered Normal Runtime` passou no run #261, commit `0692e9bd3fa854ecff5ae0a72c7f3ddcd534900d`. Passaram recuperação exata, 17 testes unitários, quatro integrações, build dos dois servidores, diferencial público e autenticado, matriz Deno completa e esbuild.

A evidência de equivalência agora cobre os fluxos públicos e os principais fluxos autenticados de negócio. Ainda faltam comparação diferencial de sessão/cookies dos convidados e uploads de mídia, além de validação com Supabase/Edge Runtime gerenciado real. Nenhum deploy, Supabase write ou runtime ativo foi tocado.

## Comparação diferencial de convidados e mídia

Foi ampliada a comparação entre os dois servidores para incluir o ciclo completo de Lucca e Ycaro: login válido, cookie `HttpOnly/SameSite/Secure`, consulta de sessão com cookie, heartbeat e logout/expiração do cookie. Corpos e atributos de cookie são comparados após normalizar apenas o token e o horário aleatórios.

Também comparamos o mapa de perfis, upload de avatar, upload direto de imagem/documento/áudio/vídeo, URL assinada para avatar e para chat. URLs e caminhos gerados são normalizados, enquanto tipo, MIME, bucket, tamanho, prazo e demais campos são comparados.

**Validação:** `Verify Recovered Normal Runtime` passou no run #268, commit `43eb054fe7d82fd1e872e3664e680e6617c94a4a`. Passaram recuperação exata, 17 testes unitários, quatro integrações, geração da referência monolítica, comparação HTTP pública/autenticada/convidados/mídia, matriz Deno e parse/bundle.

A comparação diferencial agora atravessa os principais fluxos de cada domínio. Ainda falta a revisão final de todos os contratos e uma validação operacional no Supabase/Edge Runtime gerenciado, que depende de ambiente e autorização externos. Nenhum deploy, Supabase write ou runtime ativo foi tocado.

## Matriz diferencial negativa e revisão final dos contratos HTTP

A matriz diferencial foi estendida para comparar, nos dois servidores, as respostas negativas de autorização e validação: usuário padrão em health/histórico/remote-status, administrador diferente de Ricardo em limpeza do chat, status inválido/sem motivo, mensagem vazia, reação inválida, tentativa de editar/excluir mensagem alheia, MIME de upload não permitido, arquivo acima do limite e heartbeat/login inválidos de Lucca/Ycaro. Também cobre conta inexistente, setup repetido (409), credenciais normais inválidas (401), health autenticado e fallback 404 com sessão válida.

**Validação:** `Verify Recovered Normal Runtime` passou no run #278, commit `a3aa766b00e30d6282bf26b85a9c9b5b8a242207`. Todos os 27 passos passaram: reconstrução exata, 17 testes de módulo, quatro integrações, geração do candidato e referência, matriz Deno completa (positiva/negativa e diferencial) e esbuild.

A auditoria offline da refatoração está concluída. Os gates restantes não são alterações de código desta PR: validação operacional no Supabase real/Edge Runtime gerenciado e decisão/aprovação de cutover. Esses gates não podem ser simulados como se fossem produção, nem executados sem autorização específica. Nenhum deploy, Supabase write, migration, alteração de schema/RLS/secrets ou runtime ativo foi realizado.
