export interface GradePredicate {
  range: string;
  arabic: string;
  latin: string;
  fullPredicate: string; // e.g. "Mumtaz (ممتاز)"
  description: string;   // e.g. "Sangat Baik Sekali"
  badgeClass: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  hexColor: string;
}

export const GRADE_SCALE_TABLE: GradePredicate[] = [
  {
    range: '91–100',
    latin: 'Mumtaz',
    arabic: 'ممتاز',
    fullPredicate: 'Mumtaz (ممتاز)',
    description: 'Sangat Baik Sekali',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    hexColor: '#10b981',
  },
  {
    range: '81–90',
    latin: 'Jayyid Jiddan',
    arabic: 'جيد جدًّا',
    fullPredicate: 'Jayyid Jiddan (جيد جدًّا)',
    description: 'Sangat Baik',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/30',
    hexColor: '#3b82f6',
  },
  {
    range: '71–80',
    latin: 'Jayyid',
    arabic: 'جيد',
    fullPredicate: 'Jayyid (جيد)',
    description: 'Baik',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/30',
    hexColor: '#06b6d4',
  },
  {
    range: '61–70',
    latin: 'Maqbul',
    arabic: 'مقبول',
    fullPredicate: 'Maqbul (مقبول)',
    description: 'Cukup',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    hexColor: '#f59e0b',
  },
  {
    range: '≤60',
    latin: 'Naqis',
    arabic: 'ناقص',
    fullPredicate: 'Naqis (ناقص)',
    description: 'Perlu Bimbingan',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/30',
    hexColor: '#f43f5e',
  },
];

export function getGradePredicate(score: number): GradePredicate {
  const rounded = Math.round(score * 10) / 10;
  if (rounded >= 91) {
    return GRADE_SCALE_TABLE[0];
  } else if (rounded >= 81) {
    return GRADE_SCALE_TABLE[1];
  } else if (rounded >= 71) {
    return GRADE_SCALE_TABLE[2];
  } else if (rounded >= 61) {
    return GRADE_SCALE_TABLE[3];
  } else {
    return GRADE_SCALE_TABLE[4];
  }
}
