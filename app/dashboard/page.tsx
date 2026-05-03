import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | Consult6",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
