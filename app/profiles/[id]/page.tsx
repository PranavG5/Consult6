import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import ProfileDetailClient from "./ProfileDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data } = await supabase.from("company_profiles").select("name").eq("id", id).single();
    if (data?.name) return { title: `${data.name} | Consult6` };
  } catch {}
  return { title: "Profile | Consult6" };
}

export default function ProfileDetailPage() {
  return <ProfileDetailClient />;
}
