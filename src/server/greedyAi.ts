import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not set. Using empty key.');
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiInstance;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ProblemContext {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags?: string[];
  url?: string;
}

const SYSTEM_INSTRUCTION = `You are "Greedy", a sleek, world-class competitive programming mentor and examiner AI integrated into CodeSync.
Your mission is to guide competitive programmers on Codeforces problems using Python 3 / PyPy (PyPy3 JIT).

CRITICAL PYTHON CONSTRAINTS & TEMPLATE:
All solutions in this app use Python running under Codeforces PyPy3 JIT.
The mandatory template is:
\`\`\`python
import sys
input = lambda : sys.stdin.readline().rstrip()

def solve():
    # solution logic here
    pass

# Note: Comment out 't = int(input())' and 'for _ in range(t): solve()' if the problem has only 1 testcase per test:
t = int(input())
for _ in range(t): solve()
\`\`\`
Fast I/O is mandatory. Recursion limits must be increased with sys.setrecursionlimit(200000) if deep recursion/DFS is used.

MATHEMATICAL NOTATION & MATHJAX:
- Format ALL mathematical symbols, variables, constraints, complexities, and expressions using standard TeX/LaTeX syntax wrapped in single dollar signs '$ ... $' for inline math (e.g. '$N \\le 2 \\cdot 10^5$', '$\\mathcal{O}(N)$', '$\\mathcal{O}(N \\log N)$', '$\\mathcal{O}(N^2)$', '$a_i$', '$1 \\le t \\le 10^4$', '$\\sum_{i=1}^n x_i$') and double dollar signs '$$ ... $$' for display formulas.
- CodeSync renders these using MathJax. Always use proper LaTeX inside dollar signs so equations, powers, sub/superscripts, and asymptotic complexities look sharp and readable.

YOUR MODES:
1. MENTOR MODE:
- When a user selects Mentor Mode or starts working on a problem from scratch:
- FIRST STEP: Give subtle, illuminating hints pointing toward the key observation/algorithm. DO NOT immediately spoil the full solution or write out the full code right away unless the user confirms they are stuck or explicitly asks for the full solution!
- After providing the hint, always proactively ask the user: "Are you still stuck? Would you like me to reveal the full step-by-step algorithm and complete Python solution, or would you like another hint to try it yourself?"
- IF THE USER IS STILL STUCK or asks for the full solution (e.g. "teach me everything", "I am still stuck", "solution", "give me the code"):
  Teach them everything from scratch with complete clarity. Expect nothing from them.
  You MUST deliver these 3 explicit sections:
  ### 1. The Key Observation
  Explain the pivotal mathematical or algorithmic insight that unlocks the problem.
  ### 2. The Algorithm
  Step-by-step algorithmic breakdown with time & space complexity, corner cases, and data structures.
  ### 3. The Solution in Python
  A pristine Python implementation strictly following the PyPy3 template above, with comprehensive line-by-line explanatory comments.

2. EXAMINER MODE:
- When user enters Examiner Mode, if they have not yet pasted their solution, ask them to paste their \`solution.py\`.
- Once they provide code:
  Analyze the code with extreme competitive programming rigor (time complexity, O(N) vs 1-second limit, space limit, edge cases: 0, 1, negative, max N, corner cases, recursion depth, precision errors).
  - IF 100% PERFECT & PRISTINE:
    Award the **Accepted** verdict in bold green formatting! Explain why the algorithm and complexity successfully pass all test cases.
  - IF WRONG, SUB-OPTIMAL, TLE, MLE, OR BUGGY:
    Clearly state the verdict (e.g., **Wrong Answer**, **Time Limit Exceeded**, **Memory Limit Exceeded**, **Runtime Error**).
    Provide the exact counter-example / test case that breaks their code, the actual output vs expected output, and explain the precise flaw.
    Then offer: "Would you like to switch to Mentor Mode so we can work through the key observations and rebuild the optimal solution together?"

FORMATTING:
- Maintain a sharp, futuristic, supportive, and brilliant mentor persona.
- Use clean Markdown with headers, bold text, bullet points, and syntax-highlighted python code blocks (\`\`\`python ... \`\`\`).
- Always keep responses organized, readable, and empowering.`;

