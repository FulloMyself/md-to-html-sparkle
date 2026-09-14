CREATE TABLE public.estate_codes (
  estate_id uuid PRIMARY KEY REFERENCES public.estates(id) ON DELETE CASCADE,
  resident_code text NOT NULL,
  guard_code text NOT NULL,
  admin_code text NOT NULL
);

GRANT ALL ON public.estate_codes TO service_role;
REVOKE ALL ON public.estate_codes FROM PUBLIC, anon, authenticated;

ALTER TABLE public.estate_codes ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (server-side admin client) can reach this table.

INSERT INTO public.estate_codes (estate_id, resident_code, guard_code, admin_code)
SELECT estate_id, resident_code, guard_code, admin_code FROM private.estate_codes
ON CONFLICT (estate_id) DO NOTHING;

DROP TABLE private.estate_codes;