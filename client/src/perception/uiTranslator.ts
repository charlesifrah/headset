import type { PerceptionMode, HiddenScore } from '@shared-field/shared';

type ScoreLine = { label: string; value: number | string };

type TranslatedScore = {
  primary: ScoreLine;
  all: ScoreLine[];
};

export function translateScore(score: HiddenScore, mode: PerceptionMode): TranslatedScore {
  const efficiency =
    score.actionTimeMs > 0
      ? Math.round((score.totalReduction / (score.actionTimeMs / 1000)) * 10) / 10
      : 0;

  if (mode === 'garden') {
    const all: ScoreLine[] = [
      { label: 'Plants Grown', value: Math.round(score.totalReduction) },
      { label: 'Garden Saves', value: Math.round(score.criticalSaves) },
      { label: 'Water Efficiency', value: efficiency },
      { label: 'Bloom Chains', value: Math.round(score.chainPreventions) },
    ];
    return { primary: all[0], all };
  }

  const all: ScoreLine[] = [
    { label: 'Fires Extinguished', value: Math.round(score.totalReduction) },
    { label: 'Sector Saves', value: Math.round(score.criticalSaves) },
    { label: 'Suppression Efficiency', value: efficiency },
    { label: 'Flare Stops', value: Math.round(score.chainPreventions) },
  ];
  return { primary: all[0], all };
}

export function translateEventMessage(
  messageKey: string,
  mode: PerceptionMode
): string {
  const translations: Record<string, Record<PerceptionMode, string>> = {
    partner_helped_zone: {
      garden: 'Your partner helped revive a patch',
      fire: 'Your partner helped contain a flare',
    },
    chain_started: {
      garden: 'A bloom chain started!',
      fire: 'A suppression chain started!',
    },
    zone_critical: {
      garden: 'A patch is severely dry!',
      fire: 'A sector is ablaze!',
    },
    zone_saved: {
      garden: 'A garden was saved!',
      fire: 'A sector was saved!',
    },
  };

  return translations[messageKey]?.[mode] ?? messageKey;
}
