import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users, solvedProblems, expeditionHunts, greedyChats } from '../db/schema.ts';
import { fetchCodeforcesUserInfo, generateHuntProblems } from './codeforces.ts';
import type { CFProblem } from './codeforces.ts';
import { generateGreedyResponse } from './greedyAi.ts';
import type { ChatMessage, ProblemContext } from './greedyAi.ts';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '20mb' }));

// CORS headers for serverless / multi-origin support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Favicon handler
apiRouter.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'favicon.svg'), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
});

// --- USER AUTH & VERIFICATION ---
apiRouter.post('/user/verify-and-login', async (req, res) => {
  try {
    const { handle } = req.body;
    if (!handle || typeof handle !== 'string' || !handle.trim()) {
      return res.status(400).json({ error: 'Codeforces handle is required.' });
    }

    const cleanHandle = handle.trim();
    const cfUser = await fetchCodeforcesUserInfo(cleanHandle);

    if (!cfUser) {
      return res.status(404).json({
        error: `Codeforces handle "${cleanHandle}" does not exist. Please check your spelling and try again.`,
      });
    }

    const normalizedHandle = cfUser.handle.toLowerCase();

    // Check if user exists in PostgreSQL
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.cfHandle, normalizedHandle))
      .limit(1);

    let userRecord = existing[0];

    if (!userRecord) {
      // Insert new user
      const inserted = await db
        .insert(users)
        .values({
          cfHandle: normalizedHandle,
          displayHandle: cfUser.handle,
          niceName: null,
          rating: cfUser.rating || 0,
          maxRating: cfUser.maxRating || 0,
          rank: cfUser.rank || 'unrated',
          avatar: cfUser.titlePhoto || null,
        })
        .returning();
      userRecord = inserted[0];
    } else {
      // Update user's real-time stats
      const updated = await db
        .update(users)
        .set({
          displayHandle: cfUser.handle,
          rating: cfUser.rating || 0,
          maxRating: cfUser.maxRating || 0,
          rank: cfUser.rank || 'unrated',
          avatar: cfUser.titlePhoto || userRecord.avatar,
          updatedAt: new Date(),
        })
        .where(eq(users.cfHandle, normalizedHandle))
        .returning();
      userRecord = updated[0];
    }

    return res.json({
      success: true,
      user: userRecord,
      cfData: cfUser,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during verification' });
  }
});

// Update nice name
apiRouter.post('/user/update-nicename', async (req, res) => {
  try {
    const { handle, niceName } = req.body;
    if (!handle || !niceName || typeof niceName !== 'string' || !niceName.trim()) {
      return res.status(400).json({ error: 'Handle and nice name are required.' });
    }

    const normalizedHandle = handle.trim().toLowerCase();
    const updated = await db
      .update(users)
      .set({
        niceName: niceName.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.cfHandle, normalizedHandle))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    return res.json({ success: true, user: updated[0] });
  } catch (err: any) {
    console.error('Update nice name error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update nice name' });
  }
});

// Real-time sync rating
apiRouter.get('/user/sync-rating/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    const cleanHandle = handle.trim();
    const cfUser = await fetchCodeforcesUserInfo(cleanHandle);

    if (!cfUser) {
      return res.status(404).json({ error: 'User not found on Codeforces' });
    }

    const normalizedHandle = cfUser.handle.toLowerCase();
    const updated = await db
      .update(users)
      .set({
        rating: cfUser.rating || 0,
        maxRating: cfUser.maxRating || 0,
        rank: cfUser.rank || 'unrated',
        avatar: cfUser.titlePhoto || null,
        updatedAt: new Date(),
      })
      .where(eq(users.cfHandle, normalizedHandle))
      .returning();

    return res.json({
      success: true,
      user: updated[0] || cfUser,
      rating: cfUser.rating || 0,
      rank: cfUser.rank || 'unrated',
    });
  } catch (err: any) {
    console.error('Sync rating error:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync rating' });
  }
});

// --- SOLVED LIBRARY ---
apiRouter.get('/solved/:handle', async (req, res) => {
  try {
    const normalizedHandle = req.params.handle.trim().toLowerCase();
    const list = await db
      .select()
      .from(solvedProblems)
      .where(eq(solvedProblems.userCfHandle, normalizedHandle))
      .orderBy(desc(solvedProblems.solvedAt));

    return res.json({ success: true, problems: list });
  } catch (err: any) {
    console.error('Fetch solved problems error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch solved problems' });
  }
});

