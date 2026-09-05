export type EloTier =
  | 'gray'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'violet'
  | 'orange'
  | 'red'
  | 'rainbow';

export interface EloConfig {
  tier: EloTier;
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  hex: string;
  gradient?: string;
}

export function getEloTier(rating?: number | null): EloTier {
  if (rating === undefined || rating === null || rating < 1200) {
    return 'gray';
  }
  if (rating < 1400) return 'green';
  if (rating < 1600) return 'cyan';
  if (rating < 1900) return 'blue';
  if (rating < 2100) return 'violet';
  if (rating < 2400) return 'orange';
  if (rating < 3000) return 'red';
  return 'rainbow';
}

export function getEloConfig(rating?: number | null, highContrast = false): EloConfig {
  const tier = getEloTier(rating);

  if (highContrast) {
    switch (tier) {
      case 'gray':
        return {
          tier: 'gray',
          label: 'Newbie',
          textColor: 'text-zinc-100 font-bold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-zinc-400',
          badgeBg: 'bg-zinc-900 text-white border-2 border-zinc-300 font-bold',
          hex: '#d4d4d8',
        };
      case 'green':
        return {
          tier: 'green',
          label: 'Pupil',
          textColor: 'text-emerald-300 font-bold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-emerald-400',
          badgeBg: 'bg-black text-emerald-300 border-2 border-emerald-400 font-bold',
          hex: '#34d399',
        };
      case 'cyan':
        return {
          tier: 'cyan',
          label: 'Specialist',
          textColor: 'text-cyan-200 font-bold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-cyan-400',
          badgeBg: 'bg-black text-cyan-200 border-2 border-cyan-400 font-bold',
          hex: '#38bdf8',
        };
      case 'blue':
        return {
          tier: 'blue',
          label: 'Expert',
          textColor: 'text-blue-300 font-bold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-blue-400',
          badgeBg: 'bg-black text-blue-200 border-2 border-blue-400 font-bold',
          hex: '#60a5fa',
        };
      case 'violet':
        return {
          tier: 'violet',
          label: 'Candidate Master',
          textColor: 'text-purple-300 font-bold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-purple-400',
          badgeBg: 'bg-black text-purple-200 border-2 border-purple-400 font-bold',
          hex: '#c084fc',
        };
      case 'orange':
        return {
          tier: 'orange',
          label: 'Master',
          textColor: 'text-amber-300 font-bold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-amber-400',
          badgeBg: 'bg-black text-amber-200 border-2 border-amber-400 font-bold',
          hex: '#fbbf24',
        };
      case 'red':
        return {
          tier: 'red',
          label: 'Grandmaster',
          textColor: 'text-rose-300 font-bold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-rose-400',
          badgeBg: 'bg-black text-rose-200 border-2 border-rose-400 font-bold',
          hex: '#f87171',
        };
      case 'rainbow':
        return {
          tier: 'rainbow',
          label: 'Legendary Grandmaster',
          textColor: 'text-yellow-300 font-extrabold',
          bgColor: 'bg-black',
          borderColor: 'border-2 border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.6)]',
          badgeBg: 'bg-black text-yellow-300 border-2 border-yellow-300 font-extrabold',
          hex: '#fde047',
          gradient: 'linear-gradient(90deg, #ff4d4d, #ffa500, #ffff00, #00ff66, #00ffff, #3399ff, #cc66ff)',
        };
    }
  }

  switch (tier) {
    case 'gray':
      return {
        tier: 'gray',
        label: 'Newbie',
        textColor: 'text-zinc-400',
        bgColor: 'bg-zinc-900/60',
        borderColor: 'border-zinc-700',
        badgeBg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        hex: '#808080',
      };
    case 'green':
      return {
        tier: 'green',
        label: 'Pupil',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-950/20',
        borderColor: 'border-emerald-700/60',
        badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50',
        hex: '#008000',
      };
    case 'cyan':
      return {
        tier: 'cyan',
        label: 'Specialist',
        textColor: 'text-cyan-400',
        bgColor: 'bg-cyan-950/20',
        borderColor: 'border-cyan-700/60',
        badgeBg: 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50',
        hex: '#03a89e',
      };
    case 'blue':
      return {
        tier: 'blue',
        label: 'Expert',
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-950/20',
        borderColor: 'border-blue-700/60',
        badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-700/50',
        hex: '#0000ff',
      };
    case 'violet':
      return {
        tier: 'violet',
        label: 'Candidate Master',
        textColor: 'text-purple-400',
        bgColor: 'bg-purple-950/20',
        borderColor: 'border-purple-700/60',
        badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-700/50',
        hex: '#a000a0',
      };
    case 'orange':
      return {
        tier: 'orange',
        label: 'Master',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-950/20',
        borderColor: 'border-amber-700/60',
        badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
        hex: '#ff8c00',
      };
    case 'red':
      return {
        tier: 'red',
        label: 'Grandmaster',
        textColor: 'text-rose-500',
        bgColor: 'bg-rose-950/20',
        borderColor: 'border-rose-700/60',
        badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-700/50',
        hex: '#ff0000',
      };
    case 'rainbow':
      return {
        tier: 'rainbow',
        label: 'Legendary Grandmaster',
        textColor: 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-cyan-400 to-purple-500 font-bold animate-pulse',
        bgColor: 'bg-zinc-900/80',
        borderColor: 'border-pink-500/80 shadow-[0_0_15px_rgba(236,72,153,0.3)]',
        badgeBg: 'bg-gradient-to-r from-red-500/30 via-emerald-500/30 to-purple-500/30 text-white border-pink-500/50',
        hex: '#ff0000',
        gradient: 'linear-gradient(90deg, #ff0000, #ff8c00, #ffff00, #00ff00, #00ffff, #0000ff, #8b00ff)',
      };
  }
}
