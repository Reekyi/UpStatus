# UpStatus Normal 3.4.7 — auditoria de limites de módulos

**Base analisada:** snapshot do runtime original `dlfvkawaiqduhlazsszm/functions/v1/upstatus`, implantação v480, versão 3.4.7.  
**Arquivo de referência:** `recovery/runtime-2026-11-26/original-project-upstatus/index.ts`.  
**Objetivo:** planejar extrações mecânicas sem alterar comportamento, contratos HTTP, payloads, permissões, URLs ou estado.

## 1. Estrutura observada

O runtime tem aproximadamente 729 linhas de TypeScript legível, mais um userscript Normal de 544.057 caracteres embutido em Base64. O código servidor tem 47 funções nomeadas, com a maior concentração em chat e convidados.

| Área proposta | Funções atuais | Linhas aproximadas | Observações |
|---|---|---:|---|
| Runtime/entrypoint | `userscriptText`, CORS, `Deno.serve`, dispatch | 14–21, 631–729 | Manter o dispatch e o tratamento global de erros no entrypoint inicialmente. |
| HTTP/utilidades | `response`, `readBody`, `token`, `tokenHash`, `passwordHash`, `checkPassword`, `cookie` | 22–43, 239–243 | Primeira candidata a extração; funções pequenas, mas compartilhadas por vários módulos. |
| Autenticação | `userFromToken`, `account`, `admin`, `createSession`, `login`, `contextName` | 44–102, 326–336 | Depende de DB, token, resposta HTTP e cache de sessão. |
| Membros/status/histórico | `members`, `healthRoute`, `statusRoute`, `historyRoute` | 103–206 | Rotas separadas, com acesso a DB e autenticação. |
| Chat | `mentions`, `chatRows`, `chatRoute`, `readRoute`, `typingRoute`, `reactionRoute`, `editRoute`, `deleteRoute` | 207–229, 337–478 | Área de maior sensibilidade funcional e de desempenho. Não usar como primeira extração. |
| Estado compartilhado | `stateValue`, `setState` | 230–238 | Usado por convidados e remote-status; não duplicar em módulos. |
| Sessões de convidados | `luccaToken`, `luccaState`, `expireLucca`, `ycaroToken`, `ycaroState`, `expireYcaro`, `luccaRoute`, `ycaroRoute` | 244–277, 548–729 | Inclui rotas, sessões e HTML embutido. Manter separado do chat inicialmente, mesmo compartilhando mensagens. |
| Mídia/perfis | `profileMap`, `decodeDataUrl`, `sniffMime`, `ext`, `uploadFile`, `profileRoute`, `mediaRoute`, `signedUploadRoute` | 278–325, 479–517 | Uploads e permissões; precisa de testes de contrato antes de movimentar. |
| Remote status | `remoteRoute` | 518–547 | Usa estado compartilhado e verificação administrativa. |

## 2. Estado e dependências globais

O runtime mantém no escopo do módulo:
- `PROJECT_URL`;
- `secretKeys` e `ADMIN_KEY`;
- cliente Supabase `db`;
- `sessionCache`;
- `VERSION`;
- userscript embutido e helper de distribuição;
- CORS.

Não criar uma segunda instância de cliente Supabase nem caches duplicados ao modularizar.

A extração deve usar um único contexto de runtime, passado por injeção explícita aos módulos. O contexto deve expor somente o necessário: `db`, `PROJECT_URL`, versão, caches compartilhados e funções utilitárias. Isso evita ciclos de importação e mantém a mesma instância de estado.

## 3. Ordem de extração sugerida

1. **HTTP helpers puros:** `response`, `readBody`, `token`, `tokenHash`, `passwordHash`, `checkPassword`. Copiar sem alterar conteúdo, tipos, mensagens ou status HTTP.
2. **Estado compartilhado:** `stateValue` e `setState`, mantendo o mesmo storage key e sem alterar TTL/cache.
3. **Membros e status:** extrair `members`, `healthRoute`, `statusRoute`, `historyRoute` depois de registrar testes de entrada/saída.
4. **Remote status:** módulo isolado com dependência explícita do estado e da autorização.
5. **Perfis/mídia:** somente após caracterizar uploads existentes e as respostas que o cliente espera.
6. **Chat:** por último entre os módulos principais, pois concentra histórico, leitura, presença, notificações e desempenho.
7. **Convidados Lucca/Ycaro:** manter suas rotas e HTML como contratos separados; não alterar cookies, sessões, nomes de eventos ou mensagens.

