"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

export default function ClerkWrapper({ children }) {
  // `ClerkProvider` reads `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from env.
  return <ClerkProvider>{children}</ClerkProvider>;
}
