import type { Metadata } from "next";
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Get Started | Consult6",
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupClient />
    </Suspense>
  );
}
