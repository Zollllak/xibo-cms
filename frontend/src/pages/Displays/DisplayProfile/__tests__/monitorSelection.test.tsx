import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WindowsFields } from '../components/fields/WindowsFields';
import { getFieldMetaForType } from '../components/fields/fieldMetadata';

const t = ((key: string) => key) as TFunction;

function LocationFields({ saved = 'default' }: { saved?: string }) {
  const [values, setValues] = useState<Record<string, string>>({ monitorSelection: saved });
  return (
    <>
      <WindowsFields
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

describe('Windows monitor selection', () => {
  it('loads the default and lets the user choose and reset a secondary monitor', async () => {
    const user = userEvent.setup();
    render(<LocationFields />);
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
  });

  it('shows a previously saved choice and keeps the manual controls available', () => {
    render(<LocationFields saved="secondary" />);
    expect(screen.getByRole('combobox', { name: 'Player monitor' })).toHaveTextContent(
      'Secondary monitor',
    );
    expect(screen.getByLabelText('Width')).toBeInTheDocument();
    expect(screen.getByLabelText('Left Coordinate')).toBeInTheDocument();
    expect(
      screen.getByText(/Restart the Player after it receives this setting/),
    ).toBeInTheDocument();
  });

  it('is offered only for Windows profiles and display overrides', () => {
    expect(getFieldMetaForType('windows', t).monitorSelection).toBeDefined();
    for (const type of ['linux', 'android', 'lg', 'sssp', 'chromeOS', 'hisense'] as const) {
      expect(getFieldMetaForType(type, t).monitorSelection).toBeUndefined();
    }
  });
});
