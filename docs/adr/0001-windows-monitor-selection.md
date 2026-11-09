# 0001. Seleção de monitor pelo CMS

- Status: Aceito
- Data: 2026-11-09

## Contexto
O player Windows usa tamanho e coordenadas para abrir em uma tela específica. O usuário precisa escolher o monitor secundário pelo dashboard, sem calcular coordenadas. O CMS e o player precisam compartilhar essa escolha pelo XMDS e preservar configurações existentes.

## Decisão
Adicionar a configuração Windows `monitorSelection`, do tipo `string`, com valores `default`, `primary` e `secondary`. O padrão `default` preserva o cálculo de tamanho e posição anterior. As outras escolhas ocupam todo o monitor e têm precedência sobre as coordenadas, sem apagá-las. A seleção recebida é persistida pelo mecanismo existente do player e aplicada na inicialização e nas mudanças de monitores. Após editar no CMS, aguardar o recebimento e reiniciar o player.

`secondary` escolhe o primeiro monitor não principal na ordenação ordinal, sem distinguir maiúsculas, do nome de dispositivo Windows. Sem secundário, usa o principal. A reconexão é reavaliada pelos eventos de configuração de tela do Windows. A janela é posicionada em pixels físicos; seu tamanho lógico é ajustado ao DPI de destino pelo WPF.

## Alternativas
- Manter apenas coordenadas: exige cálculo manual e depende do arranjo das telas.
- Alterar somente o CMS: o player atual não interpreta uma preferência de monitor.
- Escolher um índice de enumeração: pode mudar conforme a ordem de detecção.
- Transmitir inventário completo e escolher uma identidade física: amplia o contrato além da escolha de principal ou secundário solicitada.

## Consequências
É necessário instalar os dois componentes modificados para controlar o recurso pelo painel. Players antigos ignoram a nova opção. O padrão não muda o comportamento das instalações existentes. A escolha é por função principal/secundário, não por identidade física; com vários secundários, deve-se conferir qual nome Windows foi selecionado. O posicionamento e o DPI ainda precisam de validação em Windows com duas telas reais.
