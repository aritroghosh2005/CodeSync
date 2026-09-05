import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, Problem } from './types.ts';
import { Header } from './components/Header.tsx';
import { ExpeditionsView } from './components/ExpeditionsView.tsx';
import { SolvedLibraryView } from './components/SolvedLibraryView.tsx';
import { GreedyGround } from './components/GreedyGround.tsx';
import { UserLoginModal } from './components/UserLoginModal.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isEditNiceNameOpen, setIsEditNiceNameOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'expeditions' | 'solved'>('expeditions');
  const [solvedProblems, setSolvedProblems] = useState<Problem[]>([]);
  const [activeGreedyProblem, setActiveGreedyProblem] = useState<Problem | null>(null);
  const [isSyncingRating, setIsSyncingRating] = useState<boolean>(false);

  // Restore user session on launch
  useEffect(() => {
    const savedHandle = localStorage.getItem('codesync_user_handle');
    if (savedHandle) {
      // Verify and fetch fresh stats from PostgreSQL and Codeforces
      fetch('/api/user/verify-and-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: savedHandle }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            if (!data.user.niceName) {
              setIsLoginModalOpen(true);
            }
          } else {
            localStorage.removeItem('codesync_user_handle');
            setIsLoginModalOpen(true);
          }
        })
        .catch((err) => {
          console.error('Session restore error:', err);
          setIsLoginModalOpen(true);
        });
    } else {
      setIsLoginModalOpen(true);
    }
  }, []);

  // Sync real-time rating and solved library once user is authenticated
  const loadUserData = useCallback(async (handle: string) => {
    try {
      setIsSyncingRating(true);
      // 1. Sync rating
      const ratingRes = await fetch(`/api/user/sync-rating/${encodeURIComponent(handle)}`);
      if (ratingRes.ok) {
        const rData = await ratingRes.json();
        if (rData.success && rData.user) {
          setCurrentUser((prev) => (prev ? { ...prev, ...rData.user } : rData.user));
        }
      }

      // 2. Fetch solved problems
      const solvedRes = await fetch(`/api/solved/${encodeURIComponent(handle)}`);
      if (solvedRes.ok) {
        const sData = await solvedRes.json();
        if (sData.success && Array.isArray(sData.problems)) {
          setSolvedProblems(sData.problems);
        }
      }
    } catch (err) {
      console.error('Failed to sync user data:', err);
    } finally {
      setIsSyncingRating(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.cfHandle) {
      loadUserData(currentUser.cfHandle);
    }
  }, [currentUser?.cfHandle, loadUserData]);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('codesync_user_handle', user.cfHandle);
    setIsLoginModalOpen(false);
    setIsEditNiceNameOpen(false);
    loadUserData(user.cfHandle);
  };

  const handleLogout = () => {
    localStorage.removeItem('codesync_user_handle');
    setCurrentUser(null);
    setSolvedProblems([]);
    setIsLoginModalOpen(true);
  };

  const handleSyncRating = async () => {
    if (!currentUser) return;
    await loadUserData(currentUser.cfHandle);
  };

  const handleToggleSolvedInLibrary = async (problem: Problem, solved: boolean) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/solved/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: currentUser.cfHandle,
          problem,
          solved,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.problems) {
          setSolvedProblems(data.problems);
        }
      }
    } catch (err) {
      console.error('Error toggling solved:', err);
    }
  };

  const handleProblemSolvedFromExpedition = (problem: Problem) => {
    // Add to local solved problems list immediately if not present
    setSolvedProblems((prev) => {
      const pId = problem.problemId || `${problem.contestId}_${problem.index}`;
      if (prev.some((p) => p.problemId === pId)) return prev;
      return [{ ...problem, solved: true }, ...prev];
    });
  };

  const handleImportSuccess = (count: number, updatedList: Problem[]) => {
    setSolvedProblems(updatedList);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* App Header */}
      {currentUser && (
        <Header
          user={currentUser}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          solvedCount={solvedProblems.length}
          onSyncRating={handleSyncRating}
          isSyncingRating={isSyncingRating}
          onEditNiceName={() => setIsEditNiceNameOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentUser ? (
          activeTab === 'expeditions' ? (
            <ExpeditionsView
              userHandle={currentUser.cfHandle}
              onDeployGreedy={(prob) => setActiveGreedyProblem(prob)}
              onProblemSolvedMovedToLib={handleProblemSolvedFromExpedition}
            />
          ) : (
            <SolvedLibraryView
              userHandle={currentUser.cfHandle}
              problems={solvedProblems}
              onDeployGreedy={(prob) => setActiveGreedyProblem(prob)}
              onToggleSolved={handleToggleSolvedInLibrary}
              onImportSuccess={handleImportSuccess}
            />
          )
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                <span className="font-mono font-bold text-lg">&lt;/&gt;</span>
              </div>
              <h3 className="font-bold text-lg text-zinc-200">Loading CodeSync...</h3>
              <p className="text-xs text-zinc-400">Connecting to Codeforces & remote database</p>
            </div>
          </div>
        )}
      </main>

      {/* Greedy's Ground Chat Modal */}
      {activeGreedyProblem && currentUser && (
        <GreedyGround
          problem={activeGreedyProblem}
          userHandle={currentUser.cfHandle}
          onClose={() => setActiveGreedyProblem(null)}
        />
      )}

      {/* User Login Modal */}
      <UserLoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        initialStep="handle"
      />

      {/* Edit Nice Name Modal */}
      {currentUser && (
        <UserLoginModal
          isOpen={isEditNiceNameOpen}
          existingUser={currentUser}
          initialStep="niceName"
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setIsEditNiceNameOpen(false)}
        />
      )}
    </div>
  );
}
