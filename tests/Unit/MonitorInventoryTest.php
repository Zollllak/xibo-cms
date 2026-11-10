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

    public function testKeepsDipGeometrySeparateFromRenderingPixels(): void
    {
        $monitor = array_replace(self::monitor(), ['geometryUnits' => 'dip', 'width' => 1470,
            'height' => 956, 'left' => 0, 'top' => 0, 'pixelWidth' => 2940, 'pixelHeight' => 1912]);
        $report = MonitorInventory::fromReport([$monitor], 'now');
        $this->assertSame($monitor, $report['monitors'][0]);
        $legacy = self::monitor();
        $this->assertSame($legacy, MonitorInventory::fromReport([$legacy], 'now')['monitors'][0]);
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
            [[array_replace($valid, ['isPrimary' => 1])]],
            [[array_replace($valid, ['geometryUnits' => 'unknown'])]],
            [[array_replace($valid, ['geometryUnits' => null])]],
            [[array_replace($valid, ['geometryUnits' => []])]],
            [[array_replace($valid, ['geometryUnits' => 'dip'])]],
            [[array_replace($valid, ['pixelWidth' => 1920])]],
            [[array_replace($valid, ['pixelWidth' => 0, 'pixelHeight' => 1080])]],
            [[array_replace($valid, ['pixelWidth' => 1920, 'pixelHeight' => '1080'])]]];
    }
}
