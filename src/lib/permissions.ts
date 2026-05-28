export type AppRole = "owner" | "lawyer" | "client";

export interface ProfileScope {
  id: string;
  role: string;
  organization_id: string;
}

export function isLegalStaff(profile: ProfileScope | null | undefined): boolean {
  return profile?.role === "owner" || profile?.role === "lawyer";
}

export function isClient(profile: ProfileScope | null | undefined): boolean {
  return profile?.role === "client";
}
