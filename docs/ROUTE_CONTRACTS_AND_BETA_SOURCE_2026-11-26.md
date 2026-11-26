# UpStatus — mapa de contratos e candidato de origem beta (2026-11-26)

Complementa `docs/RUNTIME_PROVENANCE_2026-11-26.md`. Somente leitura dos bundles implantados e dos arquivos versionados.

## 1. Normal 3.4.7: cliente e backend são componentes diferentes

O userscript Normal extraído do runtime declara:
- `@version 3.4.7`.
- Distribuição pelo endpoint `/functions/v1/upstatus/upstatus.user.js`.
- API principal em `/functions/v1/upstatus-screen-share-3-1-1-beta10`.
- Realtime topic `upstatus-screen-share-live-3-1-1-beta10`.

O cliente contém chamadas literais para rotas como login/setup, health, members, status, chat, leitura, digitação, reação, perfis, avatar, upload de avatar/chat e remote-status. O backend beta implantado contém handlers correspondentes, além de rotas internas e endpoints adicionais. Algumas rotas são construídas dinamicamente no cliente, então a lista literal não deve ser tratada como especificação completa.

## 2. Beta implantado: identidade interna não coincide com o slug

A função implantada tem slug `upstatus-screen-share-3-1-1-beta10`, mas:
- declara `VERSION = 3.1.1-beta8`;
- embute userscript `3.1.1-beta8`;
- o userscript embutido aponta para `/functions/v1/upstatus-screen-share-3-1-1-beta8`;
- usa o tópico `upstatus-screen-share-live-3-1-1-beta8`.

A diferença entre o slug de implantação e o endpoint configurado dentro do userscript é real e deve ser preservada até confirmar quais clientes usam cada endereço. Não normalizar nomes/URLs automaticamente.

## 3. Candidato de fonte versionada mais próximo

A branch `beta/3.1.1-beta8-loader-fix` contém `src/server/index.template.ts` com 102.125 caracteres. Comparada com o runtime implantado (depois de remover o bloco hexadecimal embutido e normalizar os marcadores de versão/rota), ela é o candidato mais próximo entre as branches examinadas:
- 691 linhas correspondentes de 728 linhas do runtime;
- 8 regiões de divergência na comparação por linhas.

A branch `master` ficou atrás nesse comparativo, com 683 linhas correspondentes e 20 regiões de divergência.

Isso é evidência de proximidade, não prova de identidade nem autorização para usar a branch como substituta do runtime.

## 4. Diferenças beta observadas entre runtime e candidato

As diferenças incluem:
- Ordem de fallback da chave administrativa.
- Exclusão de mensagens: runtime permite que Ricardo exclua mensagens de outros usuários; template candidato restringe ao autor.
- Avatar: runtime aceita URL de avatar já salva; template candidato usa upload direto por data URL.
- Upload assinado: runtime tem handler dedicado para upload de avatar/chat; o template candidato examinado não contém esse handler/rotas.
- Tratamento de erro no lookup e exclusão de mensagens.
- O bloco HTML Ycaro e os pontos de montagem precisam ser reconciliados separadamente.

As diferenças acima podem ser comportamentais. Não são limpeza mecânica e não devem ser incorporadas ou removidas durante uma simples reorganização.

## 5. Normal 3.4.7: candidato de fonte

O userscript Normal extraído do runtime é igual ao `master/UpStatus.user.js` após normalizar somente:
- project refs do Supabase;
- publishable key pública.

A primeira divergência bruta encontrada é justamente uma publishable key diferente. Depois da normalização dessas duas categorias, o arquivo completo comparado ficou idêntico. Isso sugere que `master/UpStatus.user.js` é uma boa referência para o artefato de cliente Normal, mas o template de servidor Normal continua divergente em rotas e handlers.

O bundle de servidor Normal implantado contém alterações importantes em relação ao template de `master`, incluindo:
- lista explícita de membros oficiais;
- handlers de chat com diferenças no suporte a nome de arquivo e sessão;
- upload assinado dedicado;
- persistência de avatar por URL;
- regras administrativas de exclusão;
- dispatch e páginas de convidados.

## 6. Decisão

Ainda não há uma fonte única canônica comprovada para todos os artefatos implantados. A melhor hipótese de trabalho, a validar, é:
- cliente Normal: `master/UpStatus.user.js`, com configuração pública de ambiente aplicada pelo build;
- backend Normal: snapshot do runtime, reconciliado com o template e seus handlers;
- backend beta: branch `beta/3.1.1-beta8-loader-fix` como candidato estrutural, com deltas de runtime preservados;
- cliente beta: snapshot extraído do runtime, não o `UpStatus.user.js` da branch beta8 (este último é uma versão antiga 3.0.26).

## 7. Próximas ações seguras

1. Rastrear o histórico de commits da branch beta8 e localizar a origem das alterações de runtime que não estão no template.
2. Comparar o bundle beta com o candidato por blocos/funções, não apenas por linhas.
3. Construir uma matriz explícita de rotas, métodos HTTP, payloads e respostas entre o cliente Normal 3.4.7 e o backend beta8/beta10.
4. Reconciliar o backend Normal implantado com seu template de origem.
5. Só então criar testes de caracterização e iniciar extrações de módulos sem alterar comportamento.

Não houve deploy, escrita no banco, alteração de secrets ou modificação de runtime.
