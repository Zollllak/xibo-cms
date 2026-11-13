# Light Leak entre fotos

Código XLF: `lightLeak`; atribuição de entrada no widget Image. Duração inicial 1800 ms, intervalo aceito de 100 a 10000 ms. A foto anterior deve estar na mesma região; no primeiro item ou em troca de layout não há foto anterior para revelar. Sem WebGL, imagem inacessível ou cancelamento, a próxima foto continua normalmente. Players upstream sem esta extensão não são compatíveis com esse código: direcionar layouts com Light Leak ao player macOS correspondente.

A migração `20261113120000` inclui **Light Leak (Photos)** no catálogo habilitado para entrada. Após executar as migrações e reconstruir os assets do CMS, abrir a playlist/região com duas fotos, editar a transição **in** da segunda foto, selecionar Light Leak e salvar 1800 ms. A opção aparece também em Administração → Transições. A API valida o tipo de widget, entrada e limites; `Layout::toXlf()` exporta `transIn` e `transInDuration` pelo caminho existente.

A prévia usa o mesmo módulo `ui/src/transitions/lightLeak.mjs` do player (`src/renderer/src/transitions/lightLeak.mjs`), instalado pelos exports públicos Region/Media do XLR. Manter essas fontes idênticas ao atualizar. Não editar node_modules. Nenhuma licença upstream foi removida. Timers, troca de mídia, eventos e prova de reprodução continuam sob responsabilidade do XLR.

## Verificações locais em 2026-11-13

- `php vendor/bin/phpunit --no-configuration --bootstrap tests/Unit/Bootstrap.php tests/Unit`: 64 testes / 133 assertions passaram; inclui catálogo SQLite com repetição, flags, preservação de escolhas e rollback, além de validação de duração/tipo.
- `node --test tests/Transitions/*.test.mjs`: 7 testes passaram.
- `npm run build`: Webpack passou; 13 avisos de Sass/deprecações existentes, sem erro.
- Player etapa inicial: commit `1583fdc`; 7 testes e build passaram.
- Testes adicionais do contrato: `LightLeakWidgetControllerTest` usa o controlador/API e o sanitizador reais, verifica `save` e as opções do widget com duração omitida (1800 ms) e customizada. `LightLeakXlfTest` usa o exportador real `Layout::toXlf()` e opções reais do widget, isolando leitura de banco/validação de mídia: exporta 1800/2300 ms e mantém 60 s por foto / 120 s no layout. Suite completa: **66 testes / 146 assertions**, passou.
- Smoke externo com o XLR instalado do CMS (1.0.26), plataforma CMS e rotas locais de recurso: passou no display externo 2, duração 1833 ms. Casos: primeiro item sem foto anterior, opções XLF, duas fotos, WebGL real, perda de contexto, sem GPU, reset e remoção da região. Runner no player: `XIBO_LIGHT_LEAK_CMS_CHECKOUT=/caminho/xibo-cms electron scripts/smoke-light-leak.cjs`. Assets reais do CMS compilados com Webpack; smoke exercita as fontes do bundle com a dependência fixada do CMS, sem autenticação nem servidor instalado.
- Ainda pendente: implantação e atribuição em um CMS real. Migração SQLite e prévia local não equivalem a implantação no servidor.

## Instalação e rollback

Executar a migração com o procedimento normal do CMS e compilar os assets (`npm ci`, `npm run build` ou seu build de produção). Nenhum deploy foi executado automaticamente. O rollback remove o código do catálogo e as opções transIn/transOut que o referenciam, preservando outras transições; regenerar/publicar os layouts afetados para substituir XLF já distribuídos. Guardar backup antes de aplicar migrações em produção.
