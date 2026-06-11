import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password | Consult6",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
