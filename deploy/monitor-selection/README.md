# Imagem do fork para a instalação 4.5.6

Esta entrega usa a imagem upstream 4.5.6 fixada por digest, com os mesmos PHP e dependências da instalação existente. Acrescenta somente os arquivos PHP modificados pelo recurso, sua migração, a tradução pt_BR e o frontend completo compilado. Não inclui configurações nem segredos. O commit de origem fica em `commit.sha`, na variável `GIT_COMMIT` e no rótulo OCI de revisão.

## Gerar e conferir o artefato

Com Node compatível com `frontend/package.json`, dependências instaladas por `npm ci --prefix frontend` e alterações commitadas:

```sh
deploy/monitor-selection/package.sh
# O comando informa o diretório do contexto, o .tar.gz e seu SHA-256.
```

No diretório do contexto, confira `sha256sum -c SHA256SUMS` e compile com:

```sh
podman build --pull=never --build-arg FORK_COMMIT="$(cat runtime/commit.sha)" \
  -t localhost/xibo-cms-fork:"$(cut -c1-12 runtime/commit.sha)" -f Containerfile .
```

A imagem base fixada precisa estar disponível. O `--pull=never` evita trocar a base durante a entrega.

## Atualizar a instalação

1. Faça backup consistente do banco, do compose, do ambiente, do `web/settings.php` atual e da biblioteca. Proteja os backups de configuração com permissões restritas.
2. Preserve o `web/settings.php` atual em um volume: ele contém a chave já usada pelo CMS. Não deixe a recriação do contêiner gerar outra chave. Mantenha também todos os volumes da biblioteca, customizações, certificados e scripts.
3. Restaure o dump em um banco de pré-validação separado. Use a nova imagem, o arquivo de configurações preservado e uma substituição de `MYSQL_DATABASE` apontando exclusivamente para essa cópia. Confirme o banco efetivo antes de executar Phinx; não inicie cron nem XTR nessa cópia. Execute a migração e confira os registros.
4. Troque apenas a imagem de `cms-web` no compose pela tag local, preservando a configuração restante, e monte o arquivo de configurações preservado em `/var/www/cms/web/settings.php`. Recrie somente esse serviço. O entrypoint original faz backup e aplica migrações pendentes.
5. Confira Phinx, login, carregamento dos assets, telas/layouts/mídias/agendamentos, logs e a política de reinício. O Windows precisa do player do fork para enviar sua lista de monitores; este artefato atualiza apenas o CMS.

## Retornar à imagem anterior

Restaure a imagem anterior no compose e recrie somente `cms-web`, mantendo os mesmos volumes e o mesmo `settings.php`. Monte também o arquivo `runtime/db/migrations/20261109150000_add_windows_monitor_inventory.php` da entrega em `/var/www/cms/db/migrations/20261109150000_add_windows_monitor_inventory.php`, somente para leitura. Sem esse arquivo, a imagem antiga detecta uma migração registrada mas ausente e bloqueia a aplicação por atualização pendente. Com o arquivo presente, a coluna nullable pode permanecer no banco sem ser usada pelo código antigo. Valide `phinx status` também para esse compose de retorno antes da troca. Não restaure o dump por padrão: isso apagaria alterações feitas depois do backup. Use o dump somente se houver dano aos dados e uma decisão explícita de restaurá-los.

Este procedimento não cria release pública nem atualiza os players.
