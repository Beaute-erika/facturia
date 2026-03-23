-- Migration 002 — Correction du trigger handle_new_user
-- Le trigger original n'enregistrait pas les métadonnées de l'inscription
-- (prénom, nom, métier, plan). Ce correctif les récupère depuis raw_user_meta_data.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, prenom, nom, metier, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    coalesce(new.raw_user_meta_data->>'nom',    ''),
    coalesce(new.raw_user_meta_data->>'metier', 'Artisan'),
    coalesce((new.raw_user_meta_data->>'plan')::plan_type, 'starter')
  );
  return new;
end;
$$;
