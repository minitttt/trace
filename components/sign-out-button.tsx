"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/auth-helpers";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await signOutUser();
      }}
    >
      <LogOut className="h-4 w-4" /> Sign out
    </Button>
  );
}
