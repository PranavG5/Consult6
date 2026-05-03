import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | Consult6",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
