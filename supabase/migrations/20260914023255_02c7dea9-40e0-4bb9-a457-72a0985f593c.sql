-- 1. Private schema for internals
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Move join codes out of the publicly readable estates table
CREATE TABLE IF NOT EXISTS private.estate_codes (
  estate_id uuid PRIMARY KEY REFERENCES public.estates(id) ON DELETE CASCADE,
  resident_code text NOT NULL,
  guard_code text NOT NULL,
  admin_code text NOT NULL
);

INSERT INTO private.estate_codes (estate_id, resident_code, guard_code, admin_code)
SELECT id, resident_code, guard_code, admin_code FROM public.estates
ON CONFLICT (estate_id) DO NOTHING;

ALTER TABLE public.estates
  DROP COLUMN resident_code,
  DROP COLUMN guard_code,
  DROP COLUMN admin_code;

REVOKE ALL ON private.estate_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.estate_codes TO service_role;

-- 3. Drop the publicly callable SECURITY DEFINER join routine (replaced by a server function)
DROP FUNCTION IF EXISTS public.join_estate(text, text);

-- 4. Move SECURITY DEFINER helpers out of the exposed public schema.
--    Policies reference these by OID, so they keep working after the move.
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_super_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_estate_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_estate_staff(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_estate_manager(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.shares_estate_with(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

-- Re-point internal cross-references at the new schema
CREATE OR REPLACE FUNCTION private.is_estate_manager(_user_id uuid, _estate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'private', 'public' AS $$
  SELECT private.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND estate_id = _estate_id AND role = 'estate_admin');
$$;

CREATE OR REPLACE FUNCTION private.is_estate_member(_user_id uuid, _estate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'private', 'public' AS $$
  SELECT private.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND estate_id = _estate_id);
$$;

CREATE OR REPLACE FUNCTION private.is_estate_staff(_user_id uuid, _estate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'private', 'public' AS $$
  SELECT private.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND estate_id = _estate_id AND role IN ('estate_admin','guard'));
$$;

CREATE OR REPLACE FUNCTION private.shares_estate_with(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'private', 'public' AS $$
  SELECT private.is_super_admin(_viewer)
      OR EXISTS (
        SELECT 1 FROM public.user_roles v
        JOIN public.user_roles t ON t.estate_id = v.estate_id
        WHERE v.user_id = _viewer AND v.role IN ('estate_admin','guard') AND t.user_id = _target
      );
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'private', 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_estate_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_estate_staff(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_estate_manager(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.shares_estate_with(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_estate_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_estate_staff(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_estate_manager(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.shares_estate_with(uuid, uuid) TO authenticated, service_role;

-- 5. Tighten role assignment: managers may only grant guard/resident roles
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
CREATE POLICY user_roles_insert ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  private.is_super_admin(auth.uid())
  OR (
    role IN ('guard'::public.app_role, 'resident'::public.app_role)
    AND estate_id IS NOT NULL
    AND private.is_estate_manager(auth.uid(), estate_id)
  )
);

DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
CREATE POLICY user_roles_delete ON public.user_roles
FOR DELETE TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR (
    role IN ('guard'::public.app_role, 'resident'::public.app_role)
    AND estate_id IS NOT NULL
    AND private.is_estate_manager(auth.uid(), estate_id)
  )
);