## 4. Guardrails de extração

- Não trocar Base64 por HEX ou vice-versa durante a primeira reorganização.
- Não alterar ordem de fallback de credenciais.
- Não alterar endpoints, project refs, tópicos Realtime, nomes de buckets ou storage keys.
- Não "corrigir" permissões ou comportamentos existentes dentro da refatoração. Bugs e melhorias devem ser PRs separados.
- Não mudar SQL, schema, RLS, policies, grants, secrets ou configuração Supabase.
- Não tocar em `release.json`, `scripts/build.mjs` ou workflows de deploy nesta etapa.
- Cada extração deve manter o output do runtime byte a byte igual depois do processo de build, exceto por diferenças previamente autorizadas de ambiente.
- O primeiro módulo deve ser pequeno e sem estado. Se o build atual não permitir provar equivalência, não avançar para a extração seguinte.

## 5. Não usar como baseline sem reconciliação

- `master/src/server/index.template.ts`;
- `recovery/normal-runtime-destination-20261125/src/server/index.template.ts`;
- `fix/master-chat-paste-staging-20261114/src/server/index.template.ts`;
- `fix/normal-api-target-aligned-rate-limit-20261113/src/server/index.template.ts`.

Essas fontes contêm mudanças funcionais em relação ao runtime original, inclusive histórico por sessão, nome de arquivo em mensagens, administração, avatar e uploads assinados. São candidatas de desenvolvimento, não cópias exatas do runtime v480.

## 6. Gate para começar a extração

A primeira extração só deve começar depois de existir:
1. um template recuperado que reproduza o snapshot Normal 3.4.7;
2. um comando de build isolado que escreva somente em `dist/`;
3. um teste offline que compare o runtime gerado ao snapshot, normalizando somente project ref, publishable key e versão;
4. um teste de sintaxe e contratos estáticos;
5. confirmação de que o processo não acessa Supabase nem executa deploy.

A primeira entrega deve ser apenas reorganização estrutural. Nenhuma alteração de lógica ou melhoria funcional entra no mesmo diff.


## 7. Baseline recuperada e prova de reconstrução

Foi criado `src/server/normal-3.4.7.recovered.template.ts`, derivado diretamente do snapshot do runtime original v480. Foram parametrizados somente:
- versão `3.4.7`;
- userscript Base64 embutido;
- HTML Ycaro embutido.

O userscript usado é o extraído do runtime original; o HTML Ycaro vem de `ycaro.html`. A reconstrução foi verificada por comparação integral de strings no processo de análise: o arquivo gerado tem 894.196 caracteres e é exatamente igual ao snapshot original, sem diferença de byte após a codificação UTF-8.

Foi adicionado `scripts/verify-normal-runtime-recovery.mjs`, que repete essa prova em Node e escreve o artefato somente em `dist/recovered-normal-3.4.7/index.ts`. O script não acessa Supabase, não escreve em `supabase/functions` e não executa deploy.

Também foi adicionado o workflow `.github/workflows/verify-runtime-recovery.yml`, dedicado a executar apenas esse teste offline. O resultado do GitHub Actions ainda não foi confirmado nesta execução; a equivalência foi verificada diretamente durante a construção do baseline.

## 8. Próximo passo técnico

A primeira extração deve partir do template recuperado, não de `master/src/server/index.template.ts`. O módulo inicial recomendado continua sendo o conjunto de helpers HTTP puros, mas somente depois de executar o script Node no CI e registrar o resultado verde.


## 9. Primeira divisão estrutural concluída

O template recuperado foi dividido em 13 fragmentos ordenados em `src/server/normal-3.4.7/fragments/`. A divisão mantém exatamente o texto e a ordem originais; os arquivos usam extensão `.part` porque ainda compartilham o mesmo escopo lexical e não são módulos TypeScript independentes.

A montagem foi verificada diretamente:
- 13 fragmentos;
- 105.120 caracteres montados;
- igualdade exata com `src/server/normal-3.4.7.recovered.template.ts`;
- após renderizar versão, userscript Base64 e HTML Ycaro, o runtime gerado tem 894.196 caracteres e é exatamente igual ao snapshot original do Supabase.

O verificador Node foi atualizado para montar os 13 fragmentos, comparar com o template e comparar o runtime final com o snapshot. O workflow dedicado agora observa também `src/server/normal-3.4.7/**`.

