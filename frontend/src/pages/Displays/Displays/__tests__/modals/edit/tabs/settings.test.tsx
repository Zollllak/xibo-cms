/*
 * Copyright (C) 2026 Xibo Signage Ltd
 *
 * Xibo - Digital Signage - https://xibosignage.com
 *
 * This file is part of Xibo.
 *
 * Xibo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * Xibo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Xibo.  If not, see <http://www.gnu.org/licenses/>.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { vi, beforeEach, describe, test, expect } from 'vitest';

import { mockDisplay } from '../../../fixtures/display';
import { renderEditModal } from '../helpers/renderEditModal';

import { fetchDisplayProfileById } from '@/services/displayProfileApi';
import { updateDisplay } from '@/services/displaysApi';
import { testQueryClient } from '@/setupTests';

// =============================================================================
// Module mocks
// =============================================================================

vi.mock('@/services/displaysApi', () => ({
  updateDisplay: vi.fn(),
  fetchDisplayVenues: vi.fn().mockResolvedValue([]),
  fetchDisplayLocales: vi.fn().mockResolvedValue([]),
  fetchDisplays: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
}));
vi.mock('@/services/displayProfileApi', () => ({
  fetchDisplayProfile: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
  fetchDisplayProfileById: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/services/folderApi', () => ({
  fetchFolderById: vi.fn().mockResolvedValue({ id: 1, text: 'Root' }),
  fetchFolderTree: vi.fn().mockResolvedValue([]),
  searchFolders: vi.fn().mockResolvedValue([]),
  fetchContextButtons: vi.fn().mockResolvedValue({ create: true }),
  selectFolder: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/services/layoutsApi', () => ({
  fetchLayouts: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
}));
vi.mock('@/services/playerSoftwareApi', () => ({
  fetchPlayerSoftware: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
}));
vi.mock('@/services/daypartApi', () => ({
  fetchDaypart: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
}));
vi.mock('@/components/ui/modals/Modal');
vi.mock('@/components/ui/forms/SelectFolder', () => ({
  default: ({ selectedId }: { selectedId?: number | null }) => (
    <div data-testid="mock-select-folder" data-folder-id={selectedId ?? ''} />
  ),
}));

// =============================================================================
// Tests
// =============================================================================

describe('Display - edit form: Settings tab', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
  });

  // When no display profile is assigned and the default profile returns no
  // settings, the tab shows a "no settings" message rather than the overrides
  // table. This smoke test confirms the tab renders without errors.
  test('shows no-settings message when no profile is configured', async () => {
    const user = userEvent.setup();
    await renderEditModal();
    await user.click(screen.getByRole('tab', { name: 'Settings' }));

    await screen.findByText('No settings available for this profile.');
  });

  // ---------------------------------------------------------------------------
  // Settings Profile (SelectDropdown with role="combobox")
  // ---------------------------------------------------------------------------

  test('settings profile combobox is present', async () => {
    const user = userEvent.setup();
    await renderEditModal();
    await user.click(screen.getByRole('tab', { name: 'Settings' }));

    expect(screen.getByRole('combobox', { name: /settings profile/i })).not.toBeDisabled();
  });

  test('selects the third reported monitor and sends its persistent ID when saving', async () => {
    const user = userEvent.setup();
    const monitors = [1, 2, 3].map((number) => ({
      id: `monitor:${String(number).repeat(64)}`,
      name: `Monitor ${number}`,
      deviceName: `DISPLAY${number}`,
      isPrimary: number === 1,
      width: 1920,
      height: 1080,
      left: (number - 1) * 1920,
      top: 0,
    }));
    vi.mocked(fetchDisplayProfileById).mockResolvedValue({
      displayProfileId: 1,
      name: 'Windows',
      type: 'windows',
      isDefault: 1,
      config: [],
      configDefault: [{ name: 'monitorSelection', default: 'default', type: 'string' }],
    } as Awaited<ReturnType<typeof fetchDisplayProfileById>>);
    vi.mocked(updateDisplay).mockResolvedValue({ ...mockDisplay, displayId: 1 });
    await renderEditModal({
      data: {
        ...mockDisplay,
        clientType: 'windows',
        displayProfileType: 'windows',
        displayProfileId: 1,
        monitorInventory: { reportedAt: '2026-11-09T18:00:00Z', monitors },
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    const row = await screen.findByRole('row', { name: /Player monitor/ });
    await user.click(within(row).getByRole('button', { name: 'Override' }));
    await user.click(screen.getByRole('combobox', { name: 'Player monitor' }));
    await user.click(screen.getByRole('option', { name: /Monitor 3 — DISPLAY3/ }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(row).toHaveTextContent('Monitor 3 — DISPLAY3');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateDisplay).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        overrideValues: expect.objectContaining({ monitorSelection: monitors[2]!.id }),
      }),
    );
  });
});
