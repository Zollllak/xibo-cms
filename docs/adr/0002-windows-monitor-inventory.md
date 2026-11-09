# 0002. Inventário e seleção de qualquer monitor Windows

- Status: Aceito
- Data: 2026-11-09
- Substitui: 0001

## Contexto
A escolha anterior por função principal/secundário não permite selecionar o terceiro monitor. Uma seleção por índice também pode mudar quando o Windows renumera os dispositivos. O dashboard precisa conhecer os monitores daquele computador e manter a escolha mesmo quando ele estiver offline ou o monitor escolhido estiver desconectado.

## Decisão
O player envia `monitors` no `NotifyStatus` autenticado do XMDS, com `id`, nome, nome de dispositivo Windows, indicação de principal e limites em pixels físicos. O CMS valida a lista (até 32 monitores), guarda o último relatório e a data UTC em `display.monitorInventory`, uma coluna TEXT contendo JSON, e o inclui na API de telas. Relatórios ausentes ou inválidos preservam o último inventário válido; uma lista vazia válida limpa os monitores informados.

O contrato `monitorSelection` mantém `default`, `primary` e `secondary` e aceita `monitor:` seguido de 64 caracteres hexadecimais. Esse identificador é o SHA-256 do caminho de interface do monitor informado pelo Windows, sem distinguir maiúsculas. Se o Windows não fornecer esse caminho, o player usa o nome de dispositivo GDI como identidade alternativa. O caminho bruto não é enviado ao CMS.

Na edição de uma tela, o dashboard lista todos os monitores do último relatório, com nome, dispositivo, resolução e indicação do principal. A escolha específica é uma configuração da tela; perfis compartilhados continuam oferecendo as opções por função. Um monitor salvo ausente do último relatório continua selecionável e é identificado como ausente. A escolha não é apagada: o player usa temporariamente o principal e volta a resolvê-la nos eventos de monitor do Windows. Após editar pelo CMS, aguardar o recebimento e reiniciar o player, como no contrato anterior.

## Alternativas
- Listar índices fixos: não descobre a quantidade real e pode selecionar outro monitor após renumeração.
- Guardar apenas em cache: perde a lista em reinícios do CMS e dificulta editar uma tela offline.
- Criar tabela de monitores separada: acrescenta relações e ciclo de vida sem necessidade para um pequeno relatório pertencente à tela.

## Consequências
É necessário migrar o banco e instalar as duas versões modificadas. Players antigos continuam funcionando e não apagam o inventário. O relatório tem limites e campos permitidos, e nomes são apresentados como texto pelo React. Os monitores precisam ser áreas independentes no modo Estender do Windows; telas duplicadas compartilham a mesma área lógica. O identificador depende da identidade que o Windows fornece: trocar portas ou reinstalar drivers pode mudá-lo; na alternativa GDI, a renumeração também pode exigir nova escolha. A compilação WPF e a validação em Windows com três telas reais continuam necessárias antes de distribuir um instalador.
