const ACCENTS = {
  romeo: '#87CEEB',
  vortex: '#2DD4BF',
  'purple-galaxy': '#8B5CF6',
  insomnia: '#4ADE80',
  'golden-sunset': '#D4A574',
  'sweet-life': '#D946EF',
};

export function accentFor(seriesSlug) {
  return ACCENTS[seriesSlug] ?? 'rgba(255,255,255,0.16)';
}

export function textAccentFor(seriesSlug) {
  return ACCENTS[seriesSlug] ?? '#B8B8B8';
}

export function formatPrice(amount) {
  return `€${amount.toLocaleString('en-US')}`;
}
