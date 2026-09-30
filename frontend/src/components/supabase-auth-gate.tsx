import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export function SupabaseAuthGate({
  children,
}: {
  children: (session: Session | null, openSignIn: () => void) => ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setSessionError(error.message);
      setSession(data.session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading account...</main>;
  }

  const openSignIn = () => setShowAuth(true);
  if (session) return <>{children(session, openSignIn)}</>;
  if (!showAuth) return <>{children(null, openSignIn)}</>;

  if (!supabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <section className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold">Connect Supabase</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to frontend/.env.local, then restart the dev server.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setShowAuth(false)}>Back to dashboard</Button>
        </section>
      </main>
    );
  }

  return <AuthScreen initialError={sessionError} onCancel={() => setShowAuth(false)} />;
}

function AuthScreen({ initialError, onCancel }: { initialError: string; onCancel: () => void }) {
  const [signingUp, setSigningUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError("");
    setMessage("");

    const result = signingUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (signingUp && !result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">TaskFlow</p>
        <h1 className="mt-2 text-2xl font-bold">{signingUp ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to access your tasks.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium" htmlFor="auth-email">Email</label>
          <Input id="auth-email" autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label className="block text-sm font-medium" htmlFor="auth-password">Password</label>
          <Input id="auth-password" autoComplete={signingUp ? "new-password" : "current-password"} type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {message && <p role="status" className="text-sm text-success">{message}</p>}
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Please wait..." : signingUp ? "Create account" : "Sign in"}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          type="button"
          onClick={() => {
            setSigningUp((current) => !current);
            setError("");
            setMessage("");
          }}
        >
          {signingUp ? "Already have an account? Sign in" : "New to TaskFlow? Create an account"}
        </button>
        <Button className="mt-3 w-full" variant="ghost" type="button" onClick={onCancel}>Back to dashboard</Button>
      </section>
    </main>
  );
}
