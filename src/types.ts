export interface Problem {
  problemId: string; // e.g. "1900_A"
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  solved?: boolean;
  solvedAt?: string;
}

export interface UserProfile {
  id?: number;
  cfHandle: string;
  displayHandle: string;
  niceName: string | null;
  rating: number;
  maxRating: number;
  rank: string;
  avatar: string | null;
}

export interface ExpeditionHunt {
  id?: number;
  userCfHandle: string;
  baseRating: number;
  problems: Problem[];
  completed: boolean;
  updatedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
}

export type GreedyMode = 'mentor' | 'examiner';

export const PYPY_TEMPLATE = `import sys
input = lambda : sys.stdin.readline().rstrip()

def solve():
    # Write your solution logic here
    pass

# Note: Comment the line below if the problem has only 1 testcase per test
t = int(input())
for _ in range(t): 
    solve()
`;

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: (Element | HTMLElement | null)[]) => Promise<void>;
      typesetClear?: (elements?: (Element | HTMLElement | null)[]) => void;
      typeset?: (elements?: (Element | HTMLElement | null)[]) => void;
      startup?: {
        defaultPageReady?: () => Promise<void>;
        promise?: Promise<void>;
      };
    };
  }
}
