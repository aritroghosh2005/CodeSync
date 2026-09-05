import React from 'react';
import { ExternalLink, Bot, Check } from 'lucide-react';
import { Problem } from '../types.ts';
import { getEloConfig } from '../utils/elo.ts';
import { useHighContrast } from '../context/HighContrastContext.tsx';

interface ProblemCardProps {
  problem: Problem;
  onDeployGreedy: (problem: Problem) => void;
  onToggleSolved: (problem: Problem, solved: boolean) => void;
  isStrikedWhenSolved?: boolean;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  onDeployGreedy,
  onToggleSolved,
  isStrikedWhenSolved = false,
}) => {
  const { isHighContrast } = useHighContrast();
  const elo = getEloConfig(problem.rating, isHighContrast);
  const problemUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  const isSolved = Boolean(problem.solved);

  return (
    <div
      id={`problem-card-${problem.contestId}-${problem.index}`}
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
        elo.borderColor
      } ${elo.bgColor} ${
        isSolved && isStrikedWhenSolved
          ? isHighContrast
            ? 'bg-black border-2 border-zinc-600'
            : 'opacity-65 bg-zinc-950/40 border-zinc-800'
          : isHighContrast
          ? 'bg-black hover:border-white shadow-none'
          : 'hover:shadow-md hover:border-opacity-100'
      }`}
    >
      {/* Left side: Problem ID, Name & Codeforces Link */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Rating Pill */}
        <div
          className={`shrink-0 flex items-center justify-center font-mono font-bold text-xs px-2.5 py-1 rounded border ${elo.badgeBg}`}
          title={`Rating: ${problem.rating || 'Unrated'} (${elo.label})`}
        >
          {elo.tier === 'rainbow' ? (
            <span className={elo.textColor}>{problem.rating || '3000+'}</span>
          ) : (
            <span className={elo.textColor}>{problem.rating || 'Unrated'}</span>
          )}
        </div>

        {/* Problem Name & Tags */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              id={`link-problem-${problem.contestId}-${problem.index}`}
              href={problemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium text-sm transition-colors hover:underline flex items-center gap-1 group-hover:text-white ${
                isSolved && isStrikedWhenSolved
                  ? isHighContrast
                    ? 'line-through text-zinc-300 font-semibold'
                    : 'line-through text-zinc-400'
                  : isHighContrast
                  ? 'text-white font-bold underline'
                  : 'text-zinc-100'
              }`}
              title="Open problem on Codeforces"
            >
              <span className={isHighContrast ? 'font-bold text-zinc-300' : 'font-semibold text-zinc-400'}>
                {problem.contestId}
                {problem.index}.
              </span>{' '}
              <span className="truncate">{problem.name}</span>
              <ExternalLink className={`w-3 h-3 shrink-0 ${isHighContrast ? 'opacity-90 text-white' : 'opacity-50 hover:opacity-100 text-zinc-300'}`} />
            </a>
          </div>

          {/* Tags in # fashion */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {problem.tags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-[11px] font-mono tracking-tight ${
                    isHighContrast ? 'text-zinc-200 font-semibold' : 'text-zinc-400/90'
                  }`}
                >
                  #{tag.replace(/\s+/g, '-')}
                </span>
              ))}
              {problem.tags.length > 5 && (
                <span
                  className={`text-[11px] font-mono ${
                    isHighContrast ? 'text-zinc-300 font-semibold' : 'text-zinc-500'
                  }`}
                >
                  +{problem.tags.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Deploy Greedy's Ground & Solved Checkbox */}
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
        {/* Deploy Greedy's Ground Button */}
        <button
          id={`btn-deploy-greedy-${problem.contestId}-${problem.index}`}
          onClick={() => onDeployGreedy(problem)}
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer active:scale-95 ${
            isHighContrast
              ? 'bg-black text-yellow-300 border-2 border-yellow-300 hover:bg-yellow-400 hover:text-black font-bold'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
          }`}
          title="Open Greedy's Ground AI assistant"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Deploy Greedy’s Ground</span>
        </button>

        {/* Solved Checkbox */}
        <label
          id={`label-solved-${problem.contestId}-${problem.index}`}
          className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none px-2 py-1 rounded transition-colors ${
            isHighContrast
              ? 'text-white border border-zinc-700 bg-black hover:border-white'
              : 'text-zinc-300 hover:bg-zinc-800/60'
          }`}
        >
          <input
            id={`checkbox-solved-${problem.contestId}-${problem.index}`}
            type="checkbox"
            checked={isSolved}
            onChange={(e) => onToggleSolved(problem, e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
              isHighContrast
                ? isSolved
                  ? 'bg-yellow-400 border-2 border-yellow-300 text-black'
                  : 'border-2 border-white bg-black hover:border-yellow-300'
                : isSolved
                ? 'bg-emerald-600 border border-emerald-500 text-white'
                : 'border border-zinc-600 bg-zinc-800/80 hover:border-zinc-500'
            }`}
          >
            {isSolved && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <span
            className={
              isHighContrast
                ? isSolved
                  ? 'text-yellow-300 font-bold'
                  : 'text-white font-semibold'
                : isSolved
                ? 'text-emerald-400 font-semibold'
                : 'text-zinc-400'
            }
          >
            Solved
          </span>
        </label>
      </div>
    </div>
  );
};

