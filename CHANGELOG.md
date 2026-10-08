# Changelog

## 3.0.27-beta.3
- Corrigido o canal Realtime da TEST para compartilhar o mesmo canal de chat e sinalização de chamadas da produção.
- Mantida a separação do ambiente TEST para armazenamento, autenticação e endpoint da Edge Function.
- Permite testar chat e chamadas entre usuários da versão oficial e da beta.


## 3.0.27-beta.2
- Corrigido o estado de mensagens não lidas para considerar os registros reais de leitura, evitando alertas falsos após abrir ou recarregar o Sale Smartly.
- Corrigida a atualização dos leitores das mensagens, incluindo sincronização periódica dos recibos de leitura.
- Adicionadas notificações leves nas abas seguidoras para novas mensagens e chamadas, sem duplicar o UpStatus completo.
- Clique na notificação tenta reutilizar a aba líder existente pelo nome do contexto do navegador e usa nova aba somente como fallback.
- Desativadas as notificações nativas do Windows do UpStatus.
- Mantido o comportamento da aba líder no Sale Smartly.


## 2026-10-08

## 3.0.27-beta.1
- Reiniciada a linha beta diretamente a partir da produção 3.0.27.
- Apenas uma instância completa do UpStatus permanece ativa por vez, preferencialmente em uma aba do Sale Smartly.
- Outras abas usam um seguidor invisível, sem painel ou bolinha persistente.
- O atalho Shift+C em qualquer aba envia o comando para a instância líder abrir o UpStatus.
- Não altera a lógica de chamadas, chat ou Supabase Realtime nesta primeira beta limpa.

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
