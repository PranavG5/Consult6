"use client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createClient } from "@/lib/supabase-browser";

// Brand logo link that points home for signed-out visitors and to the
// dashboard for signed-in users. Wrap the logo markup as children so each
// navbar keeps its own styling.
export default function BrandLink({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const [href, setHref] = useState("/");

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setHref(data.user ? "/dashboard" : "/");
    });
  }, []);

  return (
    <Link href={href} className={className} style={{ textDecoration: "none", ...style }}>
      {children}
    </Link>
  );
}
