import type { TFunction } from 'i18next';

import type { FieldMeta } from './fieldMetadata';

import type { MonitorInventory } from '@/types/display';

/** Hardware-specific choices belong to one Display, not a shared settings profile. */
export function withReportedMonitors(
  meta: FieldMeta,
  inventory: MonitorInventory | null | undefined,
  selected: string | undefined,
  t: TFunction,
  reportedAtLabel: string,
): FieldMeta {
  const options = [...(meta.options ?? [])];
  for (const monitor of inventory?.monitors ?? []) {
    options.push({
      value: monitor.id,
      label: `${monitor.name} — ${monitor.deviceName} — ${monitor.width} × ${monitor.height}${monitor.isPrimary ? ` (${t('Primary monitor')})` : ''}`,
    });
  }
  // Preserve a selected device when it is disconnected or the report is unavailable.
  if (selected?.startsWith('monitor:') && !options.some((option) => option.value === selected)) {
    options.push({ value: selected, label: t('Selected monitor (not in the latest report)') });
  }
  return {
    ...meta,
    options,
    wrapLabels: true,
    helpText: inventory?.monitors.length
      ? `${t('Choose a monitor from the latest Player report. If it is disconnected, the primary is used until it returns. Restart the Player after it receives this setting.')} ${t('Last report: {{time}}', { time: reportedAtLabel })}`
      : t(
          'No monitors reported yet. Connect a Player with monitor selection and wait for its next report. Your saved choice is kept.',
        ),
  };
}
