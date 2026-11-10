import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LinuxFields } from '../components/fields/LinuxFields';
import { WindowsFields } from '../components/fields/WindowsFields';
import { getFieldMetaForType } from '../components/fields/fieldMetadata';
import { withReportedMonitors } from '../components/fields/monitorSelection';

const t = ((key: string) => key) as TFunction;

function LocationFields({
  saved = 'default',
  type = 'windows',
}: {
  saved?: string;
  type?: 'windows' | 'linux';
}) {
  const Fields = type === 'linux' ? LinuxFields : WindowsFields;
  const [values, setValues] = useState<Record<string, string>>({ monitorSelection: saved });
  return (
    <>
      <Fields
        str={(key) => values[key] ?? ''}
        num={() => 0}
        bool={() => false}
        setStr={(key) => (value) => setValues((prev) => ({ ...prev, [key]: value }))}
        setNum={() => vi.fn()}
        setBool={() => vi.fn()}
        t={t}
        tab="location"
        dayparts={[]}
      />
      <output aria-label="Saved monitor">{values.monitorSelection}</output>
    </>
  );
}

describe('Windows and Linux monitor selection', () => {
  it.each(['windows', 'linux'] as const)(
    '%s loads the default and lets the user choose and reset a secondary monitor',
    async (type) => {
      const user = userEvent.setup();
      render(<LocationFields type={type} />);
      const select = screen.getByRole('combobox', { name: 'Player monitor' });
      expect(select).toHaveTextContent('Current default (window size and coordinates)');
      await user.click(select);
      await user.click(screen.getByRole('option', { name: 'Secondary monitor' }));
      expect(screen.getByLabelText('Saved monitor')).toHaveTextContent('secondary');
      expect(select).toHaveTextContent('Secondary monitor');
      await user.click(select);
      await user.click(
        screen.getByRole('option', { name: 'Current default (window size and coordinates)' }),
      );
      expect(screen.getByLabelText('Saved monitor')).toHaveTextContent('default');
    },
  );

  it.each(['windows', 'linux'] as const)(
    '%s shows a saved choice and keeps manual controls available',
    (type) => {
      render(<LocationFields saved="secondary" type={type} />);
      expect(screen.getByRole('combobox', { name: 'Player monitor' })).toHaveTextContent(
        'Secondary monitor',
      );
      expect(screen.getByLabelText('Width')).toBeInTheDocument();
      expect(screen.getByLabelText('Left Coordinate')).toBeInTheDocument();
      expect(
        screen.getByText(/Restart the Player after it receives this setting/),
      ).toBeInTheDocument();
    },
  );

  it('is offered for Windows and Linux profiles and display overrides', () => {
    expect(getFieldMetaForType('windows', t).monitorSelection).toBeDefined();
    expect(getFieldMetaForType('linux', t).monitorSelection).toBeDefined();
    for (const type of ['android', 'lg', 'sssp', 'chromeOS', 'hisense'] as const) {
      expect(getFieldMetaForType(type, t).monitorSelection).toBeUndefined();
    }
  });
  it.each(['windows', 'linux'] as const)(
    '%s preserves an absent device without changing shared profile options',
    (type) => {
      const meta = getFieldMetaForType(type, t).monitorSelection!;
      const selected = `monitor:${'f'.repeat(64)}`;
      const enriched = withReportedMonitors(
        meta,
        { reportedAt: '2026-11-10T12:00:00Z', monitors: [] },
        selected,
        t,
        '',
      );
      expect(enriched.options).toContainEqual({
        value: selected,
        label: 'Selected monitor (not in the latest report)',
      });
      expect(meta.options?.some((option) => option.value === selected)).toBe(false);
    },
  );
  it('labels Retina monitors with rendering pixels instead of DIP dimensions', () => {
    const meta = getFieldMetaForType('linux', t).monitorSelection!;
    const monitor = {
      id: `monitor:${'e'.repeat(64)}`,
      name: 'Retina',
      deviceName: 'mac-test',
      isPrimary: true,
      width: 1470,
      height: 956,
      left: 0,
      top: 0,
      geometryUnits: 'dip' as const,
      pixelWidth: 2940,
      pixelHeight: 1912,
    };
    const enriched = withReportedMonitors(
      meta,
      { reportedAt: 'now', monitors: [monitor] },
      monitor.id,
      t,
      '',
    );
    expect(enriched.options?.find((option) => option.value === monitor.id)?.label).toContain(
      '2940 × 1912',
    );
  });
});
