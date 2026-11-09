import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { getFieldMetaForType } from '../components/fields/fieldMetadata';
import { withReportedMonitors } from '../components/fields/monitorSelection';

const t = ((key: string, args?: Record<string, string>) =>
  args?.time ? key.replace('{{time}}', args.time) : key) as TFunction;
const meta = getFieldMetaForType('windows', t).monitorSelection!;
const monitors = [1, 2, 3, 4].map((number) => ({
  id: `monitor:${String(number).repeat(64)}`,
  name: `Monitor ${number}`,
  deviceName: `DISPLAY${number}`,
  isPrimary: number === 1,
  width: 1920,
  height: 1080,
  left: (number - 1) * 1920,
  top: 0,
}));

describe('per-display reported monitors', () => {
  it('offers every monitor, with its name, resolution and primary indicator', () => {
    const result = withReportedMonitors(
      meta,
      { reportedAt: 'now', monitors },
      monitors[3]!.id,
      t,
      '09/11/2026 15:00',
    );
    expect(result.options).toHaveLength(7);
    expect(result.wrapLabels).toBe(true);
    expect(result.options?.find((option) => option.value === monitors[3]!.id)?.label).toContain(
      'Monitor 4 — DISPLAY4 — 1920 × 1080',
    );
    expect(result.options?.find((option) => option.value === monitors[0]!.id)?.label).toContain(
      'Primary monitor',
    );
    expect(result.helpText).toContain('09/11/2026 15:00');
    expect(meta.options).toHaveLength(3);
  });

  it('keeps a disconnected monitor selectable without switching its saved identity', () => {
    const selected = monitors[2]!.id;
    const result = withReportedMonitors(
      meta,
      { reportedAt: 'now', monitors: monitors.slice(0, 2) },
      selected,
      t,
      'now',
    );
    expect(result.options?.find((option) => option.value === selected)?.label).toBe(
      'Selected monitor (not in the latest report)',
    );
  });

  it('does not invent connected monitors before the first report', () => {
    const result = withReportedMonitors(meta, null, monitors[2]!.id, t, '');
    expect(result.options).toHaveLength(4);
    expect(result.helpText).toContain('No monitors reported yet');
    expect(result.options?.[3]?.value).toBe(monitors[2]!.id);
  });
});