Esta é uma reorganização estrutural de fonte, sem mudança de lógica. Ainda não foram criados imports, exports ou novos limites de estado; isso fica para a etapa seguinte, com injeção de dependências e testes específicos.


## 10. Primeiros módulos reais extraídos

Dois módulos pequenos foram extraídos do baseline:

### `modules/http.js`
- `createHttpHelpers(CORS)` fornece `response` e `readBody`.
- Não mantém estado nem acessa rede/DB.
- O CORS é injetado, mantendo o mesmo objeto e a mesma precedência de headers.

### `modules/state.js`
- `createStateStore(db)` fornece `stateValue` e `setState`.
- A instância Supabase é injetada, evitando criar um segundo cliente.
- Mantém a tabela `upstatus_state`, colunas `state_key`, `value`, `updated_at`, operação `maybeSingle` e conflito `state_key`.

Testes offline adicionados:
- `scripts/test-normal-http-helpers.mjs`;
- `scripts/test-normal-state-store.mjs`.

Ambos foram executados localmente com Node v22.16.0 e passaram. O state store usa DB falso em memória; nenhum Supabase foi chamado.

O builder `scripts/build-normal-modular-candidate.mjs` cria um candidato isolado em `dist/modular-normal-candidate/`, copia os módulos e prova que, ao reverter apenas os dois blocos extraídos e os imports, o restante do template recuperado permanece exatamente igual. A verificação dessa reversão foi executada diretamente e passou.

O candidato não foi publicado nem colocado em `supabase/functions`. O workflow dedicado inclui os dois testes e a montagem isolada, mas o resultado do GitHub Actions ainda não foi confirmado.


## 11. Terceiro módulo real — criptografia de autenticação

Foi extraído `modules/auth-crypto.js`, criado por `createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual })`. Ele fornece:
- `tokenHash`;
- `passwordHash`;
- `checkPassword`.

As primitivas criptográficas são injetadas, sem trocar algoritmos, parâmetros, encoding ou formato persistido `salt:hash`. O teste `scripts/test-normal-auth-crypto.mjs` cobre hash SHA-256, senha correta/incorreta, hash com salt fixo e aleatório e entradas inválidas. Executado localmente em Node v22.16.0: passou.

O builder foi atualizado para extrair os três blocos (HTTP, state e auth crypto) e agora reconstrói o template original exatamente quando os três blocos e os imports são revertidos. A verificação dessa reversão foi executada diretamente e passou. O candidato continua isolado em `dist/`, sem deploy.


## 12. Quarto módulo real — sessões de convidados

Foi extraído `modules/guest-sessions.js` com `createGuestSessionStore({ stateValue, setState, db, randomBytes })`. O módulo reúne:
- leitura de cookies e tokens Bearer;
- leitura de estado Lucca/Ycaro;
- expiração de sessão após o mesmo limite de 12 segundos;
- atualização do mesmo registro de estado;
- inserção das mesmas mensagens de saída no chat.

Estado, cliente DB e gerador aleatório são injetados. Os dois fluxos continuam separados, com os mesmos nomes de cookie, chaves de estado, mensagens, `system_type` e IDs aleatórios.

O teste `scripts/test-normal-guest-sessions.mjs` usa Request nativo, state store falso e DB falso; cobre cookies codificados, Bearer, expiração e não expiração. Executado localmente em Node v22.16.0: passou.

O builder agora extrai quatro blocos (HTTP, state, auth crypto e guest sessions). A reversão dos quatro blocos e imports reconstrói exatamente o template recuperado. A verificação direta foi executada e passou.


## 13. Quinto módulo real — roster oficial e cache

Foi extraído `modules/members.js` por meio de `createMembersStore(db)`. O módulo mantém:
- consulta à tabela `users`, coluna `name`, ordenação `name`;
- allow-list exata `Ricardo`, `Guilherme`, `Lohan`;
- formato de resposta `[{ name }]`;
- cache em memória com TTL de 10.000 ms.

O cache, antes global no entrypoint, agora pertence à instância do módulo, criada uma vez por runtime. Isso mantém o mesmo ciclo de vida e evita cache duplicado.

O teste `scripts/test-normal-members.mjs` passou localmente em Node v22.16.0. Cobre filtro, ordem, cache/TTL e erro do DB usando mock. O builder foi atualizado e a reversão dos cinco blocos extraídos restaura exatamente o template original.


