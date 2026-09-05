import React, { useState } from 'react';
import {
  Code2,
  RefreshCw,
  Compass,
  BookOpen,
  User,
  LogOut,
  Edit3,
  Contrast,
} from 'lucide-react';
import { UserProfile } from '../types.ts';
import { getEloConfig } from '../utils/elo.ts';
import { useHighContrast } from '../context/HighContrastContext.tsx';

interface HeaderProps {
  user: UserProfile;
  activeTab: 'expeditions' | 'solved';
  onSelectTab: (tab: 'expeditions' | 'solved') => void;
  solvedCount: number;
  onSyncRating: () => Promise<void>;
  isSyncingRating: boolean;
  onEditNiceName: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  solvedCount,
  onSyncRating,
  isSyncingRating,
  onEditNiceName,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const { isHighContrast, toggleHighContrast } = useHighContrast();
  const elo = getEloConfig(user.rating, isHighContrast);

  return (
    <header
      id="codesync-app-header"
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors ${
        isHighContrast
          ? 'border-white bg-black'
          : 'border-zinc-800/90 bg-zinc-950/85'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left Side: Brand Name & Greeting */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-[1px] shadow-md shadow-emerald-900/30 shrink-0">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Code2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  id="app-title-codesync"
                  className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5"
                >
                  CodeSync
                </h1>
              </div>

              {/* Subheading: "Hi {user nice name}" */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                <span>Hi</span>
                <span className="font-semibold text-zinc-200 truncate">
                  {user.niceName || user.displayHandle}
                </span>
                <button
                  onClick={onEditNiceName}
                  title="Change your nice name"
                  className="text-zinc-500 hover:text-emerald-400 transition-colors p-0.5"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:block h-8 w-px bg-zinc-800 shrink-0" />

          {/* Rated: R Display (real-time fetched rating) */}
          <div
            id="user-rating-badge"
            className={`hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-mono font-bold ${elo.badgeBg} shadow-sm`}
            title={`Real-time Codeforces Rating: ${user.rating} (${user.rank})`}
          >
            <span className="font-sans font-normal text-zinc-400 text-[11px]">
              Rated:
            </span>
            <span className={elo.textColor}>
              {user.rating > 0 ? user.rating : 'Unrated'}
            </span>
            <button
              id="btn-sync-rating"
              onClick={onSyncRating}
              disabled={isSyncingRating}
              title="Sync latest real-time rating from Codeforces"
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
            >
              <RefreshCw
                className={`w-3 h-3 ${isSyncingRating ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Center / Right: Section Navigation & Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Section Switcher Tabs: "Expeditions" and "Solved Library" */}
          <nav
            id="nav-section-switcher"
            className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80 shadow-inner"
          >
            <button
              id="tab-expeditions"
              type="button"
              onClick={() => onSelectTab('expeditions')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === 'expeditions'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Expeditions</span>
            </button>

            <button
              id="tab-solved-library"
              type="button"
              onClick={() => onSelectTab('solved')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === 'solved'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Solved Library</span>
              {solvedCount > 0 && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'solved'
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-800 text-emerald-400 border border-emerald-800/50'
                  }`}
                >
                  {solvedCount}
                </span>
              )}
            </button>
          </nav>

          {/* High Contrast Mode Toggle */}
          <button
            id="btn-toggle-high-contrast"
            type="button"
            onClick={toggleHighContrast}
            aria-pressed={isHighContrast}
            title={isHighContrast ? 'Disable High Contrast mode' : 'Enable High Contrast mode'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.5)] ring-2 ring-yellow-400'
                : 'bg-zinc-900/90 text-zinc-300 hover:text-white border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <Contrast className={`w-3.5 h-3.5 ${isHighContrast ? 'text-black' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">High Contrast</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isHighContrast
                  ? 'bg-black text-yellow-300 border border-black'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isHighContrast ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* User Profile Avatar / Logout Dropdown */}
          <div className="relative">
            <button
              id="btn-user-profile-menu"
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayHandle}
                  className="w-7 h-7 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                  {user.displayHandle[0].toUpperCase()}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-medium text-zinc-300 pr-1">
                {user.displayHandle}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                id="user-profile-dropdown"
                className="absolute right-0 mt-2 w-60 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="p-2 border-b border-zinc-800 mb-1">
                  <div className="font-bold text-zinc-100">{user.displayHandle}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    CF ID: {user.cfHandle}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono mt-1">
                    Rating: {user.rating} ({user.rank})
                  </div>
                </div>

                {/* High Contrast Quick Toggle in Menu */}
                <button
                  id="btn-menu-toggle-high-contrast"
                  onClick={() => {
                    toggleHighContrast();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Contrast className="w-3.5 h-3.5 text-zinc-400" />
                    <span>High Contrast Mode</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isHighContrast
                        ? 'bg-yellow-400 text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isHighContrast ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onEditNiceName();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Edit Nice Name</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onSyncRating();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sync Codeforces Rating</span>
                </button>

                <div className="border-t border-zinc-800 my-1" />

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch Account / Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
