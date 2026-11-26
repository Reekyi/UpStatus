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
