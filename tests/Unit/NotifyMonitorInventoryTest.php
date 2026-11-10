<?php
namespace Xibo\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Xibo\Entity\Display;
use Xibo\Service\ConfigServiceInterface;
use Xibo\Service\LogServiceInterface;
use Xibo\Support\Sanitizer\RespectSanitizer;
use Xibo\Xmds\LogProcessor;
use Xibo\Xmds\Soap;
use Xibo\Xmds\Soap7;

class NotifyMonitorInventoryTest extends TestCase
{
    protected function playerType(): string
    {
        return 'windows';
    }

    private function soap(Display $display, bool $authorized = true): Soap7
    {
        $soap = $this->getMockBuilder(Soap7::class)->disableOriginalConstructor()->onlyMethods([
            'authDisplay', 'checkBandwidth', 'getConfig', 'getSanitizer', 'logBandwidth', 'getLog',
        ])->getMock();
        $soap->method('authDisplay')->willReturn($authorized);
        $soap->method('checkBandwidth')->willReturn(true);
        $soap->method('getSanitizer')->willReturnCallback(
            fn($input) => (new RespectSanitizer())->setCollection($input)
        );
        $config = $this->createMock(ConfigServiceInterface::class);
        $config->method('getSetting')->willReturnCallback(fn($key) => $key === 'SERVER_KEY' ? 'test-key' : 0);
        $soap->method('getConfig')->willReturn($config);
        $soap->method('getLog')->willReturn($this->createMock(LogServiceInterface::class));
        foreach (['display' => $display, 'logProcessor' => $this->createMock(LogProcessor::class)] as $key => $value) {
            (new \ReflectionProperty(Soap::class, $key))->setValue($soap, $value);
        }
        return $soap;
    }

    private function display(): Display
    {
        $display = $this->createMock(Display::class);
        $display->clientType = $this->playerType();
        $display->monitorInventory = ['reportedAt' => 'previous', 'monitors' => []];
        $display->method('getChangedProperties')->willReturn(['monitorInventory']);
        return $display;
    }

    public function testAuthenticatedStatusPersistsTheMonitorReport(): void
    {
        $display = $this->display();
        $display->expects($this->once())->method('save')->willReturnCallback(function () use ($display) {
            $this->assertCount(3, $display->monitorInventory['monitors']);
            $this->assertNotSame('previous', $display->monitorInventory['reportedAt']);
        });
        $result = $this->soap($display)->NotifyStatus('test-key', 'test-display', json_encode(['monitors' => [
            MonitorInventoryTest::monitor('a', 'DISPLAY1'),
            array_replace(MonitorInventoryTest::monitor('b', 'DISPLAY2'), ['isPrimary' => false]),
            array_replace(MonitorInventoryTest::monitor('c', 'DISPLAY3'), ['isPrimary' => false]),
        ]]));
        $this->assertTrue($result);
    }

    public function testLegacyAndMalformedReportsDoNotEraseTheInventory(): void
    {
        $display = $this->display();
        $previous = $display->monitorInventory;
        $soap = $this->soap($display);
        $soap->NotifyStatus('test-key', 'test-display', '{}');
        $this->assertSame($previous, $display->monitorInventory);
        $soap->NotifyStatus('test-key', 'test-display', '{"monitors":"bad"}');
        $this->assertSame($previous, $display->monitorInventory);
        $soap->NotifyStatus('test-key', 'test-display', '{"monitors":[]}');
        $this->assertSame([], $display->monitorInventory['monitors']);
        $this->assertNotSame('previous', $display->monitorInventory['reportedAt']);
    }

    public function testUnauthorizedPlayerCannotChangeTheInventory(): void
    {
        $display = $this->display();
        $display->expects($this->never())->method('save');
        $this->expectException(\SoapFault::class);
        $this->soap($display, false)->NotifyStatus('test-key', 'unknown-display', '{"monitors":[]}');
    }
    public function testUnrelatedPlayerTypesDoNotOverwriteMonitorInventory(): void
    {
        $display = $this->display();
        $display->clientType = 'android';
        $previous = $display->monitorInventory;
        $this->soap($display)->NotifyStatus('test-key', 'test-display', '{"monitors":[]}');
        $this->assertSame($previous, $display->monitorInventory);
    }

}
