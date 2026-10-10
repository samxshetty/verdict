-- Storage Wars: team registration, 2–4 members, free entry.
-- This updates only the event previously named Bollywood Saga.
-- It preserves the event ID/code, capacity, open state, registrations, and all counters.
BEGIN;

UPDATE public.events
SET name = 'Storage Wars',
    mode = 'team',
    team_min = 2,
    team_max = 4,
    fee_ise = 0,
    fee_other = 0
WHERE id = 'bollywood';

-- Safety check: abort if the target event wasn't found.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = 'bollywood'
      AND name = 'Storage Wars'
      AND mode = 'team'
      AND team_min = 2
      AND team_max = 4
      AND fee_ise = 0
      AND fee_other = 0
  ) THEN
    RAISE EXCEPTION 'Storage Wars event configuration update failed.';
  END IF;
END;
$$;

COMMIT;
