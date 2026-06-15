import type { PerceptionMode, HiddenScore } from '@shared-field/shared';

type ScoreLine = { label: string; value: number | string };

type TranslatedScore = {
  primary: ScoreLine;
  all: ScoreLine[];
};

export function translateScore(score: HiddenScore, mode: PerceptionMode): TranslatedScore {
  const label = mode === 'garden' ? 'Plants Grown' : 'Fires Extinguished';
  const all: ScoreLine[] = [{ label, value: Math.round(score.totalReduction) }];
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
