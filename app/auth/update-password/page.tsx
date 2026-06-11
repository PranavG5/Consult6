import type { Metadata } from "next";
import UpdatePasswordClient from "./UpdatePasswordClient";

export const metadata: Metadata = {
  title: "Set New Password | Consult6",
};

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient />;
}
