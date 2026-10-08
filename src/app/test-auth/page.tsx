"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TestAuth() {
  useEffect(() => {
    async function test() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("EMAIL:", user?.email);
      console.log("USER:", user);
    }

    test();
  }, []);

  return <div>Check Console</div>;
}