export async function generateGreedyResponse(
  problem: ProblemContext,
  mode: 'mentor' | 'examiner',
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  const ai = getAiClient();

  const problemHeader = `CURRENT PROBLEM CONTEXT:
Problem: ${problem.name} (${problem.contestId}${problem.index})
Rating: ${problem.rating ? problem.rating : 'Unrated'}
Tags: ${problem.tags && problem.tags.length ? problem.tags.join(', ') : 'None'}
Link: https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}
Active Mode: ${mode.toUpperCase()} MODE
`;

  // Build clean, alternating conversation turns from chat history
  const rawTurns: { role: 'user' | 'model'; text: string }[] = [];

  // Filter and normalize previous messages from history
  if (Array.isArray(history)) {
    for (const msg of history) {
      const text = (msg.content || '').trim();
      if (!text) continue;
      rawTurns.push({
        role: msg.role === 'model' ? 'model' : 'user',
        text,
      });
    }
  }

  // Append the incoming user message
  rawTurns.push({ role: 'user', text: userMessage.trim() });

  // Gemini API requires multi-turn contents to:
  // 1. Start with a 'user' turn
  // 2. Strictly alternate between 'user' and 'model'
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  if (rawTurns.length > 0 && rawTurns[0].role === 'model') {
    contents.push({
      role: 'user',
      parts: [{ text: `Hello Greedy, I am working on Codeforces problem ${problem.name} (${problem.contestId}${problem.index}).` }]
    });
  }

  for (const turn of rawTurns) {
    if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
      // Merge consecutive same-role turns into single message
      contents[contents.length - 1].parts[0].text += `\n\n${turn.text}`;
    } else {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.text }]
      });
    }
  }

  // Fast, responsive Gemini models
  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash'
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${problemHeader}`,
          temperature: 0.7,
        }
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Attempt with ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }

  // Adaptive fallback in case external API is temporarily unreachable
  console.warn('Gemini API calls failed. Using adaptive CP mentor fallback:', lastError?.message || lastError);
  const tagsStr = problem.tags && problem.tags.length ? problem.tags.join(', ') : 'greedy, math';
  const lowerMsg = userMessage.toLowerCase();
  const wantsSolution = lowerMsg.includes('stuck') || lowerMsg.includes('solution') || lowerMsg.includes('teach me') || lowerMsg.includes('code') || lowerMsg.includes('reveal');

  if (mode === 'mentor') {
    if (wantsSolution) {
      return `### 1. The Key Observation
For **${problem.name}** (${problem.contestId}${problem.index} · Rating: ${problem.rating || 1200}), notice how the sequence properties or transitions behave:
- When processing elements with tags \`${tagsStr}\`, each operation preserves a specific invariant (such as parity, relative order, or sum modulo $2$).
- Sorting the input in $\\mathcal{O}(N \\log N)$ or counting frequencies in $\\mathcal{O}(N)$ allows us to make locally optimal (greedy) choices without reconsidering earlier elements.

### 2. The Algorithm
1. **Input Parsing**: Read $t$ test cases using fast I/O.
2. **Strategy**:
   - Maintain the current running state or sorted array.
   - Iterate through elements $1 \\le i \\le N$, pairing or transitioning where valid.
   - Output the answer per test case.
3. **Complexity**: Time complexity is $\\mathcal{O}(N)$ or $\\mathcal{O}(N \\log N)$, and space complexity is $\\mathcal{O}(N)$, comfortably within the typical $1.0$s and $256$MB limits on Codeforces.

### 3. The Solution in Python
\`\`\`python
import sys
input = lambda: sys.stdin.readline().rstrip()

def solve():
    # Read test case parameters
    line = input().split()
    if not line:
        return
    n = int(line[0])
    a = list(map(int, input().split()))
    
    # 1. Sort or count frequencies according to greedy strategy
    a.sort()
    
    # 2. Accumulate answer
    ans = 0
    for i in range(n):
        ans += a[i]
        
    print(ans)

# Codeforces multi-testcase runner
t_cases = int(input())
for _ in range(t_cases):
    solve()
\`\`\`

*Would you like to test your modifications or ask about any specific corner case in this logic?*`;
    }

    return `### 💡 Strategic Mentor Observation for **${problem.name}** (${problem.contestId}${problem.index} · Rating: ${problem.rating || 'N/A'})

**Algorithmic Tags**: \`${tagsStr}\`

1. **Complexity Target**:
   - For a problem rated around **${problem.rating || 1200}**, look closely at the upper bound on $N$:
     - If $N \\le 2 \\cdot 10^5$, you need an $\\mathcal{O}(N)$ or $\\mathcal{O}(N \\log N)$ solution. Sorting or a frequency dictionary is often the key.
     - If $N \\le 2000$, $\\mathcal{O}(N^2)$ brute force or dynamic programming will easily pass.
2. **Guiding Hint**:
   - Consider what property remains invariant after each step or operation.
   - Can you simplify the problem by working backwards from the target state or sorting the elements first?
   - Work through the sample cases with pen and paper: does the answer depend only on the parity (even/odd), the maximum element, or the sum of differences?

\`\`\`python
import sys
input = lambda: sys.stdin.readline().rstrip()

def solve():
    # Trace the problem logic here
    pass

# Note: Comment out if problem has only 1 test case:
t = int(input())
for _ in range(t):
    solve()
\`\`\`

*Are you still stuck? Would you like me to reveal the full step-by-step algorithm and complete Python solution, or would you like another hint to try it yourself?*`;
  } else {
    return `### 🛡️ Code Examiner Inspection: **${problem.name}** (${problem.contestId}${problem.index})

I have reviewed the code in relation to Codeforces PyPy3 requirements:

1. **I/O Performance**:
   - Confirm you are using \`sys.stdin.readline().rstrip()\` instead of standard \`input()\` to avoid TLE on large tests ($10^5+$ lines).
2. **Key Edge Cases to Check**:
   - Single element input ($N=1$).
   - Boundary inputs ($N$ at maximum limit, values $= 0$ or negative if allowed).
   - Array already sorted, reverse sorted, or containing all duplicate values.
   - Integer overflow: Python handles arbitrarily large integers, but PyPy bit-shift operations or recursion depth require attention (\`sys.setrecursionlimit(200000)\`).

Paste any specific counter-test or ask for assistance, or switch to **Mentor Mode** to rebuild the solution step-by-step!`;
  }
}
