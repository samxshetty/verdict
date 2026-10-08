"use client";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    console.log("OAUTH DATA:", data);
    console.log("OAUTH ERROR:", error);

    if (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-3xl font-bold">The Verdict</h1>

        <p className="mb-8 text-zinc-400">
          Sign in with your NMAMIT Google account.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full rounded-lg bg-white px-4 py-3 font-medium text-black hover:bg-zinc-200"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}