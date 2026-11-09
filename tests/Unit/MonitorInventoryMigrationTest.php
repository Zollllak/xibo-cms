<?php
namespace Xibo\Tests\Unit;

use Phinx\Db\Adapter\SQLiteAdapter;
use Phinx\Db\Adapter\ProxyAdapter;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Output\NullOutput;
use Xibo\Helper\MonitorInventory;

class MonitorInventoryMigrationTest extends TestCase
{
    public function testMigrationPreservesExistingRowsAndCanBeRolledBack(): void
    {
        require_once dirname(__DIR__, 2) . '/db/migrations/20261109150000_add_windows_monitor_inventory.php';
        $adapter = new SQLiteAdapter(['name' => ':memory:'], null, new NullOutput());
        $adapter->connect();
        $adapter->execute('CREATE TABLE display (displayId INTEGER PRIMARY KEY, display TEXT)');
        $adapter->execute("INSERT INTO display VALUES (1, 'Loja')");
        $migration = new \AddWindowsMonitorInventory('test', 20261109150000);
        $migration->setAdapter($adapter);
        $migration->change();
        $this->assertNull($adapter->fetchRow('SELECT monitorInventory FROM display')['monitorInventory']);
        $report = MonitorInventory::fromReport([MonitorInventoryTest::monitor()], '2026-11-09T18:00:00Z');
        $statement = $adapter->getConnection()->prepare('UPDATE display SET monitorInventory = ? WHERE displayId = 1');
        $statement->execute([json_encode($report)]);
        $stored = $adapter->fetchRow('SELECT * FROM display');
        $this->assertSame('Loja', $stored['display']);
        $this->assertSame($report, json_decode($stored['monitorInventory'], true));
        $proxy = new ProxyAdapter($adapter);
        $migration->setAdapter($proxy);
        $migration->change();
        $proxy->executeInvertedCommands();
        $this->assertFalse($adapter->hasColumn('display', 'monitorInventory'));
        $this->assertSame('Loja', $adapter->fetchRow('SELECT * FROM display')['display']);
        $adapter->disconnect();
    }
}
