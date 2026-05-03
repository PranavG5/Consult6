import type { Metadata } from "next";
import HistoryClient from "./HistoryClient";

export const metadata: Metadata = {
  title: "Report History | Consult6",
};

export default function HistoryPage() {
  return <HistoryClient />;
}
