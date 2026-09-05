import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  Compass,
  RefreshCw,
  Flame,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Problem, ExpeditionHunt } from '../types.ts';
import { ProblemCard } from './ProblemCard.tsx';
import { getEloConfig, getEloTier } from '../utils/elo.ts';
import { useHighContrast } from '../context/HighContrastContext.tsx';

interface ExpeditionsViewProps {
  userHandle: string;
  onDeployGreedy: (problem: Problem) => void;
  onProblemSolvedMovedToLib: (problem: Problem) => void;
}

export const ExpeditionsView: React.FC<ExpeditionsViewProps> = ({
  userHandle,
  onDeployGreedy,
  onProblemSolvedMovedToLib,
}) => {
  const [baseRating, setBaseRating] = useState<number>(1200);
  const [hunt, setHunt] = useState<ExpeditionHunt | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [hasTriggeredVictory, setHasTriggeredVictory] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { isHighContrast } = useHighContrast();

  // Load existing hunt from database for this user
  useEffect(() => {
    let isMounted = true;
    const fetchHunt = async () => {
      try {
        const res = await fetch(`/api/expedition/${encodeURIComponent(userHandle)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.hunt) {
            setHunt(data.hunt);
            if (data.hunt.baseRating) {
              setBaseRating(data.hunt.baseRating);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load expedition hunt:', err);
      }
    };
    fetchHunt();
    return () => {
      isMounted = false;
    };
  }, [userHandle]);

  const handleGenerateHunt = async () => {
    setIsLoading(true);
    setActionError(null);
    setHasTriggeredVictory(false);
    setShowVictoryModal(false);

    try {
      const res = await fetch('/api/expedition/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: userHandle,
          baseRating,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to generate hunt`);
      }

      const data = await res.json();
      if (data.success && data.hunt) {
        setHunt(data.hunt);
      }
    } catch (err: any) {
      console.error('Error generating hunt:', err);
      setActionError(err.message || 'Failed to generate hunt. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCelebration = () => {
    // Canvas confetti burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 250);

    setShowVictoryModal(true);
  };

  const handleToggleSolved = async (problem: Problem, solved: boolean) => {
    if (!hunt) return;

    // Optimistically update UI
    const previousHunt = hunt;
    const updatedProblems = hunt.problems.map((p) =>
      p.problemId === problem.problemId ? { ...p, solved } : p
    );
    const solvedCount = updatedProblems.filter((p) => p.solved).length;
    const isNowCompleted = solvedCount === 5;

    setHunt({
      ...hunt,
      problems: updatedProblems,
      completed: isNowCompleted,
    });

    if (solved) {
      onProblemSolvedMovedToLib(problem);
    }

    if (isNowCompleted && !hasTriggeredVictory) {
      setHasTriggeredVictory(true);
      triggerCelebration();
    }

    try {
      const res = await fetch('/api/expedition/toggle-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: userHandle,
          problemId: problem.problemId,
          solved,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server');
      }

      const data = await res.json();
      if (data.success && data.hunt) {
        setHunt(data.hunt);
        if (data.completed && !hasTriggeredVictory) {
          setHasTriggeredVictory(true);
          triggerCelebration();
        }
      }
    } catch (err) {
      console.error('Failed to sync solved status:', err);
      // Rollback on error
      setHunt(previousHunt);
    }
  };

  const solvedCount = hunt ? hunt.problems.filter((p) => p.solved).length : 0;
  const progressPercent = (solvedCount / 5) * 100;
  const circumference = 2 * Math.PI * 26; // r=26
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;
  const currentBaseElo = getEloConfig(baseRating, isHighContrast);

  return (
    <div id="expeditions-container" className="space-y-6">
      {/* Top Banner & Elo Rating Line */}
      <div
        id="expedition-rating-slider-section"
        className={`rounded-2xl p-5 sm:p-6 shadow-xl space-y-6 transition-colors ${
          isHighContrast
            ? 'border-2 border-white bg-black'
            : 'border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className={`w-5 h-5 ${isHighContrast ? 'text-yellow-300' : 'text-emerald-400'}`} />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Expedition Base Camp
              </h2>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isHighContrast ? 'text-zinc-200' : 'text-zinc-400'}`}>
              Select your base rating <strong className="text-white">X</strong>. CodeSync will curate a 5-tier ascending gauntlet rated from <strong className="text-white">{baseRating}</strong> to <strong className="text-white">{baseRating + 400}</strong>.
            </p>
          </div>

          {/* Current Selection Pill & Generate Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-mono font-bold text-sm ${currentBaseElo.badgeBg}`}
            >
              <span className={`text-xs font-sans font-normal ${isHighContrast ? 'text-zinc-300' : 'text-zinc-400'}`}>Base:</span>
              <span className={currentBaseElo.textColor}>{baseRating}</span>
              <span className={`text-xs font-sans ${isHighContrast ? 'text-zinc-300 font-semibold' : 'text-zinc-500'}`}>({currentBaseElo.label})</span>
            </div>

            <button
              id="btn-generate-hunt"
              onClick={handleGenerateHunt}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer ${
                isHighContrast
                  ? 'bg-black text-yellow-300 border-2 border-yellow-300 hover:bg-yellow-400 hover:text-black shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-950/50'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Curating Hunt...</span>
                </>
              ) : (
                <>
                  <Flame className={`w-4 h-4 ${isHighContrast ? 'text-yellow-300' : 'text-amber-300'}`} />
                  <span>Generate Hunt</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rating Line (800 to 3100) coloured as per Elo scheme */}
        <div className="space-y-2 pt-1">
          <div className={`flex items-center justify-between text-xs font-mono font-bold ${isHighContrast ? 'text-zinc-200' : 'text-zinc-400'}`}>
            <span>800 (Newbie)</span>
            <span className="hidden sm:inline">1600 (Expert)</span>
            <span className="hidden sm:inline">2400 (Grandmaster)</span>
            <span>3100 (Legendary GM)</span>
          </div>

          {/* Elo colored track background */}
          <div className={`relative h-3 w-full rounded-full overflow-hidden flex shadow-inner ${isHighContrast ? 'border border-white' : ''}`}>
            <div className="h-full bg-zinc-500" style={{ width: '17.4%' }} title="0-1199: Gray" />
            <div className="h-full bg-emerald-500" style={{ width: '8.7%' }} title="1200-1399: Green" />
            <div className="h-full bg-cyan-400" style={{ width: '8.7%' }} title="1400-1599: Cyan" />
            <div className="h-full bg-blue-500" style={{ width: '13%' }} title="1600-1899: Blue" />
            <div className="h-full bg-purple-500" style={{ width: '8.7%' }} title="1900-2099: Violet" />
            <div className="h-full bg-amber-500" style={{ width: '13%' }} title="2100-2399: Orange" />
            <div className="h-full bg-rose-600" style={{ width: '26%' }} title="2400-2999: Red" />
            <div className="h-full bg-gradient-to-r from-rose-600 via-amber-400 via-emerald-400 via-cyan-400 to-purple-600" style={{ width: '4.5%' }} title="3000+: Rainbow" />
          </div>

          {/* Range Slider for Base Rating X (800 to 2700, so X+400 <= 3100) */}
          <div className="relative pt-1">
            <input
              id="slider-base-rating"
              type="range"
              min={800}
              max={2700}
              step={100}
              value={baseRating}
              onChange={(e) => setBaseRating(Number(e.target.value))}
              className={`w-full cursor-pointer h-2.5 rounded-lg appearance-none ${
                isHighContrast
                  ? 'bg-zinc-800 accent-yellow-400 border border-white'
                  : 'accent-emerald-500 bg-zinc-800'
              }`}
            />
          </div>

          {/* Quick Base Rating Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <span className={`text-[11px] font-mono mr-1 ${isHighContrast ? 'text-zinc-200 font-bold' : 'text-zinc-500'}`}>Quick Select:</span>
            {[800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600].map((val) => {
              return (
                <button
                  key={val}
                  id={`btn-preset-rating-${val}`}
                  onClick={() => setBaseRating(val)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-all cursor-pointer ${
                    isHighContrast
                      ? baseRating === val
                        ? 'bg-yellow-400 text-black font-bold border-2 border-yellow-200 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                        : 'bg-black text-white border-2 border-zinc-500 hover:border-white font-semibold'
                      : baseRating === val
                      ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-semibold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hunt Display Area */}
      {hunt ? (
        <div id="active-hunt-section" className="space-y-4">
          {/* Circular Status Bar and Hunt Summary Card */}
          <div className={`rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
            isHighContrast
              ? 'border-2 border-white bg-black'
              : 'border border-zinc-800 bg-zinc-900/50'
          }`}>
            <div className="flex items-center gap-4">
              {/* Circular Progress Gauge */}
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
                  {/* Background track circle */}
                  <circle
                    cx="30"
                    cy="30"
                    r="26"
                    className={isHighContrast ? 'stroke-zinc-700' : 'stroke-zinc-800'}
                    strokeWidth="4"
                    fill="transparent"
                  />
                  {/* Active progress circle */}
                  <circle
                    cx="30"
                    cy="30"
                    r="26"
                    className={`transition-all duration-500 ease-out ${
                      isHighContrast ? 'stroke-yellow-400' : 'stroke-emerald-500'
                    }`}
                    strokeWidth={isHighContrast ? '5' : '4.5'}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                {/* Solved / Total Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono font-bold text-base text-white leading-none">
                    {solvedCount}
                    <span className={`text-xs font-normal ${isHighContrast ? 'text-zinc-300 font-bold' : 'text-zinc-500'}`}>/5</span>
                  </span>
                  <span className={`text-[9px] uppercase tracking-wider font-mono font-bold mt-0.5 ${
                    isHighContrast ? 'text-yellow-300' : 'text-emerald-400'
                  }`}>
                    Solved
                  </span>
                </div>
              </div>

              {/* Text Info */}
              <div>
                <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                  <span>Ascending Gauntlet: {hunt.baseRating} &rarr; {hunt.baseRating + 400}</span>
                  {hunt.completed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono">
                      Completed
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Problems are arranged in ascending order of difficulty. Marking a problem solved immediately preserves it in your Solved Library.
                </p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              {hunt.completed ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Trophy className="w-4 h-4" />
                  <span>Hunt Mastered!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>Progress: {progressPercent.toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Five Problem Cards in Ascending Order */}
          <div className="space-y-2.5">
            {hunt.problems.map((prob, idx) => (
              <div key={prob.problemId || idx} className="relative">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-[11px] font-mono text-zinc-400 font-bold border border-zinc-700 shadow-sm z-10">
                  {idx + 1}
                </div>
                <ProblemCard
                  problem={prob}
                  onDeployGreedy={onDeployGreedy}
                  onToggleSolved={handleToggleSolved}
                  isStrikedWhenSolved={true}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          id="expeditions-empty-state"
          className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center space-y-4 bg-zinc-900/30"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 shadow-sm">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-zinc-200">No Active Expedition Hunt</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
              Choose your target base rating using the slider above, then click{' '}
              <strong className="text-zinc-200">“Generate Hunt”</strong> to launch a 5-problem progressive gauntlet from Codeforces!
            </p>
          </div>
          <button
            onClick={handleGenerateHunt}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Generate Base {baseRating} Hunt</span>
          </button>
        </div>
      )}

      {/* Full-Screen Victory Animation Modal ("Hunt Complete") */}
      {showVictoryModal && (
        <div
          id="victory-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
        >
          <div className="relative max-w-md w-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-emerald-500/60 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/30 to-amber-500/20 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold">
                Achievement Unlocked
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Hunt Complete! 🎉
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Outstanding! You have successfully solved all 5 Codeforces problems in this expedition from rating{' '}
                <strong className="text-emerald-400">{hunt?.baseRating}</strong> to{' '}
                <strong className="text-emerald-400">{(hunt?.baseRating || 0) + 400}</strong>!
              </p>
            </div>

            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-400">
              All 5 problems have been permanently recorded and cataloged in your <strong className="text-zinc-200">Solved Library</strong>.
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                id="btn-victory-continue"
                onClick={() => setShowVictoryModal(false)}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg transition-all cursor-pointer"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
