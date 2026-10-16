# Changelog

## 2026-10-16

## 3.0.39
- Polido o modo claro do chat: botões do cabeçalho e área de digitação agora seguem a paleta clara.
- Corrigidas as cores do balão de notificação para respeitar o tema ativo.
- O indicador do chat fica verde quando não há mensagens novas e vermelho pulsante quando há mensagens não lidas.
- Ajustado o microfone no modo claro: branco no estado normal, azul ao passar o mouse e vermelho durante a gravação.
- Mantido o comportamento de abrir o chat pelo indicador e limpar o aviso ao abrir.

## 2026-10-15

## 3.0.36
- Corrigida a rolagem do chat com uma verificação baseada na posição real da última mensagem dentro da área rolável.
- Adicionado acompanhamento de alterações no conteúdo para repetir a rolagem após atualizações e carregamento de elementos.
- Preservada a correção do contador de mensagens não lidas introduzida na versão 3.0.35.

## 2026-10-15

## 3.0.35
- Corrigida a atualização do contador de mensagens não lidas durante as consultas rápidas do chat, sem depender de uma recarga completa.
- Reforçada a rolagem inicial para a mensagem mais recente com novas tentativas após o layout inicial, especialmente em navegadores Chromium.
- Mantidos o fluxo de leitura no servidor e o botão flutuante para abrir e fechar o chat.

# Changelog

## 2026-10-15

## 3.0.34
- Corrigido o registro de leitura do chat mesmo quando o cache local está vazio e após atualizações do histórico sem mudança no conteúdo.
- Corrigida a validação do cache de renderização para verificar a lista DOM atual, evitando que a conversa fique presa no histórico antigo.
- Reforçada a rolagem inicial para a mensagem mais recente, inclusive enquanto imagens e outros elementos terminam de carregar.
- Mantido o comportamento do botão flutuante de chat para abrir e fechar a conversa.

## 2026-10-15

## 3.0.33
- Corrigido o recebimento de mensagens do chat sem precisar recarregar a página, mantendo a consulta periódica como fallback quando o Realtime não cobre o ambiente de origem.
- Corrigido o reaparecimento de notificações já lidas após F5, persistindo os identificadores das mensagens notificadas e estabelecendo corretamente a referência inicial do histórico.
- Melhorada a rolagem do chat para ir diretamente à mensagem mais recente ao abrir a conversa.
- O botão flutuante do chat agora alterna entre abrir e fechar a conversa.



## 2026-10-08

## 3.0.27
- Chamadas em grupo com múltiplas conexões WebRTC e convite de participantes.
- Mini dock de chamada mais compacta, com avatar do participante ativo e destaque dinâmico conforme a voz detectada.
- Melhorias de estabilidade na sinalização WebRTC pelo Supabase Realtime.
- Chat com envio de áudio exibido imediatamente para o próprio remetente.
- Formas de onda dos áudios do chat calculadas a partir do volume real e reutilizadas entre renderizações.
- Correções de encoding UTF-8 para acentos e emojis.
- Produção permanece isolada do ambiente TEST durante o desenvolvimento.


## 3.0.27-beta.7
- Otimizado o carregamento das formas de onda do chat.
- A forma de onda de cada áudio é calculada uma vez e reutilizada nas renderizações seguintes, evitando que os áudios antigos aparentem recarregar ao enviar uma nova mensagem.
- Não altera a lógica de chamadas WebRTC, chamadas em grupo ou sinalização de chamadas.

## 3.0.27-beta.6
- Corrigido o áudio enviado pelo próprio usuário para aparecer imediatamente no chat, sem depender do eco do Realtime.
- Barra de áudio agora gera uma forma de onda baseada no volume real do arquivo, substituindo a barra fixa.
- Durante a reprodução, o progresso continua sendo destacado sobre a forma de onda.
- Não altera a lógica de chamadas WebRTC, chamadas em grupo ou sinalização de chamadas.

## 3.0.27-beta.5
- Corrigido o envio de áudio no chat para o próprio remetente.
- Após o servidor criar a mensagem de áudio, o remetente recebe a mesma mensagem pelo canal rápido do chat e a exibe imediatamente.
- Não altera a lógica de chamadas WebRTC, chamadas em grupo ou sinalização de chamadas.

### Release pipeline v1
- Established `3.0.26` as the production baseline.
- Added `develop` as the TEST/integration branch.
- Added a single release configuration file.
- Extracted the userscript into a readable source template.
- Extracted the Edge Function into a generated source template.
- Added reproducible build and validation scripts.
- Isolated TEST storage, Realtime signaling, and ringtone coordination.
- Added validation, manual TEST deployment, and manual production workflows.
- Automatic TEST deployment is intentionally paused until GitHub Actions Supabase secrets are configured.
- Production runtime was not modified by the pipeline refactor.

### 3.0.27-beta.1
- Iniciada a nova linha de desenvolvimento para chamadas em grupo.
- Preparado o primeiro ciclo beta para evoluir o motor de chamadas WebRTC sem alterar a produção.

### 3.0.27-beta.2
- Corrigido o encoding UTF-8 do userscript para restaurar acentos e emojis corretamente.

### 3.0.27-beta.4
- Reformulada a mini dock da chamada em grupo para ficar mais compacta e discreta.
- Adicionado avatar único do participante ativo, alternando automaticamente conforme a voz detectada.
- Adicionado destaque dinâmico do falante com escala e brilho proporcionais ao nível de áudio.
- Mantidos os controles de microfone, adição de participante, saída e contador da chamada.

### 3.0.27-beta.3
- Reforçado o envio de sinalização WebRTC pelo Supabase Realtime.
- Ativada confirmação de broadcast e diagnóstico explícito de falhas do canal.
