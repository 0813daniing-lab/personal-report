alter table public.letters_awards add column if not exists tutor_name text;
alter table public.letters_awards add column if not exists manager_name text;
NOTIFY pgrst, 'reload schema';
