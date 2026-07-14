create extension if not exists pgcrypto;

drop function if exists public.get_public_report(text, text, text);
drop table if exists public.letters_awards cascade;
drop table if exists public.chapter_defaults cascade;
drop table if exists public.chapter_results cascade;
drop table if exists public.student_chapter_teams cascade;
drop table if exists public.students cascade;
drop table if exists public.tracks cascade;
drop table if exists public.admin_accounts cascade;

create table public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  track_label text,
  cohort text,
  name text not null,
  login_id text unique not null,
  password text not null,
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.admin_accounts(id) on delete cascade,
  title text not null,
  manager_name text,
  start_date date,
  end_date date,
  total_attendance_days int,
  chapter_count int not null default 4 check (chapter_count between 1 and 20),
  guide_text text default '이름과 비밀번호를 입력하면 개인 리포트를 확인할 수 있습니다.',
  public_slug text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  name text not null,
  password text not null,
  attendance_days int,
  is_public boolean not null default true,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(track_id, name)
);

create table public.student_chapter_teams (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  chapter_no int not null,
  team_no text,
  unique(student_id, chapter_no)
);

create table public.chapter_results (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  chapter_no int not null,
  team_no text not null,
  project_title text,
  result_url text,
  image_url text,
  unique(track_id, chapter_no, team_no)
);

create table public.chapter_defaults (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  chapter_no int not null,
  chapter_name text,
  default_image_url text,
  default_description text,
  unique(track_id, chapter_no)
);

create table public.letters_awards (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  tutor_name text,
  tutor_letter text,
  manager_name text,
  manager_letter text,
  certificate_url text,
  award_type text default '없음',
  award_url text,
  award_phrase text,
  unique(track_id, student_id)
);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tracks_touch before update on public.tracks for each row execute function public.touch_updated_at();
create trigger students_touch before update on public.students for each row execute function public.touch_updated_at();

alter table public.admin_accounts disable row level security;
alter table public.tracks disable row level security;
alter table public.students disable row level security;
alter table public.student_chapter_teams disable row level security;
alter table public.chapter_results disable row level security;
alter table public.chapter_defaults disable row level security;
alter table public.letters_awards disable row level security;

grant usage on schema public to anon, authenticated;
grant all on public.admin_accounts to anon, authenticated;
grant all on public.tracks to anon, authenticated;
grant all on public.students to anon, authenticated;
grant all on public.student_chapter_teams to anon, authenticated;
grant all on public.chapter_results to anon, authenticated;
grant all on public.chapter_defaults to anon, authenticated;
grant all on public.letters_awards to anon, authenticated;

create or replace function public.get_public_report(p_slug text, p_name text, p_password text)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_track public.tracks%rowtype;
  v_student public.students%rowtype;
  v_payload jsonb;
begin
  select * into v_track
  from public.tracks
  where public_slug = p_slug and is_published = true
  limit 1;

  if v_track.id is null then
    return jsonb_build_object('ok', false, 'message', '공개된 리포트 링크를 찾을 수 없습니다.');
  end if;

  select * into v_student
  from public.students
  where track_id = v_track.id
    and name = p_name
    and password = p_password
    and is_public = true
  limit 1;

  if v_student.id is null then
    return jsonb_build_object('ok', false, 'message', '이름 또는 비밀번호가 일치하지 않습니다.');
  end if;

  select jsonb_build_object(
    'ok', true,
    'track', to_jsonb(v_track),
    'student', to_jsonb(v_student),
    'chapterTeams', coalesce((select jsonb_agg(to_jsonb(x) order by x.chapter_no) from public.student_chapter_teams x where x.student_id = v_student.id), '[]'::jsonb),
    'chapterResults', coalesce((select jsonb_agg(to_jsonb(x) order by x.chapter_no, x.team_no) from public.chapter_results x where x.track_id = v_track.id), '[]'::jsonb),
    'chapterDefaults', coalesce((select jsonb_agg(to_jsonb(x) order by x.chapter_no) from public.chapter_defaults x where x.track_id = v_track.id), '[]'::jsonb),
    'letterAward', coalesce((select to_jsonb(x) from public.letters_awards x where x.student_id = v_student.id limit 1), '{}'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

grant execute on function public.get_public_report(text, text, text) to anon, authenticated;
