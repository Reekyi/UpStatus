# Changelog

## 2026-10-07

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
