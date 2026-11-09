<?php
/* SPDX-License-Identifier: AGPL-3.0-or-later */
namespace Xibo\Helper;

/** Validate player-reported monitor data before it reaches storage or the dashboard. */
class MonitorInventory
{
    public static function isMonitorId(string $id): bool
    {
        return preg_match('/^monitor:[a-f0-9]{64}$/D', $id) === 1;
    }

    public static function fromReport(mixed $monitors, string $reportedAt): array
    {
        if (!is_array($monitors) || !array_is_list($monitors) || count($monitors) > 32) {
            throw new \InvalidArgumentException('Invalid monitor list');
        }
        $ids = [];
        $devices = [];
        $result = [];
        $primaryCount = 0;
        foreach ($monitors as $monitor) {
            if (!is_array($monitor)
                || !is_string($monitor['id'] ?? null)
                || !self::isMonitorId($monitor['id'])
                || isset($ids[$monitor['id']])
                || !is_bool($monitor['isPrimary'] ?? null)
            ) {
                throw new \InvalidArgumentException('Invalid monitor identity');
            }
            foreach (['name', 'deviceName'] as $key) {
                if (!is_string($monitor[$key] ?? null)
                    || trim($monitor[$key]) === ''
                    || mb_strlen($monitor[$key]) > 128
                    || preg_match('/[\x00-\x1f\x7f]/', $monitor[$key])
                ) {
                    throw new \InvalidArgumentException('Invalid monitor name');
                }
            }
            if (isset($devices[$monitor['deviceName']])) {
                throw new \InvalidArgumentException('Duplicate monitor device');
            }
            foreach (['width', 'height', 'left', 'top'] as $key) {
                $dimension = in_array($key, ['width', 'height']);
                if (!is_int($monitor[$key] ?? null)
                    || $monitor[$key] < ($dimension ? 1 : -1000000)
                    || $monitor[$key] > ($dimension ? 65535 : 1000000)
                ) {
                    throw new \InvalidArgumentException('Invalid monitor bounds');
                }
            }
            if ($monitor['isPrimary'] && ++$primaryCount > 1) {
                throw new \InvalidArgumentException('Multiple primary monitors');
            }
            $ids[$monitor['id']] = true;
            $devices[$monitor['deviceName']] = true;
            // Store only fields in the contract, never arbitrary player input.
            $result[] = array_intersect_key($monitor, array_flip([
                'id', 'name', 'deviceName', 'isPrimary', 'width', 'height', 'left', 'top',
            ]));
        }
        return ['reportedAt' => $reportedAt, 'monitors' => $result];
    }
}
