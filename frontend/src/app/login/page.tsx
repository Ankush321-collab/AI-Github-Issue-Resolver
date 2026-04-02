'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { LOGIN } from '@/lib/queries';
import { setAuthToken } from '@/lib/auth';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [login, { loading }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      setAuthToken(data.login.token);
      router.replace('/');
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    login({ variables: { email, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md glass rounded-3xl p-8 border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mt-4">Welcome back</h1>
          <p className="text-text-muted text-sm mt-2">Sign in to continue orchestration.</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-text-muted">Email</label>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Mail className="w-4 h-4 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-transparent outline-none text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-text-muted">Password</label>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Lock className="w-4 h-4 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none text-sm"
                required
              />
              <button
                type="button"
                className="text-text-muted hover:text-text transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-primary text-background font-semibold tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm text-text-muted mt-6">
          No account yet?{' '}
          <button className="text-primary hover:text-primary/80" onClick={() => router.push('/signup')}>
            Create one
          </button>
        </div>
      </div>
    </div>
  );
}
