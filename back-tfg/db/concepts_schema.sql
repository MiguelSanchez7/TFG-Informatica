-- Recreate only the educational-content tables.
-- This avoids keeping an older Supabase definition, for example id uuid,
-- when the app expects stable text ids/slugs.
drop table if exists public.concept_quiz_options cascade;
drop table if exists public.concept_quiz_questions cascade;
drop table if exists public.concept_quizzes cascade;
drop table if exists public.concept_glossary cascade;
drop table if exists public.concept_lessons cascade;

create table public.concept_lessons (
  id text primary key,
  slug text not null unique,
  level text not null check (level in ('base', 'intermedio', 'avanzado')),
  title text not null,
  summary text not null,
  why_it_matters text not null,
  key_ideas text[] not null default '{}',
  example text not null,
  check_question text not null,
  check_answer text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.concept_glossary (
  id text primary key,
  term text not null unique,
  definition text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.concept_quizzes (
  level text primary key check (level in ('base', 'intermedio', 'avanzado')),
  title text not null,
  description text not null,
  xp_reward_per_correct integer not null default 0,
  xp_penalty_per_wrong integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.concept_quiz_questions (
  id text primary key,
  quiz_level text not null references public.concept_quizzes(level) on delete cascade,
  question text not null,
  correct_option_id text not null,
  explanation text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.concept_quiz_options (
  question_id text not null references public.concept_quiz_questions(id) on delete cascade,
  id text not null,
  label text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, id)
);

create index if not exists concept_lessons_order_idx
  on public.concept_lessons (order_index, title);

create index if not exists concept_glossary_order_idx
  on public.concept_glossary (order_index, term);

create index if not exists concept_quiz_questions_level_order_idx
  on public.concept_quiz_questions (quiz_level, order_index);

create index if not exists concept_quiz_options_question_order_idx
  on public.concept_quiz_options (question_id, order_index);
