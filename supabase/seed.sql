insert into public.achievements (id, name, description, xp) values
  (gen_random_uuid(), 'First focus', 'Complete your first study session', 50),
  (gen_random_uuid(), 'Seven day spark', 'Study for seven days in a row', 150)
on conflict do nothing;
