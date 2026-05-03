import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Get Started | Consult6",
};

export default function SignupPage() {
  return <SignupClient />;
}
