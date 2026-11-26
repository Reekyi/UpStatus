# UpStatus — matriz de divergência dos runtimes (2026-11-26)

## 1. Userscript Normal 3.4.7

O userscript extraído diretamente do runtime `upstatus` tem 544.057 caracteres.

Comparação com `master/UpStatus.user.js`:
- Mesmo tamanho.
- Conteúdo idêntico depois de normalizar somente duas diferenças de ambiente: project ref e publishable key.
- A comparação normalizada de todo o arquivo terminou sem divergências.

**Conclusão:** `src/userscript/upstatus.user.template.js` e `UpStatus.user.js` em `master` são uma fonte reproduzível do cliente Normal 3.4.7, desde que os valores de ambiente sejam tratados corretamente. O snapshot exato do artefato implantado foi preservado em `recovery/runtime-2026-11-26/userscripts/upstatus-normal-3.4.7.user.js`.

## 2. Backend de distribuição `upstatus`

O backend implantado não é idêntico ao template atual de `master`. A comparação normalizada encontrou diferenças funcionais, incluindo:

- O runtime filtra a lista de membros para os usuários oficiais Ricardo, Guilherme e Lohan; o template atual não aplica esse filtro.
- O runtime não possui os mesmos parâmetros de corte por sessão de convidado no histórico que aparecem no template atual.
- O runtime não lê nem retorna `file_name` nas mensagens como o template atual.
- O runtime tem fallback administrativo por nome (`Ricardo`) em uma operação de exclusão; o template atual exige o papel administrativo persistido.
- O runtime possui handlers de upload assinado e rotas de upload/avatar que não correspondem à estrutura atual do template.
- Há diferenças de fluxo entre upload por URL assinada e upload por data URL.

Essas diferenças não são apenas formatação. Algumas são mudanças de segurança, autorização, compatibilidade e comportamento. Não substituir o backend implantado pelo template de `master` sem revisar cada diferença e validar o impacto.

## 3. API beta10

O runtime `upstatus-screen-share-3-1-1-beta10` também diverge do template de `master` e das candidatas da PR #161.

Diferenças funcionais relevantes observadas entre o runtime beta10 e o template Normal atual:
- O runtime não aplica o corte de histórico por `sessionStartedAt` existente no template atual.
- O runtime não lê/retorna `file_name` no mesmo contrato do template atual.
- A rota de avatar aceita URL pública validada pelo prefixo do projeto e também mantém caminho de upload legado.
- O runtime possui `signedUploadRoute` com validação de MIME e tamanho, mas não valida de forma completa a origem HTTPS, o caminho assinado, a consistência do token e a URL pública.
- A candidata PR #161 adiciona essas verificações de origem, rota, caminho, token e URL pública. Essa candidata não está integrada nem implantada.

A PR #161 é uma proposta de correção, não uma fonte que possa ser copiada para produção automaticamente.

## 4. Testes existentes no GitHub

O fluxo `scripts/validate.mjs`:
- executa o build;
- verifica versão, namespace e URLs de atualização;
- verifica tópicos Realtime, chaves locais e identidade dos artefatos;
- confere se o userscript embutido no backend corresponde ao artefato gerado;
- verifica sintaxe do userscript e páginas convidadas;
- contém diversas asserções estáticas de UI;
- executa `scripts/chat-regression.test.mjs`.

O teste `chat-regression.test.mjs` isola `processChatNotifications` em um VM e verifica notificações/toasts, alertas de menção e notificações externas.

## 5. Lacunas de cobertura atuais

Não foi encontrada evidência de testes automatizados de navegador/integração para:
- envio e recebimento de mensagens com latência medida;
- alternância de filas no Sale Smartly;
- autenticação e sessão;
- presença e status;
- chamadas de áudio WebRTC;
- compartilhamento de tela;
- reconexão e recuperação de chamadas;
- upload real de imagem, vídeo, documento e áudio;
- regressões de histórico e leitura;
- comportamento real com múltiplos usuários.

Também não existe baseline automatizado de latência para os números relatados pelo Ricardo e Guilherme.

## 6. Critérios mínimos antes da primeira extração modular

1. Preservar os snapshots implantados e os artefatos de cliente.
2. Criar testes de proveniência para detectar alteração involuntária dos endpoints, tópicos e versões.
3. Adicionar testes de contrato para cliente/API antes de alterar seus payloads.
4. Ter um smoke test manual ou automatizado, em ambiente isolado, cobrindo chat, fila, chamadas e compartilhamento de tela.
5. Medir latência em ambiente controlado, sem bombardear o Supabase gratuito.
6. Refatorar apenas um módulo por vez, com diff pequeno e rollback simples.

Nenhum deploy, migration ou teste integrado em produção foi realizado nesta investigação.


## Complemento de escopo — dois projetos Supabase

As comparações de cobertura deste documento foram feitas inicialmente sobre o projeto Revived e os arquivos de `master`. O projeto original `UpStatus` também foi consultado: seus runtimes centrais Normal 3.4.7 e beta10/beta8 têm snapshots preservados, e há funções adicionais ativas para TEST 3.3.28 e Team Lite 3.4.30. O projeto Revived não contém esses runtimes adicionais. Ver `docs/SUPABASE_ENVIRONMENT_RECONCILIATION_2026-11-26.md` antes de definir cobertura final ou fonte canônica.
