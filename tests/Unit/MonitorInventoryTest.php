<?php
namespace Xibo\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Xibo\Helper\MonitorInventory;

class MonitorInventoryTest extends TestCase
{
    public static function monitor(string $letter = 'a', string $device = 'DISPLAY1'): array
    {
        return ['id' => 'monitor:' . str_repeat($letter, 64), 'name' => 'Monitor de produção',
            'deviceName' => $device, 'isPrimary' => true, 'width' => 1920, 'height' => 1080,
            'left' => -1920, 'top' => 0];
    }

    public function testReportsAnyOfThreeMonitorsAndDiscardsUnknownFields(): void
    {
        $first = self::monitor();
        $first['untrustedExtra'] = '<script>bad</script>';
        $second = self::monitor('b', 'DISPLAY2');
        $second['isPrimary'] = false;
        $third = self::monitor('c', 'DISPLAY3');
        $third['isPrimary'] = false;
        $third['width'] = 1080;
        $third['height'] = 1920;
        $report = MonitorInventory::fromReport([$first, $second, $third], '2026-11-09T18:00:00Z');
        $this->assertCount(3, $report['monitors']);
        $this->assertSame('2026-11-09T18:00:00Z', $report['reportedAt']);
        $this->assertArrayNotHasKey('untrustedExtra', $report['monitors'][0]);
        $this->assertSame(-1920, $report['monitors'][0]['left']);
        $this->assertSame(1920, $report['monitors'][2]['height']);
        $this->assertSame([], MonitorInventory::fromReport([], 'now')['monitors']);
    }

    #[DataProvider('invalidReports')]
    public function testRejectsMalformedOrOversizedReports($report): void
    {
        $this->expectException(\InvalidArgumentException::class);
        MonitorInventory::fromReport($report, 'now');
    }

    public static function invalidReports(): array
    {
        $valid = self::monitor();
        return [[null], ['bad'], [[null]], [['bad' => $valid]],
            [array_fill(0, 33, $valid)], [[$valid, $valid]],
            [[$valid, self::monitor('b')]],
            [[$valid, self::monitor('b', 'DISPLAY2')]],
            [[array_replace($valid, ['id' => 'DISPLAY2'])]],
            [[array_replace($valid, ['width' => 0])]],
            [[array_replace($valid, ['width' => '1920'])]],
            [[array_replace($valid, ['left' => -1000001])]],
            [[array_replace($valid, ['name' => str_repeat('a', 129)])]],
            [[array_replace($valid, ['name' => "bad\0name"])]],
            [[array_replace($valid, ['isPrimary' => 1])]]];
    }
}