// Toggle solved in library
apiRouter.post('/solved/toggle', async (req, res) => {
  try {
    const { handle, problem, solved } = req.body;
    if (!handle || !problem) {
      return res.status(400).json({ error: 'Missing handle or problem data.' });
    }

    const normalizedHandle = handle.trim().toLowerCase();
    const problemId = `${problem.contestId}_${problem.index}`;

    if (solved) {
      // Add to solved_problems if not already present
      const existing = await db
        .select()
        .from(solvedProblems)
        .where(
          and(
            eq(solvedProblems.userCfHandle, normalizedHandle),
            eq(solvedProblems.problemId, problemId)
          )
        )
        .limit(1);

      if (!existing.length) {
        await db.insert(solvedProblems).values({
          userCfHandle: normalizedHandle,
          problemId,
          contestId: problem.contestId,
          index: problem.index,
          name: problem.name,
          rating: problem.rating || null,
          tags: problem.tags || [],
        });
      }
    } else {
      // Remove from solved_problems
      await db
        .delete(solvedProblems)
        .where(
          and(
            eq(solvedProblems.userCfHandle, normalizedHandle),
            eq(solvedProblems.problemId, problemId)
          )
        );
    }

    const allSolved = await db
      .select()
      .from(solvedProblems)
      .where(eq(solvedProblems.userCfHandle, normalizedHandle))
      .orderBy(desc(solvedProblems.solvedAt));

    return res.json({ success: true, solved, problems: allSolved });
  } catch (err: any) {
    console.error('Toggle solved error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update solved problem' });
  }
});

// Import solved problems JSON (merges without duplicates)
apiRouter.post('/solved/import', async (req, res) => {
  try {
    const { handle, problems } = req.body;
    if (!handle || !Array.isArray(problems)) {
      return res.status(400).json({ error: 'Invalid payload. Array of problems required.' });
    }

    const normalizedHandle = handle.trim().toLowerCase();

    // Fetch currently solved
    const currentList = await db
      .select()
      .from(solvedProblems)
      .where(eq(solvedProblems.userCfHandle, normalizedHandle));

    const existingSet = new Set(currentList.map((p) => p.problemId));

    let importedCount = 0;
    for (const p of problems) {
      const pId = p.problemId || `${p.contestId}_${p.index}`;
      if (!pId || existingSet.has(pId)) continue;

      await db.insert(solvedProblems).values({
        userCfHandle: normalizedHandle,
        problemId: pId,
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating || null,
        tags: p.tags || [],
      });
      existingSet.add(pId);
      importedCount++;
    }

    const updatedList = await db
      .select()
      .from(solvedProblems)
      .where(eq(solvedProblems.userCfHandle, normalizedHandle))
      .orderBy(desc(solvedProblems.solvedAt));

    return res.json({
      success: true,
      importedCount,
      totalCount: updatedList.length,
      problems: updatedList,
    });
  } catch (err: any) {
    console.error('Import solved problems error:', err);
    return res.status(500).json({ error: err.message || 'Failed to import solved problems' });
  }
});

// --- EXPEDITIONS ---
apiRouter.get('/expedition/:handle', async (req, res) => {
  try {
    const normalizedHandle = req.params.handle.trim().toLowerCase();
    const existing = await db
      .select()
      .from(expeditionHunts)
      .where(eq(expeditionHunts.userCfHandle, normalizedHandle))
      .limit(1);

    if (!existing.length) {
      return res.json({ success: true, hunt: null });
    }

    return res.json({ success: true, hunt: existing[0] });
  } catch (err: any) {
    console.error('Fetch expedition error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch expedition hunt' });
  }
});

// Generate Hunt
apiRouter.post('/expedition/generate', async (req, res) => {
  try {
    const { handle, baseRating } = req.body;
    if (!handle || typeof baseRating !== 'number') {
      return res.status(400).json({ error: 'Handle and numeric baseRating are required.' });
    }

    const normalizedHandle = handle.trim().toLowerCase();
    const generatedProblems = await generateHuntProblems(baseRating);

    const huntProblems = generatedProblems.map((p) => ({
      problemId: `${p.contestId}_${p.index}`,
      contestId: p.contestId,
      index: p.index,
      name: p.name,
      rating: p.rating || baseRating,
      tags: p.tags || [],
      solved: false,
    }));

    // Upsert hunt
    const existing = await db
      .select()
      .from(expeditionHunts)
      .where(eq(expeditionHunts.userCfHandle, normalizedHandle))
      .limit(1);

    let savedHunt;
    if (existing.length) {
      const updated = await db
        .update(expeditionHunts)
        .set({
          baseRating,
          problems: huntProblems,
          completed: false,
          updatedAt: new Date(),
        })
        .where(eq(expeditionHunts.userCfHandle, normalizedHandle))
        .returning();
      savedHunt = updated[0];
    } else {
      const inserted = await db
        .insert(expeditionHunts)
        .values({
          userCfHandle: normalizedHandle,
          baseRating,
          problems: huntProblems,
          completed: false,
        })
        .returning();
      savedHunt = inserted[0];
    }

    return res.json({ success: true, hunt: savedHunt });
  } catch (err: any) {
    console.error('Generate hunt error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate hunt' });
  }
});

