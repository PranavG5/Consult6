import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import JoinClient from "./JoinClient";

export const metadata: Metadata = {
  title: "Join your organization | Consult6",
  description: "Accept your organization's invite to Consult6.",
};

interface InviteInfo {
  valid: boolean;
  reason?: string;
  orgName?: string;
  university?: string | null;
}

async function getInviteInfo(code: string): Promise<InviteInfo> {
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("org_invites")
    .select("max_uses, use_count, expires_at, revoked_at, organizations(name, university)")
    .eq("code", code)
    .maybeSingle();

  const orgRaw = invite?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { name: string; university: string | null } | undefined;

  if (!invite || !org) return { valid: false, reason: "This invite link isn't valid. Double-check the link or ask for a new one." };
  if (invite.revoked_at) return { valid: false, reason: "This invite has been revoked. Ask your organization for a new link." };
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false, reason: "This invite has expired. Ask your organization for a new link." };
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return { valid: false, reason: "This invite has reached its maximum number of uses. Ask your organization for a new link." };
  }
  return { valid: true, orgName: org.name, university: org.university };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const info = await getInviteInfo(code);
  return <JoinClient code={code} valid={info.valid} reason={info.reason} orgName={info.orgName} university={info.university ?? null} />;
}
