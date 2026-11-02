"use client";

import { Suspense } from "react";
import { MyNeedsWorkspace } from "@/components/needs/MyNeedsWorkspace";

export default function MyNeedsPage() {
  return (
    <Suspense fallback={null}>
      <MyNeedsWorkspace />
    </Suspense>
  );
}
