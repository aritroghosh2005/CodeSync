export interface CFProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

export interface CFUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  titlePhoto?: string;
}

// In-memory cache for Codeforces problemset to avoid rate limits
let cachedProblems: CFProblem[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchCodeforcesProblemset(): Promise<CFProblem[]> {
  const now = Date.now();
  if (cachedProblems.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProblems;
  }

  try {
    const res = await fetch('https://codeforces.com/api/problemset.problems');
    if (!res.ok) {
      throw new Error(`Codeforces API returned HTTP ${res.status}`);
    }
    const data = await res.json() as { status: string; result?: { problems: CFProblem[] } };
    if (data.status === 'OK' && data.result && Array.isArray(data.result.problems)) {
      // Filter problems that have valid rating and contestId
      cachedProblems = data.result.problems.filter(
        (p) => typeof p.rating === 'number' && p.rating >= 800 && p.contestId
      );
      cacheTimestamp = now;
      console.log(`Loaded ${cachedProblems.length} Codeforces rated problems into cache.`);
      return cachedProblems;
    }
  } catch (err) {
    console.error('Failed to fetch from Codeforces problemset API:', err);
  }

  // Fallback to existing cache if available or built-in curated fallback list
  if (cachedProblems.length > 0) return cachedProblems;
  return getFallbackProblems();
}

export async function fetchCodeforcesUserInfo(handle: string): Promise<CFUserInfo | null> {
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json() as { status: string; result?: CFUserInfo[] };
    if (data.status === 'OK' && data.result && data.result.length > 0) {
      return data.result[0];
    }
    return null;
  } catch (err) {
    console.error(`Error checking Codeforces user handle "${handle}":`, err);
    return null;
  }
}

// Generates 5 random problems with ratings [X, X+100, X+200, X+300, X+400]
export async function generateHuntProblems(baseRating: number): Promise<CFProblem[]> {
  const allProblems = await fetchCodeforcesProblemset();
  const targetRatings = [
    baseRating,
    baseRating + 100,
    baseRating + 200,
    baseRating + 300,
    baseRating + 400,
  ];

  const hunt: CFProblem[] = [];

  for (const rating of targetRatings) {
    const matching = allProblems.filter((p) => p.rating === rating);
    if (matching.length > 0) {
      const randomIndex = Math.floor(Math.random() * matching.length);
      hunt.push(matching[randomIndex]);
    } else {
      // Find closest rated problem
      const sortedByDiff = [...allProblems].sort(
        (a, b) => Math.abs((a.rating || 0) - rating) - Math.abs((b.rating || 0) - rating)
      );
      hunt.push(sortedByDiff[0]);
    }
  }

  return hunt;
}

