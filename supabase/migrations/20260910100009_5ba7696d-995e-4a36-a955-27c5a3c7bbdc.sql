-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','estate_admin','guard','resident');
CREATE TYPE public.gate_direction AS ENUM ('entry','exit','both');
CREATE TYPE public.access_decision AS ENUM ('allowed','denied','held');
CREATE TYPE public.pass_status AS ENUM ('active','expired','used','revoked');
CREATE TYPE public.bay_status AS ENUM ('free','occupied','reserved');
CREATE TYPE public.device_status AS ENUM ('online','degraded','offline');

-- SHARED
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ESTATES
CREATE TABLE public.estates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  resident_code text NOT NULL UNIQUE,
  guard_code text NOT NULL UNIQUE,
  admin_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estates TO authenticated;
GRANT ALL ON public.estates TO service_role;
ALTER TABLE public.estates ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  estate_id uuid REFERENCES public.estates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_roles_unique ON public.user_roles (user_id, role, COALESCE(estate_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_estate_member(_user_id uuid, _estate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND estate_id = _estate_id);
$$;

CREATE OR REPLACE FUNCTION public.is_estate_staff(_user_id uuid, _estate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND estate_id = _estate_id AND role IN ('estate_admin','guard'));
$$;

CREATE OR REPLACE FUNCTION public.is_estate_manager(_user_id uuid, _estate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND estate_id = _estate_id AND role = 'estate_admin');
$$;

CREATE OR REPLACE FUNCTION public.shares_estate_with(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_viewer)
      OR EXISTS (
        SELECT 1 FROM public.user_roles v
        JOIN public.user_roles t ON t.estate_id = v.estate_id
        WHERE v.user_id = _viewer AND v.role IN ('estate_admin','guard') AND t.user_id = _target
      );
$$;

-- ESTATE POLICIES
CREATE POLICY estates_select ON public.estates FOR SELECT TO authenticated USING (public.is_estate_member(auth.uid(), id));
CREATE POLICY estates_insert ON public.estates FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY estates_update ON public.estates FOR UPDATE TO authenticated USING (public.is_estate_manager(auth.uid(), id)) WITH CHECK (public.is_estate_manager(auth.uid(), id));
CREATE POLICY estates_delete ON public.estates FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- PROFILE POLICIES
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.shares_estate_with(auth.uid(), id));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ROLE POLICIES
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_estate_manager(auth.uid(), estate_id) AND (role <> 'super_admin' OR public.is_super_admin(auth.uid())));
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated USING (public.is_estate_manager(auth.uid(), estate_id) AND (role <> 'super_admin' OR public.is_super_admin(auth.uid())));

-- UNITS
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estate_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY units_select ON public.units FOR SELECT TO authenticated USING (public.is_estate_member(auth.uid(), estate_id));
CREATE POLICY units_write ON public.units FOR ALL TO authenticated USING (public.is_estate_manager(auth.uid(), estate_id)) WITH CHECK (public.is_estate_manager(auth.uid(), estate_id));

-- UNIT RESIDENTS
CREATE TABLE public.unit_residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_residents TO authenticated;
GRANT ALL ON public.unit_residents TO service_role;
ALTER TABLE public.unit_residents ENABLE ROW LEVEL SECURITY;
CREATE POLICY unit_residents_select ON public.unit_residents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY unit_residents_write ON public.unit_residents FOR ALL TO authenticated USING (public.is_estate_manager(auth.uid(), estate_id)) WITH CHECK (public.is_estate_manager(auth.uid(), estate_id));

-- GATES
CREATE TABLE public.gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  name text NOT NULL,
  direction public.gate_direction NOT NULL DEFAULT 'both',
  is_open boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gates TO authenticated;
GRANT ALL ON public.gates TO service_role;
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY gates_select ON public.gates FOR SELECT TO authenticated USING (public.is_estate_member(auth.uid(), estate_id));
CREATE POLICY gates_update ON public.gates FOR UPDATE TO authenticated USING (public.is_estate_staff(auth.uid(), estate_id)) WITH CHECK (public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY gates_manage ON public.gates FOR INSERT TO authenticated WITH CHECK (public.is_estate_manager(auth.uid(), estate_id));
CREATE POLICY gates_delete ON public.gates FOR DELETE TO authenticated USING (public.is_estate_manager(auth.uid(), estate_id));

-- VEHICLES
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  plate text NOT NULL,
  make text,
  model text,
  colour text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estate_id, plate)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY vehicles_select ON public.vehicles FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY vehicles_insert ON public.vehicles FOR INSERT TO authenticated WITH CHECK ((owner_id = auth.uid() AND public.is_estate_member(auth.uid(), estate_id)) OR public.is_estate_manager(auth.uid(), estate_id));
