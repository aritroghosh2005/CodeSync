import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  cfHandle: text('cf_handle').notNull().unique(),
  displayHandle: text('display_handle').notNull(),
  niceName: text('nice_name'),
  rating: integer('rating').default(0),
  maxRating: integer('max_rating').default(0),
  rank: text('rank').default('unrated'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const solvedProblems = pgTable('solved_problems', {
  id: serial('id').primaryKey(),
  userCfHandle: text('user_cf_handle').notNull(),
  problemId: text('problem_id').notNull(),
  contestId: integer('contest_id').notNull(),
  index: text('index').notNull(),
  name: text('name').notNull(),
  rating: integer('rating'),
  tags: jsonb('tags').$type<string[]>().default([]),
  solvedAt: timestamp('solved_at').defaultNow(),
});

export const expeditionHunts = pgTable('expedition_hunts', {
  id: serial('id').primaryKey(),
  userCfHandle: text('user_cf_handle').notNull().unique(),
  baseRating: integer('base_rating').notNull(),
  problems: jsonb('problems').$type<{
    problemId: string;
    contestId: number;
    index: string;
    name: string;
    rating: number;
    tags: string[];
    solved: boolean;
  }[]>().notNull(),
  completed: boolean('completed').default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const greedyChats = pgTable('greedy_chats', {
  id: serial('id').primaryKey(),
  userCfHandle: text('user_cf_handle').notNull(),
  problemId: text('problem_id').notNull(),
  mode: text('mode').notNull(),
  messages: jsonb('messages').$type<{
    role: 'user' | 'model';
    content: string;
    timestamp: string;
  }[]>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