function getFallbackProblems(): CFProblem[] {
  return [
    { contestId: 4, index: 'A', name: 'Watermelon', rating: 800, tags: ['brute force', 'math'] },
    { contestId: 71, index: 'A', name: 'Way Too Long Words', rating: 800, tags: ['strings'] },
    { contestId: 231, index: 'A', name: 'Team', rating: 800, tags: ['brute force', 'greedy'] },
    { contestId: 158, index: 'A', name: 'Next Round', rating: 800, tags: ['special problem'] },
    { contestId: 282, index: 'A', name: 'Bit++', rating: 800, tags: ['implementation'] },
    { contestId: 112, index: 'A', name: 'Petya and Strings', rating: 800, tags: ['strings'] },
    { contestId: 96, index: 'A', name: 'Football', rating: 900, tags: ['implementation', 'strings'] },
    { contestId: 160, index: 'A', name: 'Twins', rating: 900, tags: ['greedy', 'sortings'] },
    { contestId: 318, index: 'A', name: 'Even Odds', rating: 900, tags: ['math'] },
    { contestId: 58, index: 'A', name: 'Chat room', rating: 1000, tags: ['greedy', 'strings'] },
    { contestId: 69, index: 'A', name: 'Young Physicist', rating: 1000, tags: ['math'] },
    { contestId: 118, index: 'A', name: 'String Task', rating: 1000, tags: ['strings'] },
    { contestId: 122, index: 'A', name: 'Lucky Division', rating: 1000, tags: ['brute force', 'number theory'] },
    { contestId: 131, index: 'A', name: 'cAPS lOCK', rating: 1000, tags: ['implementation', 'strings'] },
    { contestId: 1, index: 'A', name: 'Theatre Square', rating: 1000, tags: ['math'] },
    { contestId: 479, index: 'A', name: 'Expression', rating: 1000, tags: ['brute force', 'math'] },
    { contestId: 339, index: 'B', name: 'Xenia and Ringroad', rating: 1000, tags: ['implementation'] },
    { contestId: 1374, index: 'C', name: 'Move Brackets', rating: 1000, tags: ['greedy', 'strings'] },
    { contestId: 1360, index: 'C', name: 'Similar Pairs', rating: 1000, tags: ['graph matchings', 'greedy', 'sortings'] },
    { contestId: 492, index: 'B', name: 'Vanya and Lanterns', rating: 1200, tags: ['binary search', 'math', 'sortings'] },
    { contestId: 466, index: 'A', name: 'Cheap Travel', rating: 1200, tags: ['implementation'] },
    { contestId: 1352, index: 'C', name: 'K-th Not Divisible by n', rating: 1200, tags: ['binary search', 'math'] },
    { contestId: 489, index: 'B', name: 'BerSU Ball', rating: 1200, tags: ['dp', 'greedy', 'sortings', 'two pointers'] },
    { contestId: 455, index: 'A', name: 'Boredom', rating: 1500, tags: ['dp'] },
    { contestId: 580, index: 'C', name: 'Kefa and Park', rating: 1500, tags: ['dfs and similar', 'graphs', 'trees'] },
    { contestId: 550, index: 'A', name: 'Two Substrings', rating: 1500, tags: ['brute force', 'dp', 'greedy', 'strings'] },
    { contestId: 1399, index: 'D', name: 'Binary String To Subsequences', rating: 1500, tags: ['constructive algorithms', 'data structures', 'greedy'] },
    { contestId: 1899, index: 'E', name: 'Queue Sort', rating: 1400, tags: ['greedy', 'sortings'] },
    { contestId: 1363, index: 'B', name: 'Subsequence Hate', rating: 1400, tags: ['strings'] },
    { contestId: 1365, index: 'C', name: 'Rotation Matching', rating: 1400, tags: ['constructive algorithms', 'data structures', 'greedy'] },
    { contestId: 1368, index: 'B', name: 'Codeforces Subsequences', rating: 1400, tags: ['brute force', 'constructive algorithms', 'greedy', 'math'] },
    { contestId: 1364, index: 'B', name: 'Most socially-distanced subsequence', rating: 1300, tags: ['greedy', 'two pointers'] },
    { contestId: 1354, index: 'B', name: 'Ternary String', rating: 1200, tags: ['binary search', 'dp', 'two pointers'] },
    { contestId: 1355, index: 'B', name: 'Young Explorers', rating: 1200, tags: ['dp', 'greedy', 'sortings'] },
    { contestId: 1367, index: 'C', name: 'Social Distance', rating: 1200, tags: ['greedy'] },
    { contestId: 1373, index: 'C', name: 'Pluses and Minuses', rating: 1300, tags: ['math'] },
    { contestId: 1385, index: 'D', name: 'a-Good String', rating: 1500, tags: ['divide and conquer'] },
    { contestId: 1365, index: 'D', name: 'Solve The Maze', rating: 1700, tags: ['constructive algorithms', 'dfs and similar', 'dsu', 'graphs', 'shortest paths'] },
    { contestId: 1380, index: 'C', name: 'Create The Teams', rating: 1400, tags: ['dp', 'greedy', 'sortings', 'two pointers'] },
    { contestId: 1398, index: 'C', name: 'Good Subarrays', rating: 1600, tags: ['data structures', 'math'] },
    { contestId: 1391, index: 'C', name: 'Cyclic Permutations', rating: 1500, tags: ['combinatorics', 'dp', 'graphs', 'math'] },
    { contestId: 1409, index: 'D', name: 'Decrease the Sum of Digits', rating: 1600, tags: ['greedy', 'math'] },
    { contestId: 1418, index: 'C', name: 'Mortal Kombat Tower', rating: 1500, tags: ['dp', 'greedy'] },
    { contestId: 1426, index: 'D', name: 'Non-zero Segments', rating: 1500, tags: ['data structures', 'greedy', 'sortings'] },
    { contestId: 1433, index: 'E', name: 'Two Round Dances', rating: 1300, tags: ['combinatorics', 'math'] },
    { contestId: 1454, index: 'D', name: 'Number into Sequence', rating: 1300, tags: ['math', 'number theory'] },
    { contestId: 1472, index: 'D', name: 'Even-Odd Game', rating: 1200, tags: ['games', 'greedy', 'sortings'] },
    { contestId: 1520, index: 'D', name: 'Same Differences', rating: 1200, tags: ['data structures', 'math'] },
    { contestId: 1520, index: 'E', name: 'Arranging The Sheep', rating: 1400, tags: ['greedy', 'math', 'two pointers'] },
    { contestId: 1538, index: 'C', name: 'Number of Pairs', rating: 1300, tags: ['binary search', 'data structures', 'math', 'two pointers'] },
    { contestId: 1547, index: 'E', name: 'Air Conditioners', rating: 1500, tags: ['data structures', 'dp', 'shortest paths', 'two pointers'] },
    { contestId: 1551, index: 'B2', name: 'Wonderful Coloring - 2', rating: 1400, tags: ['binary search', 'constructive algorithms', 'data structures', 'greedy', 'sortings'] },
    { contestId: 1552, index: 'B', name: 'Running for Gold', rating: 1500, tags: ['combinatorics', 'graphs', 'greedy', 'sortings'] },
    { contestId: 1557, index: 'B', name: 'Moamen and k-subarrays', rating: 1100, tags: ['greedy', 'sortings'] },
    { contestId: 1560, index: 'D', name: 'Make a Power of Two', rating: 1300, tags: ['greedy', 'math', 'strings'] },
    { contestId: 1593, index: 'D1', name: 'All are Same', rating: 1200, tags: ['math', 'number theory'] },
    { contestId: 1618, index: 'D', name: 'Array Eversion', rating: 1100, tags: ['greedy', 'math'] },
    { contestId: 1624, index: 'D', name: 'Palindromes Coloring', rating: 1400, tags: ['binary search', 'greedy', 'sortings', 'strings'] },
    { contestId: 1676, index: 'G', name: 'White-Black Balanced Subtrees', rating: 1300, tags: ['dfs and similar', 'dp', 'graphs', 'trees'] },
    { contestId: 1692, index: 'F', name: '3SUM', rating: 1300, tags: ['brute force', 'math'] },
    { contestId: 1703, index: 'F', name: 'Yet Another Problem About Pairs Satisfying an Inequality', rating: 1300, tags: ['binary search', 'data structures', 'dp', 'greedy', 'sortings'] },
    { contestId: 1742, index: 'E', name: 'Scuza', rating: 1200, tags: ['binary search', 'greedy', 'math'] },
    { contestId: 1790, index: 'D', name: 'Matryoshkas', rating: 1200, tags: ['data structures', 'greedy', 'sortings'] },
    { contestId: 1807, index: 'D', name: 'Odd Queries', rating: 1100, tags: ['data structures', 'implementation'] },
    { contestId: 1829, index: 'F', name: 'Forever Winter', rating: 1300, tags: ['graphs', 'math'] },
    { contestId: 1840, index: 'D', name: 'Wooden Toy Festival', rating: 1400, tags: ['binary search', 'greedy', 'sortings'] },
    { contestId: 1846, index: 'E1', name: 'Rudolf and Snowflakes (simple version)', rating: 1300, tags: ['binary search', 'brute force', 'math'] },
    { contestId: 1850, index: 'F', name: 'We Were Both Children', rating: 1300, tags: ['math', 'number theory'] },
    { contestId: 1873, index: 'E', name: 'Building an Aquarium', rating: 1100, tags: ['binary search', 'sortings'] },
    { contestId: 1872, index: 'E', name: 'Data Structures Fan', rating: 1400, tags: ['data structures'] },
    { contestId: 1915, index: 'E', name: 'Romantic Glasses', rating: 1300, tags: ['data structures', 'math'] },
    { contestId: 1927, index: 'D', name: 'Find the Different Ones!', rating: 1300, tags: ['binary search', 'data structures', 'dp', 'greedy', 'two pointers'] },
    { contestId: 1950, index: 'E', name: 'Nearly Shortest Repeating Substring', rating: 1400, tags: ['brute force', 'strings'] },
    { contestId: 1974, index: 'C', name: 'Beautiful Triplets', rating: 1300, tags: ['data structures', 'math', 'sortings'] },
    { contestId: 1985, index: 'F', name: 'Final Boss', rating: 1500, tags: ['binary search', 'data structures'] },
  ];
}
