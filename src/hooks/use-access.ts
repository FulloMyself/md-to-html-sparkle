import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "estate_admin" | "guard" | "resident";

export type Membership = {
  role: AppRole;
  estate_id: string | null;
};

export type Estate = {
  id: string;
  name: string;
  address: string | null;
  resident_code: string;
  guard_code: string;
  admin_code: string;
};

export type AccessContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  memberships: Membership[];
  estates: Estate[];
  estate: Estate | null;
  roles: AppRole[];
  isSuperAdmin: boolean;
  isManager: boolean;
  isGuard: boolean;
  isResident: boolean;
  unitId: string | null;
};

export const accessQueryKey = ["access-context"];

export async function fetchAccessContext(): Promise<AccessContext | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }, { data: estateRows }, { data: unitRows }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role, estate_id").eq("user_id", user.id),
      supabase.from("estates").select("id, name, address, resident_code, guard_code, admin_code"),
      supabase.from("unit_residents").select("unit_id").eq("user_id", user.id).limit(1),
    ]);

  const memberships = (roleRows ?? []) as Membership[];
  const estates = (estateRows ?? []) as Estate[];
  const estate = estates[0] ?? null;
  const roles = memberships.map((m) => m.role);
  const inEstate = (role: AppRole) =>
    memberships.some((m) => m.role === role && (!estate || m.estate_id === estate.id));
  const isSuperAdmin = roles.includes("super_admin");

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    memberships,
    estates,
    estate,
    roles,
    isSuperAdmin,
    isManager: isSuperAdmin || inEstate("estate_admin"),
    isGuard: isSuperAdmin || inEstate("estate_admin") || inEstate("guard"),
    isResident: inEstate("resident"),
    unitId: unitRows?.[0]?.unit_id ?? null,
  };
}

export function useAccess() {
  return useQuery({ queryKey: accessQueryKey, queryFn: fetchAccessContext });
}
