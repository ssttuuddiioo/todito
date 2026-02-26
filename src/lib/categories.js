// Single source of truth for category definitions and tone-on-tone design tokens

export const CATEGORIES = [
  { id: 'active',        label: 'Active',        dot: 'bg-green-400' },
  { id: 'engagement',    label: 'Engagement',     dot: 'bg-amber-400' },
  { id: 'opportunities', label: 'Opportunities',  dot: 'bg-orange-400' },
  { id: 'sidequest',     label: 'Sidequest',      dot: 'bg-cyan-400' },
];

export const CATEGORY_TONES = {
  active: {
    card:    'bg-green-950/60 border-green-800/30',
    text:    'text-green-300',
    subtext: 'text-green-400/70',
    dot:     'bg-green-400',
    badge:   'bg-green-500/15 text-green-400',
    glow:    'hover:shadow-glow-green',
  },
  engagement: {
    card:    'bg-amber-950/60 border-amber-800/30',
    text:    'text-amber-300',
    subtext: 'text-amber-400/70',
    dot:     'bg-amber-400',
    badge:   'bg-amber-500/15 text-amber-400',
    glow:    'hover:shadow-glow-amber',
  },
  opportunities: {
    card:    'bg-orange-950/60 border-orange-800/30',
    text:    'text-orange-300',
    subtext: 'text-orange-400/70',
    dot:     'bg-orange-400',
    badge:   'bg-orange-500/15 text-orange-400',
    glow:    'hover:shadow-glow-orange',
  },
  sidequest: {
    card:    'bg-cyan-950/60 border-cyan-800/30',
    text:    'text-cyan-300',
    subtext: 'text-cyan-400/70',
    dot:     'bg-cyan-400',
    badge:   'bg-cyan-500/15 text-cyan-400',
    glow:    'hover:shadow-glow-cyan',
  },
};
