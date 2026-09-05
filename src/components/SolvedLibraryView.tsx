import React, { useState, useMemo, useRef } from 'react';
import {
  Download,
  Upload,
  Search,
  Filter,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileJson,
  X,
} from 'lucide-react';
import { Problem } from '../types.ts';
import { ProblemCard } from './ProblemCard.tsx';
import { useHighContrast } from '../context/HighContrastContext.tsx';

interface SolvedLibraryViewProps {
  userHandle: string;
  problems: Problem[];
  onDeployGreedy: (problem: Problem) => void;
  onToggleSolved: (problem: Problem, solved: boolean) => void;
  onImportSuccess: (importedCount: number, updatedList: Problem[]) => void;
}

export const SolvedLibraryView: React.FC<SolvedLibraryViewProps> = ({
  userHandle,
  problems,
  onDeployGreedy,
  onToggleSolved,
  onImportSuccess,
}) => {
  const { isHighContrast } = useHighContrast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive all unique ratings and tags
  const availableRatings = useMemo(() => {
    const set = new Set<number>();
    problems.forEach((p) => {
      if (typeof p.rating === 'number') set.add(p.rating);
    });
    // Add common ratings if not already present
    [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2400, 2600, 3000].forEach((r) => set.add(r));
    return Array.from(set).sort((a, b) => a - b);
  }, [problems]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((t) => set.add(t));
      }
    });
    // Common tags
    ['greedy', 'dp', 'math', 'brute force', 'data structures', 'constructive algorithms', 'binary search', 'graphs', 'sortings', 'strings', 'two pointers', 'number theory', 'trees'].forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [problems]);

  // Filtered problems
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const idStr = `${p.contestId}${p.index}`.toLowerCase();
        const nameStr = (p.name || '').toLowerCase();
        if (!idStr.includes(q) && !nameStr.includes(q)) return false;
      }

      // Rating filter
      if (selectedRating !== 'all') {
        const r = Number(selectedRating);
        if (p.rating !== r) return false;
      }

      // Tag filter
      if (selectedTag !== 'all') {
        if (!p.tags || !p.tags.includes(selectedTag)) return false;
      }

      return true;
    });
  }, [problems, searchQuery, selectedRating, selectedTag]);

  // Export JSON function
  const handleExport = () => {
    if (problems.length === 0) {
      setImportNotice('Error: Solved Library is currently empty. Solve problems in Expeditions first to export!');
      return;
    }

    const jsonString = JSON.stringify(problems, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `CodeSyncLib_${userHandle}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON function
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportNotice(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error('Import file must contain a JSON array of problem cards.');
      }

      const res = await fetch('/api/solved/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: userHandle,
          problems: parsed,
        }),
      });

      if (!res.ok) {
        throw new Error(`Import failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setImportNotice(
          `Successfully merged ${data.importedCount} new problems into database! Total solved in library: ${data.totalCount}.`
        );
        onImportSuccess(data.importedCount, data.problems);
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setImportNotice(`Error during import: ${err.message || 'Invalid JSON format'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div id="solved-library-container" className="space-y-6">
      {/* Top Header Card with Import / Export */}
      <div className={`rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 transition-colors ${
        isHighContrast
          ? 'border-2 border-white bg-black'
          : 'border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className={`w-5 h-5 ${isHighContrast ? 'text-yellow-300' : 'text-emerald-400'}`} />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Solved Library
              </h2>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isHighContrast ? 'text-zinc-200' : 'text-zinc-400'}`}>
              Every problem marked as solved in Expeditions or imported from your past Codeforces solutions is securely cataloged in PostgreSQL.
            </p>
          </div>

          {/* Import / Export Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Hidden file input for JSON import */}
            <input
              id="input-file-import-json"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Import Button */}
            <button
              id="btn-import-library-json"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 ${
                isHighContrast
                  ? 'bg-black text-white border-2 border-white hover:border-yellow-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-sm'
              }`}
              title="Import JSON problem cards file and merge into database"
            >
              <Upload className={`w-3.5 h-3.5 ${isHighContrast ? 'text-yellow-300' : 'text-cyan-400'}`} />
              <span>{isImporting ? 'Importing...' : 'Import JSON'}</span>
            </button>

            {/* Export Button */}
            <button
              id="btn-export-library-json"
              type="button"
              onClick={handleExport}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                isHighContrast
                  ? 'bg-yellow-400 text-black border-2 border-yellow-200 hover:bg-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
              title={`Download library as CodeSyncLib_${userHandle}.json`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Library</span>
            </button>
          </div>
        </div>

        {/* Import Notification Banner if any */}
        {importNotice && (
          <div
            id="import-notification-banner"
            className={`p-3 rounded-lg flex items-center justify-between text-xs ${
              importNotice.startsWith('Error')
                ? 'bg-rose-950/50 border border-rose-800 text-rose-300'
                : 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {importNotice.startsWith('Error') ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{importNotice}</span>
            </div>
            <button
              onClick={() => setImportNotice(null)}
              className="opacity-70 hover:opacity-100 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-6 relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isHighContrast ? 'text-zinc-300' : 'text-zinc-500'}`} />
            <input
              id="input-search-solved"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by problem name or ID (e.g. 1900A, Watermelon)..."
              className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs placeholder-zinc-400 outline-none transition-colors ${
                isHighContrast
                  ? 'bg-black text-white border-2 border-white focus:border-yellow-300'
                  : 'bg-zinc-950/80 border border-zinc-800 text-zinc-100 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Rating Dropdown Filter */}
          <div className="sm:col-span-3">
            <select
              id="select-filter-rating"
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-xs outline-none cursor-pointer ${
                isHighContrast
                  ? 'bg-black text-white border-2 border-white focus:border-yellow-300'
                  : 'bg-zinc-950/80 border border-zinc-800 text-zinc-200 focus:border-emerald-500'
              }`}
            >
              <option value="all">All Ratings ({problems.length})</option>
              {availableRatings.map((r) => {
                const count = problems.filter((p) => p.rating === r).length;
                return (
                  <option key={r} value={r}>
                    Rated {r} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tag Dropdown Filter */}
          <div className="sm:col-span-3">
            <select
              id="select-filter-tag"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-xs outline-none cursor-pointer ${
                isHighContrast
                  ? 'bg-black text-white border-2 border-white focus:border-yellow-300'
                  : 'bg-zinc-950/80 border border-zinc-800 text-zinc-200 focus:border-emerald-500'
              }`}
            >
              <option value="all">All Tags</option>
              {availableTags.map((tag) => {
                const count = problems.filter(
                  (p) => p.tags && p.tags.includes(tag)
                ).length;
                return (
                  <option key={tag} value={tag}>
                    #{tag} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Filter Stats Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
          <span>
            Showing <strong className="text-zinc-200">{filteredProblems.length}</strong> of{' '}
            <strong className="text-zinc-200">{problems.length}</strong> solved problems
          </span>
          {(searchQuery || selectedRating !== 'all' || selectedTag !== 'all') && (
            <button
              id="btn-clear-solved-filters"
              onClick={() => {
                setSearchQuery('');
                setSelectedRating('all');
                setSelectedTag('all');
              }}
              className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer text-xs"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Problem Cards List */}
      {filteredProblems.length > 0 ? (
        <div id="solved-problems-list" className="space-y-2.5">
          {filteredProblems.map((prob) => (
            <ProblemCard
              key={prob.problemId || `${prob.contestId}_${prob.index}`}
              problem={{ ...prob, solved: true }}
              onDeployGreedy={onDeployGreedy}
              onToggleSolved={(p, solved) => onToggleSolved(p, solved)}
              isStrikedWhenSolved={false}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          id="solved-library-empty-state"
          className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center space-y-4 bg-zinc-900/30"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 text-zinc-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-zinc-200">
              {problems.length === 0
                ? 'No Solved Problems in Library Yet'
                : 'No Problems Match Your Filter'}
            </h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
              {problems.length === 0
                ? 'Head over to "Expeditions", conquer 5-problem hunts, and mark them solved to populate your personal solved library!'
                : 'Try clearing your search query, difficulty rating, or tag filter.'}
            </p>
          </div>
          {problems.length === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import existing CodeSyncLib JSON</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
