import type { Metadata } from "next";
import TryClient from "./TryClient";

export const metadata: Metadata = {
  title: "Try Consult6 | Consult6",
};

export default function TryPage() {
  return <TryClient />;
}