## 14. Sexto módulo real — saúde, status e histórico

Foi extraído `modules/status.js` com `createStatusHandlers({ db, response, readBody, account, admin, version })`, fornecendo `healthRoute`, `statusRoute` e `historyRoute`.

Dependências explícitas:
- cliente Supabase existente;
- helpers HTTP existentes;
- `account` e `admin` existentes;
- versão do runtime.

Os contratos foram preservados: permissões, allow-list de saúde, cabeçalho `x-upstatus-version`, TTL de presença de 15 segundos, validação de status/motivo, regra de actor/target, tabela `status_history` e limite de histórico entre 1 e 500.

O teste `scripts/test-normal-status.mjs` passou localmente em Node v22.16.0 com DB falso. Cobre bloqueio de saúde, GET de presença, POST inválido, atualização com actor/target e clamp do histórico.

O builder foi atualizado para seis módulos reais e a reversão dos seis blocos mais imports reconstrói exatamente o template original. Nenhuma chamada ao Supabase foi feita pelos testes.


## 15. Sétimo módulo real — fila de status remoto

Foi extraído `modules/remote-status.js` com `createRemoteStatusHandler({ stateValue, setState, admin, response, readBody, members, randomBytes })`.

O módulo mantém a fila e o resultado no mesmo registro `upstatus_state` / `remote-status`, os mesmos nomes de campo, regras de administrador, validação de target/status/reason, geração de ID e mensagens de erro. Não cria tabelas nem executa operações adicionais.

O teste `scripts/test-normal-remote-status.mjs` passou localmente em Node v22.16.0 usando mocks. Cobre leitura de fila, autorização, resultado inexistente, conclusão de comando e criação de comando remoto.

O builder agora extrai sete módulos reais e a reversão dos sete blocos e imports restaura exatamente o template original.


## 16. CI confirmado

