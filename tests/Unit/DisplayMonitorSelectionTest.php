<?php
namespace Xibo\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Xibo\Controller\DisplayProfileConfigFields;
use Xibo\Entity\Display;
use Xibo\Entity\DisplayProfile;
use Xibo\Factory\CommandFactory;
use Xibo\Factory\DisplayProfileFactory;
use Xibo\Service\ConfigServiceInterface;
use Xibo\Service\LogServiceInterface;
use Xibo\Support\Exception\InvalidArgumentException;
use Xibo\Support\Sanitizer\RespectSanitizer;

class DisplayMonitorSelectionTest extends TestCase
{
    protected function playerType(): string
    {
        return 'windows';
    }

    private DisplayProfile $profile;
    private object $controller;

    protected function setUp(): void
    {
        $log = $this->createMock(LogServiceInterface::class);
        $config = $this->createMock(ConfigServiceInterface::class);
        $commands = $this->createMock(CommandFactory::class);
        $factory = new DisplayProfileFactory($config, $commands);
        $this->profile = new DisplayProfile(null, $log, null, $config, $commands, $factory);
        $this->profile->config = [];
        $this->profile->setClientType($this->playerType());
        $this->profile->load(['loadCommands' => false]);
        $this->controller = new class ($log) {
            use DisplayProfileConfigFields;
            public function __construct(private LogServiceInterface $log)
            {
            }
            public function getLog(): LogServiceInterface
            {
                return $this->log;
            }
        };
    }

    private function edit(array $values, ?array $override = null, ?Display $display = null): ?array
    {
        return $this->controller->editConfigFields(
            $this->profile,
            (new RespectSanitizer())->setCollection($values),
            $override,
            $display
        );
    }

    public function testExistingProfilesKeepManualPositioning(): void
    {
        $this->assertSame('default', $this->profile->getSetting('monitorSelection'));
        $this->edit(['sizeX' => 1920, 'offsetX' => -1920]);
        $this->assertSame('default', $this->profile->getSetting('monitorSelection'));
        $this->assertEquals(-1920, $this->profile->getSetting('offsetX'));
        $setting = array_values(array_filter(
            $this->profile->configDefault,
            fn($entry) => $entry['name'] === 'monitorSelection'
        ))[0];
        $this->assertSame('string', $setting['type']);
    }

    public function testProfileSelectionPersistsAndCanBeReset(): void
    {
        $this->edit(['monitorSelection' => 'secondary']);
        $this->assertSame('secondary', $this->profile->getSetting('monitorSelection'));
        $this->assertContains(['name' => 'monitorSelection', 'value' => 'secondary'], $this->profile->config);
        $this->edit([]);
        $this->assertSame('secondary', $this->profile->getSetting('monitorSelection'));
        $this->edit(['monitorSelection' => 'primary']);
        $this->assertSame('primary', $this->profile->getSetting('monitorSelection'));
        $this->edit(['monitorSelection' => 'default']);
        $this->assertSame('default', $this->profile->getSetting('monitorSelection'));
        $this->assertSame([], $this->profile->config);
    }

    public function testDisplayOverrideDoesNotChangeItsProfile(): void
    {
        $this->edit(['monitorSelection' => 'secondary']);
        $display = $this->createMock(Display::class);
        $display->method('getSetting')->willReturn('secondary');
        $override = $this->edit(['monitorSelection' => 'primary'], [], $display);
        $this->assertSame([['name' => 'monitorSelection', 'value' => 'primary']], $override);
        $this->assertSame('secondary', $this->profile->getSetting('monitorSelection'));
        $this->assertSame([], $this->edit(['monitorSelection' => null], $override, $display));
        $this->assertSame([], $this->edit(['monitorSelection' => 'secondary'], [], $display));
    }

    public function testSpecificMonitorPersistsAcrossDisplayOverrides(): void
    {
        $id = 'monitor:' . str_repeat('a', 64);
        $display = $this->createMock(Display::class);
        $display->method('getSetting')->willReturn('default');
        $override = $this->edit(['monitorSelection' => $id], [], $display);
        $this->assertSame([['name' => 'monitorSelection', 'value' => $id]], $override);
        // The inventory may have changed; keeping the saved identity must remain valid.
        $this->assertSame($override, $this->edit(['monitorSelection' => $id], $override, $display));
        $this->assertSame([], $this->edit(['monitorSelection' => null], $override, $display));
        $this->assertSame('default', $this->profile->getSetting('monitorSelection'));
    }

    #[DataProvider('emptyValues')]
    public function testClearingAProfileRestoresItsDefault($value): void
    {
        $this->edit(['monitorSelection' => 'secondary']);
        $this->edit(['monitorSelection' => $value]);
        $this->assertSame('default', $this->profile->getSetting('monitorSelection'));
    }

    public static function emptyValues(): array
    {
        return [[null], ['']];
    }

    #[DataProvider('invalidValues')]
    public function testInvalidMonitorIsRejectedWithoutChangingTheProfile($value): void
    {
        $this->edit(['monitorSelection' => 'secondary']);
        try {
            $this->edit(['monitorSelection' => $value]);
            $this->fail('Invalid monitor accepted');
        } catch (InvalidArgumentException $exception) {
            $this->assertSame('secondary', $this->profile->getSetting('monitorSelection'));
        }
    }

    public static function invalidValues(): array
    {
        return [['monitor2'], ['SECONDARY'], ['2'], [2], [['secondary']],
            ['monitor:'], ['monitor:' . str_repeat('a', 63)], ['monitor:' . str_repeat('g', 64)]];
    }
}
