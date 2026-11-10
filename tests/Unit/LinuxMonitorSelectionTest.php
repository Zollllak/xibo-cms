<?php
namespace Xibo\Tests\Unit;

require_once __DIR__ . '/DisplayMonitorSelectionTest.php';

/** Run the same inheritance, validation and status contract for the Linux profile used by macOS. */
class LinuxMonitorSelectionTest extends DisplayMonitorSelectionTest
{
    protected function playerType(): string
    {
        return 'linux';
    }
}
