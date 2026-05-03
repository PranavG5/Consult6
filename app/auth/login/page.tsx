import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In | Consult6",
};

export default function LoginPage() {
  return <LoginClient />;
}