CREATE POLICY vehicles_update ON public.vehicles FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_estate_manager(auth.uid(), estate_id)) WITH CHECK (owner_id = auth.uid() OR public.is_estate_manager(auth.uid(), estate_id));
CREATE POLICY vehicles_delete ON public.vehicles FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_estate_manager(auth.uid(), estate_id));

-- VISITOR PASSES
CREATE TABLE public.visitor_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  visitor_name text NOT NULL,
  visitor_phone text,
  plate text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz NOT NULL,
  status public.pass_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_passes TO authenticated;
GRANT ALL ON public.visitor_passes TO service_role;
ALTER TABLE public.visitor_passes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER visitor_passes_updated_at BEFORE UPDATE ON public.visitor_passes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY visitor_passes_select ON public.visitor_passes FOR SELECT TO authenticated USING (host_id = auth.uid() OR public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY visitor_passes_insert ON public.visitor_passes FOR INSERT TO authenticated WITH CHECK ((host_id = auth.uid() AND public.is_estate_member(auth.uid(), estate_id)) OR public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY visitor_passes_update ON public.visitor_passes FOR UPDATE TO authenticated USING (host_id = auth.uid() OR public.is_estate_staff(auth.uid(), estate_id)) WITH CHECK (host_id = auth.uid() OR public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY visitor_passes_delete ON public.visitor_passes FOR DELETE TO authenticated USING (host_id = auth.uid() OR public.is_estate_manager(auth.uid(), estate_id));

-- PARKING BAYS
CREATE TABLE public.parking_bays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  code text NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  status public.bay_status NOT NULL DEFAULT 'free',
  occupied_plate text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estate_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parking_bays TO authenticated;
GRANT ALL ON public.parking_bays TO service_role;
ALTER TABLE public.parking_bays ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER parking_bays_updated_at BEFORE UPDATE ON public.parking_bays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY parking_bays_select ON public.parking_bays FOR SELECT TO authenticated USING (public.is_estate_member(auth.uid(), estate_id));
CREATE POLICY parking_bays_update ON public.parking_bays FOR UPDATE TO authenticated USING (public.is_estate_staff(auth.uid(), estate_id)) WITH CHECK (public.is_estate_staff(auth.uid(), estate_id));
CREATE POLICY parking_bays_insert ON public.parking_bays FOR INSERT TO authenticated WITH CHECK (public.is_estate_manager(auth.uid(), estate_id));
CREATE POLICY parking_bays_delete ON public.parking_bays FOR DELETE TO authenticated USING (public.is_estate_manager(auth.uid(), estate_id));

-- DEVICES
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  gate_id uuid REFERENCES public.gates(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'camera',
  status public.device_status NOT NULL DEFAULT 'online',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY devices_select ON public.devices FOR SELECT TO authenticated USING (public.is_estate_member(auth.uid(), estate_id));
CREATE POLICY devices_write ON public.devices FOR ALL TO authenticated USING (public.is_estate_manager(auth.uid(), estate_id)) WITH CHECK (public.is_estate_manager(auth.uid(), estate_id));

-- ACCESS EVENTS
CREATE TABLE public.access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  gate_id uuid REFERENCES public.gates(id) ON DELETE SET NULL,
  plate text NOT NULL,
  direction public.gate_direction NOT NULL DEFAULT 'entry',
  decision public.access_decision NOT NULL,
  reason text NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  pass_id uuid REFERENCES public.visitor_passes(id) ON DELETE SET NULL,
  bay_code text,
  confidence numeric(4,3) NOT NULL DEFAULT 0.98,
  source text NOT NULL DEFAULT 'simulated',
  captured_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text
);
CREATE INDEX access_events_estate_time ON public.access_events (estate_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_events TO authenticated;
GRANT ALL ON public.access_events TO service_role;
ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY access_events_select ON public.access_events FOR SELECT TO authenticated USING (
  public.is_estate_staff(auth.uid(), estate_id)
  OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = access_events.vehicle_id AND v.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.visitor_passes p WHERE p.id = access_events.pass_id AND p.host_id = auth.uid())
);
CREATE POLICY access_events_insert ON public.access_events FOR INSERT TO authenticated WITH CHECK (public.is_estate_member(auth.uid(), estate_id));
CREATE POLICY access_events_update ON public.access_events FOR UPDATE TO authenticated USING (public.is_estate_staff(auth.uid(), estate_id)) WITH CHECK (public.is_estate_staff(auth.uid(), estate_id));

-- NEW USER HANDLING: profile + super admin bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- JOIN AN ESTATE WITH A CODE
CREATE OR REPLACE FUNCTION public.join_estate(_code text, _unit_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _estate public.estates%ROWTYPE;
  _role public.app_role;
  _unit_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  _code := upper(trim(_code));

  SELECT * INTO _estate FROM public.estates
   WHERE upper(resident_code) = _code OR upper(guard_code) = _code OR upper(admin_code) = _code;
  IF NOT FOUND THEN RAISE EXCEPTION 'That join code is not recognised'; END IF;

  _role := CASE
    WHEN upper(_estate.admin_code) = _code THEN 'estate_admin'::public.app_role
    WHEN upper(_estate.guard_code) = _code THEN 'guard'::public.app_role
    ELSE 'resident'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role, estate_id)
  VALUES (_uid, _role, _estate.id) ON CONFLICT DO NOTHING;

  IF _role = 'resident' AND _unit_label IS NOT NULL AND length(trim(_unit_label)) > 0 THEN
    SELECT id INTO _unit_id FROM public.units WHERE estate_id = _estate.id AND lower(label) = lower(trim(_unit_label));
    IF _unit_id IS NULL THEN
      INSERT INTO public.units (estate_id, label) VALUES (_estate.id, trim(_unit_label)) RETURNING id INTO _unit_id;
    END IF;
    INSERT INTO public.unit_residents (estate_id, unit_id, user_id, is_primary)
    VALUES (_estate.id, _unit_id, _uid, true) ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('estate_id', _estate.id, 'estate_name', _estate.name, 'role', _role);
END; $$;
GRANT EXECUTE ON FUNCTION public.join_estate(text, text) TO authenticated;

-- REALTIME
ALTER TABLE public.access_events REPLICA IDENTITY FULL;
ALTER TABLE public.gates REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gates;

-- DEMO ESTATE
INSERT INTO public.estates (id, name, address, resident_code, guard_code, admin_code) VALUES
 ('11111111-1111-1111-1111-111111111111', 'Northgate Estate', '14 Northgate Drive, Sandton', 'NG-RES-2026', 'NG-GRD-2026', 'NG-ADM-2026');

INSERT INTO public.units (id, estate_id, label) VALUES
 ('22222222-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','A-04'),
 ('22222222-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','A-05'),
 ('22222222-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','B-11'),
 ('22222222-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','B-12'),
 ('22222222-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','C-02');

INSERT INTO public.gates (id, estate_id, name, direction) VALUES
 ('33333333-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Main Entry','entry'),
 ('33333333-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Main Exit','exit'),
 ('33333333-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Service Gate','both');

INSERT INTO public.parking_bays (estate_id, code, unit_id, status) VALUES
 ('11111111-1111-1111-1111-111111111111','A-04','22222222-0000-0000-0000-000000000001','free'),
 ('11111111-1111-1111-1111-111111111111','A-05','22222222-0000-0000-0000-000000000002','free'),
 ('11111111-1111-1111-1111-111111111111','B-11','22222222-0000-0000-0000-000000000003','free'),
 ('11111111-1111-1111-1111-111111111111','B-12','22222222-0000-0000-0000-000000000004','free'),
 ('11111111-1111-1111-1111-111111111111','C-02','22222222-0000-0000-0000-000000000005','free'),
 ('11111111-1111-1111-1111-111111111111','V-01',NULL,'free'),
 ('11111111-1111-1111-1111-111111111111','V-02',NULL,'free');

INSERT INTO public.devices (estate_id, gate_id, name, kind, status) VALUES
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000001','Entry camera','camera','online'),
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000001','Entry boom','boom','online'),
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000002','Exit camera','camera','online'),
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000003','Service camera','camera','degraded'),
 ('11111111-1111-1111-1111-111111111111',NULL,'Estate gateway','gateway','online');