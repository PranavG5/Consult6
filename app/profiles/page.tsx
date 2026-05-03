import type { Metadata } from "next";
import ProfilesClient from "./ProfilesClient";

export const metadata: Metadata = {
  title: "Company Profiles | Consult6",
};

export default function ProfilesPage() {
  return <ProfilesClient />;
}
