alter table public.tracks add column if not exists total_attendance_days int;
NOTIFY pgrst, 'reload schema';