// Toggle problem solved in expedition
apiRouter.post('/expedition/toggle-problem', async (req, res) => {
  try {
    const { handle, problemId, solved } = req.body;
    if (!handle || !problemId) {
      return res.status(400).json({ error: 'Handle and problemId are required.' });
    }

    const normalizedHandle = handle.trim().toLowerCase();
    const existing = await db
      .select()
      .from(expeditionHunts)
      .where(eq(expeditionHunts.userCfHandle, normalizedHandle))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'No active hunt found for user.' });
    }

    const currentHunt = existing[0];
    let targetProblem: any = null;

    const updatedProblems = currentHunt.problems.map((p) => {
      if (p.problemId === problemId) {
        targetProblem = p;
        return { ...p, solved: Boolean(solved) };
      }
      return p;
    });

    const solvedCount = updatedProblems.filter((p) => p.solved).length;
    const isCompleted = solvedCount === 5;

    // If solved, add immediately to solved_problems library
    if (solved && targetProblem) {
      const solvedExisting = await db
        .select()
        .from(solvedProblems)
        .where(
          and(
            eq(solvedProblems.userCfHandle, normalizedHandle),
            eq(solvedProblems.problemId, problemId)
          )
        )
        .limit(1);

      if (!solvedExisting.length) {
        await db.insert(solvedProblems).values({
          userCfHandle: normalizedHandle,
          problemId,
          contestId: targetProblem.contestId,
          index: targetProblem.index,
          name: targetProblem.name,
          rating: targetProblem.rating || null,
          tags: targetProblem.tags || [],
        });
      }
    }

    const updatedHunt = await db
      .update(expeditionHunts)
      .set({
        problems: updatedProblems,
        completed: isCompleted,
        updatedAt: new Date(),
      })
      .where(eq(expeditionHunts.userCfHandle, normalizedHandle))
      .returning();

    return res.json({
      success: true,
      hunt: updatedHunt[0],
      completed: isCompleted,
      solvedCount,
    });
  } catch (err: any) {
    console.error('Toggle expedition problem error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update problem status' });
  }
});

// --- GREEDY'S GROUND CHAT ---
apiRouter.get('/chat/history/:handle/:problemId', async (req, res) => {
  try {
    const normalizedHandle = req.params.handle.trim().toLowerCase();
    const problemId = req.params.problemId.trim();

    const existing = await db
      .select()
      .from(greedyChats)
      .where(
        and(
          eq(greedyChats.userCfHandle, normalizedHandle),
          eq(greedyChats.problemId, problemId)
        )
      )
      .limit(1);

    if (!existing.length) {
      return res.json({ success: true, chat: null });
    }

    return res.json({ success: true, chat: existing[0] });
  } catch (err: any) {
    console.error('Fetch chat history error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch chat history' });
  }
});

apiRouter.post('/chat/send', async (req, res) => {
  try {
    const { handle, problem, mode, message, history } = req.body;
    if (!handle || !problem || !mode || !message) {
      return res.status(400).json({ error: 'Missing required chat parameters.' });
    }

    const normalizedHandle = handle.trim().toLowerCase();
    const problemId = `${problem.contestId}_${problem.index}`;

    // Generate AI response via Gemini (with multi-model fallback)
    const reply = await generateGreedyResponse(
      problem as ProblemContext,
      mode,
      message,
      history as ChatMessage[]
    );

    const updatedMessages: ChatMessage[] = [
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message },
      { role: 'model', content: reply },
    ];

    // Save to database
    const existing = await db
      .select()
      .from(greedyChats)
      .where(
        and(
          eq(greedyChats.userCfHandle, normalizedHandle),
          eq(greedyChats.problemId, problemId)
        )
      )
      .limit(1);

    if (existing.length) {
      await db
        .update(greedyChats)
        .set({
          mode,
          messages: updatedMessages.map((m) => ({
            ...m,
            timestamp: new Date().toISOString(),
          })),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(greedyChats.userCfHandle, normalizedHandle),
            eq(greedyChats.problemId, problemId)
          )
        );
    } else {
      await db.insert(greedyChats).values({
        userCfHandle: normalizedHandle,
        problemId,
        mode,
        messages: updatedMessages.map((m) => ({
          ...m,
          timestamp: new Date().toISOString(),
        })),
      });
    }

    return res.json({
      success: true,
      reply,
      history: updatedMessages,
    });
  } catch (err: any) {
    console.error('Greedy chat send error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get response from Greedy' });
  }
});

// Clear or reset chat
apiRouter.post('/chat/reset', async (req, res) => {
  try {
    const { handle, problemId } = req.body;
    const normalizedHandle = handle.trim().toLowerCase();

    await db
      .delete(greedyChats)
      .where(
        and(
          eq(greedyChats.userCfHandle, normalizedHandle),
          eq(greedyChats.problemId, problemId)
        )
      );

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Reset chat error:', err);
    return res.status(500).json({ error: err.message || 'Failed to reset chat' });
  }
});

// Mount routes at both /api and root / so both Vercel rewrites and direct calls resolve seamlessly
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