O workflow dedicado `Verify Recovered Normal Runtime` executou com sucesso no GitHub Actions (run #29, commit `c68a199`). Todos os passos passaram:
1. reconstrução exata do runtime;
2. teste HTTP;
3. teste do state store;
4. teste de criptografia;
5. teste de sessões de convidados;
6. teste do roster/cache;
7. teste de saúde/status/histórico;
8. teste de status remoto;
9. montagem do candidato modular isolado.

O workflow legado `UpStatus Validate` continua falhando em `scripts/validate.mjs:26` com `production updateURL mismatch`. A falha está na validação/build já existente e ocorre antes de qualquer teste do novo módulo; nenhum dos arquivos `scripts/build.mjs`, `scripts/validate.mjs` ou `release.json` foi alterado nesta reorganização. Não corrigir isso dentro do mesmo escopo; tratar separadamente após reconciliar os URLs de distribuição.


## 17. Oitavo módulo real — dados do chat

Foi extraído `modules/chat-data.js` com `createChatDataStore({ db, members })`, contendo:
- resolução de menções `@nome` e `@todos`;
- consulta incremental/normal de mensagens;
- janela de 48 horas;
- limite de 200 mensagens em consulta incremental e 1.000 na consulta completa;
- normalização do payload de mensagens, incluindo `readBy: []`.

O teste `scripts/test-normal-chat-data.mjs` passou localmente em Node v22.16.0. Cobre menções sem duplicidade, desconhecidos, expansão de `@todos`, normalização de campos e os limites de consulta. O builder foi reorganizado para respeitar a dependência de `members` e a ordem do runtime; a reversão dos oito blocos e imports restaura exatamente o template original.


## 18. Nono módulo real — mídia e perfis

Foi extraído `modules/media.js` com `createMediaStore({ db, randomBytes })`, reunindo:
- leitura do mapa de avatares;
- validação e decodificação de Data URL Base64;
- detecção de MIME por assinatura de bytes;
- mapeamento MIME/extensão;
- upload de objeto no bucket solicitado e geração da URL pública.

Foram preservados os nomes de tabela/colunas, assinaturas de arquivo aceitas, mensagens de erro, limite recebido pelo chamador, geração do caminho, cacheControl `31536000` e `upsert:false`.

O teste `scripts/test-normal-media.mjs` passou localmente em Node v22.16.0. Cobre perfil, Data URL inválida, assinaturas JPEG/PNG/GIF/Ogg/MP3, extensão e upload com Storage falso. O builder agora extrai nove módulos; a reversão dos nove blocos e imports restaura exatamente o template.


## 19. Décimo módulo real — resolução do contexto autenticado

Foi extraído `modules/auth-context.js` com `createAuthContext({ userFromToken, expireLucca, luccaToken, expireYcaro, ycaroToken })`.

A ordem de resolução permanece:
1. usuário normal autenticado;
2. sessão Lucca válida;
3. sessão Ycaro válida;
4. nenhum contexto.

A expiração é executada antes de validar cada token de convidado, e Ycaro só é consultado quando Lucca não autenticou. O shape `{ name, guest, joinedAt }` foi preservado.

O teste `scripts/test-normal-auth-context.mjs` passou localmente em Node v22.16.0 e cobre precedência, short-circuit e sessão de convidado. O builder foi atualizado; a reversão dos dez blocos e imports restaura exatamente o template original.


## 20. CI após a extração de mídia e contexto

O workflow dedicado `Verify Recovered Normal Runtime` passou novamente no GitHub Actions (run #60, commit `4ba5486`). Foram aprovados:
- reconstrução exata do runtime Normal 3.4.7;
- testes de HTTP, state, auth crypto, guest sessions, members, status, remote status, chat data, media e auth context;
- montagem do candidato modular isolado.

O workflow legado `UpStatus Validate` segue falhando exclusivamente na verificação de `production updateURL mismatch` em `scripts/validate.mjs:26`. Essa divergência preexistente permanece fora do escopo da reorganização e não foi alterada.


## 21. Estado atual da modularização (2026-11-26)

A auditoria inicial continua válida como fotografia do runtime original, mas a extração estrutural avançou. Hoje existem 17 factories em `src/server/normal-3.4.7/modules/`, com dependências explícitas. O entrypoint Deno, o dispatcher HTTP, a ordem de roteamento, o boundary global de erros, a configuração e a entrega do userscript/HTML continuam deliberadamente no entrypoint.

O builder `scripts/build-normal-modular-candidate.mjs` agora:
1. extrai os 17 blocos e injeta os imports/factories;
2. reverte as extrações temporariamente e exige igualdade exata com o template recuperado;
3. emite a fonte modular integrada, não a fonte restaurada;
4. verifica os 17 imports e as 17 chamadas de factory;
5. copia os módulos para o diretório isolado `dist/modular-normal-candidate/`.

O workflow dedicado passou no run #161, commit `cc44f6378f49ca2f950bffee144ce6449218557a`:
- recuperação exata do runtime;
- 17 testes offline de módulos;
- build do candidato modular;
- parse e bundle do entrypoint e do grafo local com esbuild.

**Limite da evidência:** parse/bundle prova sintaxe e resolução do grafo local, não execução integrada no Deno nem compatibilidade em produção. O próximo gate é uma caracterização integrada do entrypoint com dependências simuladas, sem conexão ao Supabase real, seguida de comparação dos contratos HTTP. Não extrair o dispatcher só para aumentar a contagem de módulos: ele é a fronteira de execução preservada intencionalmente.

O workflow legado `UpStatus Validate` continua com a divergência conhecida `production updateURL mismatch`, separada deste trabalho. Não alterar essa validação dentro da reorganização.

Nenhum deploy, Supabase write, migration, schema/RLS/grant/secret/config change ou Edge Function update foi realizado.


## 22. Wiring do dispatcher e composição integrada

O builder agora valida os marcadores de wiring do dispatcher para as rotas de convidado, autenticação, status, chat, mídia, remote status e manutenção. O entrypoint `Deno.serve` e o boundary global de erros permanecem no mesmo local e com a mesma estrutura.

Foi criado `scripts/test-normal-modular-integration.mjs`, que compõe os módulos reais de HTTP, estado, criptografia, auth core, sessões de convidados, contexto e endpoints de autenticação com DB em memória. Cobre setup, criação e validação de sessão, resolução de contexto, endpoint `/api/me`, logout e sessão Lucca por cookie.

**Validação:** workflow #173 passou no commit `556f60fcb642706bccb3e8a30ab576d96896b633`. O resultado demonstra composição integrada desses domínios e wiring estático do dispatcher, mas não equivale a execução Deno integral ou cobertura de todos os endpoints. Próximo gate: ampliar testes integrados por domínio e contratos HTTP, sem migrar o dispatcher para fora do entrypoint.

## 23. Composição integrada do chat

Foi adicionado `scripts/test-normal-chat-integration.mjs`. Ele liga `createMembersStore`, `createChatDataStore`, `createChatRouteHandler` e `createChatInteractionRoutes` usando DB em memória, exercitando o fluxo de roster, menções, criação/leitura de mensagens, perfis, não lidas, read receipts, fast sync, reações, edição e exclusão. Não há conexão Supabase.

**Validação:** `Verify Recovered Normal Runtime` passou no run #179, commit `b82154a8e887062087c6cf9bd951c06a0343e73e`, incluindo recuperação exata, todos os testes unitários, integração auth/guest, integração chat, build modular e parse/bundle. Essa cobertura é uma composição simulada dos domínios de chat, não execução completa do dispatcher Deno ou teste de produção.

Próximos gates: composição integrada de mídia/status e comparação de contratos HTTP. Nenhum deploy ou Supabase write foi realizado.

## 24. Integração de mídia e status

Foram criados `scripts/test-normal-media-integration.mjs` e `scripts/test-normal-status-integration.mjs`. O primeiro compõe media store e routes, validando perfis, upload direto, MIME, URL assinada, token e sanitização de caminho. O segundo compõe status handlers e remote status, cobrindo mudança de presença/status, histórico, health check, fila remota, confirmação e consulta de resultados. Ambos usam DB/Storage simulados, sem conexão ao Supabase.

**Validação:** `Verify Recovered Normal Runtime` passou no run #189, commit `17bfe9a788c6fd2ddcdf82962edd8e8ad2fcf64d`. Recuperação exata, 17 testes unitários, quatro composições integradas (auth/guest, chat, mídia e status), build modular e parse/bundle passaram.

Esses testes não equivalem à execução integral do dispatcher Deno ou a um teste com o projeto Supabase real. Próximo gate: caracterização transversal de contratos HTTP e boundary de erros, seguida de execução isolada em Deno. Nenhum deploy ou Supabase write foi realizado.

## 25. Precedência e contratos do dispatcher

O builder passou a verificar a ordem dos pontos críticos de despacho HTTP dentro do `Deno.serve`, além da presença dos marcadores individuais. A ordem auditada inclui OPTIONS, assets públicos, normalização de path, páginas de convidados, endpoints públicos, autenticação e `/api/me`, gate de sessão, logout, rotas protegidas, fallback 404 e boundary global 500.

A primeira execução encontrou um falso positivo da auditoria: scripts JavaScript embutidos nas páginas Lucca/Ycaro possuem seus próprios `catch` antes do boundary global. A verificação foi ajustada para avaliar o último `catch` no source do entrypoint. Nenhum código de runtime foi alterado.

**Validação:** `Verify Recovered Normal Runtime` passou no run #196, commit `bf458086b479cb9d54798e8ad192c61017f961ea`, incluindo recuperação exata, 17 testes individuais, quatro integrações de domínio, build modular e parse/bundle.

A checagem confirma precedência textual/estrutural, não execução real do servidor Deno. Próximo gate: harness isolado de execução do entrypoint com dependências simuladas. Nenhum deploy ou Supabase write foi realizado.

## 26. Execução isolada do entrypoint Deno

Foi adicionado um harness Deno em `scripts/deno-entrypoint-test/`. Um import map injeta um cliente Supabase falso, e o teste inicia o candidato modular por meio do `Deno.serve` real. As requisições HTTP locais validam saúde, CORS, OPTIONS, `/api/me`, gate de autenticação, precedência 401/404, account lookup, roster, userscript, páginas de convidados e boundary global 500.

O harness usa URL/chave Supabase fictícias, Storage/DB simulados e permissões de rede limitadas ao bind local. Nenhuma chamada externa ao Supabase é possível por esse mock.

**Validação:** `Verify Recovered Normal Runtime` passou no run #207, commit `223a24564b35649130b8c1ad66a72ffeeab470e7`, incluindo recuperação exata, 17 testes unitários, quatro integrações de domínio, build modular, execução Deno isolada e parse/bundle.

A evidência agora inclui execução HTTP do entrypoint em Deno, mas não compatibilidade com o Supabase real nem com o ambiente gerenciado de produção. Próximo gate: autenticação/setup/login e rotas protegidas no harness isolado. Nenhum deploy ou Supabase write foi realizado.

## 27. Rotas protegidas no servidor Deno isolado

O harness `scripts/deno-entrypoint-test/` agora executa pelo HTTP real setup/login, validação de credenciais, emissão e invalidação de sessão, `/api/me` autenticado, status/presença, histórico, health, fila de remote status com ACK por outra conta, chat (criação, leitura, typing, reação, edição e exclusão), upload de avatar/imagem, URL assinada, sessões/cookies Lucca e Ycaro e limpeza do chat.

O mock Supabase implementa operações em memória para os dados e Storage. Os tokens e senhas usados são apenas de teste.

**Validação:** `Verify Recovered Normal Runtime` passou no run #219, commit `cc97676d3d482f583cdc6ff5e3bfe658726161c1`. Passaram reconstrução exata, 17 testes unitários, quatro integrações de domínio, build, execução HTTP em Deno e parse/bundle.

A cobertura comprova o fluxo do dispatcher no Deno local com dependências simuladas, não a integração com Supabase real nem o ambiente gerenciado. Próximo passo: reforçar contratos negativos e autorização em rotas protegidas restantes. Nenhum deploy ou Supabase write foi realizado.

## 28. Matriz negativa e falhas no dispatcher Deno

Adicionada conta padrão `Tester` para testar as fronteiras por role. O Deno local comprova bloqueio de health/histórico, consulta de resultados e criação de remote status por usuário padrão; edição/exclusão de mensagem de terceiros; e regra exclusiva de Ricardo para limpar chat, inclusive quando o solicitante possui role admin. Também valida proteção contra spoofing de `actor`/`target` no status.

O mock foi ampliado com falhas injetáveis de DB e Storage. O servidor Deno retorna o contrato 500 esperado para JSON malformado e falhas de insert/upsert/select, upload direto e URL assinada. A falha de Storage ao remover mídias durante a limpeza mantém o contrato atual de resposta 200 com `removedFiles: 0`.

Também entram `/api/update-info`, perfil, formatos imagem/documento/áudio/vídeo, limites e MIME, guest invalid credentials/heartbeat, e 12 mensagens concorrentes com IDs únicos.

**Validação:** workflow `Verify Recovered Normal Runtime` passou no run #231, commit `c7afa1bc76f9ec5de19895852956ce4069df7dfa`, incluindo recuperação exata, 17 testes unitários, quatro integrações, build, execução Deno e esbuild.

As falhas são simuladas em memória, sem rede ao Supabase. Próximo gate: execução diferencial da referência monolítica e do candidato modular nos mesmos cenários HTTP.

## 29. Comparação diferencial com o monólito recuperado

O builder também emite `dist/recovered-normal-reference/index.ts`, derivado do template recuperado com placeholders resolvidos e listener local na porta 8001. O harness inicia a referência e o candidato modular em processos Deno separados, ambos com o mesmo mock Supabase e dados iniciais equivalentes.

Os mesmos requests públicos/sem autenticação são enviados aos dois e os status, headers relevantes e bodies são comparados exatamente: health, `/api/me`, gate de auth, account, roster, update-info, userscript, páginas Lucca/Ycaro, prefixo `/upstatus`, OPTIONS e login de convidado com senha inválida.

**Validação:** `Verify Recovered Normal Runtime` passou no run #252, commit `72dbbd0868700a944a5113c703cd0749feea8de8`, incluindo recuperação exata, testes unitários, quatro integrações, build, execução Deno, comparação diferencial e esbuild.

A comparação exata ainda é restrita a rotas públicas/sem autenticação; os fluxos protegidos são testados no candidato modular contra asserts contratuais e mocks em memória. Próximo gate: comparar também fluxos autenticados selecionados com normalização de tokens, IDs e timestamps.

## 30. Comparação diferencial de fluxos autenticados

A comparação entre a referência monolítica e o candidato modular agora inclui setup/login com token normalizado, `/api/me`, status/presença e leitura específica do histórico com timestamps normalizados, criação de chat, read receipts, reações, edição e exclusão com IDs distintos por servidor, além do ciclo remote status (comando, pendência, confirmação e resultado).

O comparador só normaliza valores voláteis (token, ID e timestamp); os restantes campos dos payloads JSON são comparados. As duas instâncias usam DB/Storage em memória independentes.

**Validação:** run #261 do `Verify Recovered Normal Runtime` passou no commit `0692e9bd3fa854ecff5ae0a72c7f3ddcd534900d`, junto com recuperação exata, testes unitários, integrações, build, comparação pública e testes HTTP Deno.

Próximo gate: comparar guest cookie flows e media uploads entre referência e candidato, depois registrar os limites externos de validação/rollout.
