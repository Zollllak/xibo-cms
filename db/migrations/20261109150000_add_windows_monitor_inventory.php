<?php
/** @phpcs:disable PSR1.Classes.ClassDeclaration.MissingNamespace */
use Phinx\Migration\AbstractMigration;

class AddWindowsMonitorInventory extends AbstractMigration
{
    public function change()
    {
        $this->table('display')
            ->addColumn('monitorInventory', 'text', ['null' => true, 'default' => null])
            ->update();
    }
}
