# UpStatus Release Checklist

## Antes de um beta

- [ ] Confirmar a versão em `release.json`.
- [ ] Rodar `node scripts/validate.mjs`.
- [ ] Confirmar que TEST usa `upstatus-test`.
- [ ] Confirmar que TEST não contém URLs de atualização de produção.
- [ ] Confirmar storage, Realtime e ringtone isolados.
- [ ] Deploy somente de `upstatus-test`.

## Teste funcional obrigatório

- [ ] Login e identificação do usuário.
- [ ] Status: Online, Ocupado e Ausente.
- [ ] Sincronização com Sale Smartly.
- [ ] Chat: enviar e receber.
- [ ] Chat: emoji.
- [ ] Chat: resposta.
- [ ] Chat: clique direito.
- [ ] Chat: reação.
- [ ] Chat: exclusão da própria mensagem.
- [ ] Chat: imagem/vídeo.
- [ ] Chat: áudio gravado.
- [ ] Notificações.
- [ ] Ringtone.
- [ ] Chamada 1:1: ligar.
- [ ] Chamada 1:1: atender.
- [ ] Chamada 1:1: recusar.
- [ ] Chamada 1:1: mute.
- [ ] Chamada 1:1: desligar.
- [ ] Realtime após recarregar a página.

## Para funcionalidades de chamada em grupo

- [ ] Adicionar terceiro.
- [ ] Terceiro recebe convite.
- [ ] Terceiro aceita e entra.
- [ ] Terceiro recusa sem derrubar a chamada existente.
- [ ] Terceiro offline sem derrubar a chamada existente.
- [ ] Áudio entre todos os participantes.
- [ ] Mute individual.
- [ ] Entrada e saída de participante.
- [ ] Participante não aparece duas vezes.
- [ ] Não permitir adicionar a si mesmo.
- [ ] Dois convites simultâneos.
- [ ] Realtime interrompido.
- [ ] Conexão WebRTC interrompida.
- [ ] Recarregamento de página.

## Navegadores

- [ ] Chrome → Chrome.
- [ ] Firefox → Chrome.
- [ ] Chrome → Firefox.
- [ ] Firefox → Firefox.

## Aprovação

Somente após todos os testes necessários passarem:

`beta → RC → aprovação explícita → produção`

Produção não deve ser publicada pelo workflow de TEST.
