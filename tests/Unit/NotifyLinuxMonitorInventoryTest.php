<?php
namespace Xibo\Tests\Unit;

require_once __DIR__ . '/NotifyMonitorInventoryTest.php';

/** Run the same inheritance, validation and status contract for the Linux profile used by macOS. */
class NotifyLinuxMonitorInventoryTest extends NotifyMonitorInventoryTest
{
    protected function playerType(): string
    {
        return 'linux';
    }
}
