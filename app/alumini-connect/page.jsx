'use client';

import React from "react";
import ClerkWrapper from "@/components/clerk/ClerkWrapper";
import AlumniConnectClient from "@/components/alumni/AlumniConnectClient";

// Server Component: wraps the client component with ClerkProvider
export default function AlumniConnectPage() {
  return (
    <ClerkWrapper>
      <AlumniConnectClient />
    </ClerkWrapper>
  );
}
