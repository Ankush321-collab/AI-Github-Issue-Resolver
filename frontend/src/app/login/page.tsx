'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { LOGIN } from '@/lib/queries';
import { setAuthToken } from '@/lib/auth';
import { Eye, EyeOff, Lock, Mail, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const authBase = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:4000';

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

  useEffect(() => {
    const token = searchParams.get('token');
    const oauthError = searchParams.get('error');
    if (token) {
      setAuthToken(token);
      router.replace('/');
      return;
    }
    if (oauthError) {
      setError(oauthError);
    }
  }, [searchParams, router]);

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] right-[-10%] w-[800px] h-[800px] bg-[#ff007f]/20 blur-[140px] rounded-full opacity-60"
        />
        <motion.div 
          animate={{ 
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-15%] left-[-10%] w-[700px] h-[700px] bg-[#00ffff]/15 blur-[120px] rounded-full opacity-60"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-glow-purple"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-glow-blue"
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[480px]"
      >
        <motion.div 
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card rounded-2xl p-8 md:p-12 shadow-2xl hover:shadow-[0_20px_60px_-20px_rgba(255,0,127,0.4),0_0_30px_rgba(0,255,255,0.2)] border border-white/10"
        >
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <motion.div 
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(255, 0, 127, 0.3)',
                  '0 0 40px rgba(0, 255, 255, 0.3)',
                  '0 0 20px rgba(255, 0, 127, 0.3)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center"
            >
              <Lock className="w-6 h-6 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-semibold mt-4 text-gradient-animated">Welcome back</h1>
            <p className="text-text-muted text-sm mt-2">Sign in to continue orchestration.</p>
          </motion.div>

          <form className="space-y-8" onSubmit={onSubmit}>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3 group input-focus-glow"
            >
              <label className="font-label text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant/60 ml-1 transition-colors group-focus-within:text-secondary-fixed-dim group-focus-within:text-[#00ffff]">Email</label>
              <div className="relative">
                <motion.span 
                  whileHover={{ scale: 1.1 }}
                  className="absolute left-0 bottom-3 text-outline-variant/60 group-focus-within:text-secondary-fixed-dim transition-all duration-300 group-focus-within:-translate-y-1"
                >
                  <Mail className="w-5 h-5 text-outline-variant/60" />
                </motion.span>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent border-0 border-b border-outline-variant/30 py-3 pl-8 pr-4 text-on-surface placeholder:text-outline/40 focus:ring-0 focus:border-[#00ffff] transition-all duration-500 font-body text-sm outline-none input-enhanced"
                  required
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 group input-focus-glow"
            >
              <div className="flex justify-between items-end">
                <label className="font-label text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant/60 ml-1 transition-colors group-focus-within:text-[#00ffff]">Password</label>
              </div>
              <div className="relative">
                <motion.span 
                  whileHover={{ scale: 1.1 }}
                  className="absolute left-0 bottom-3 text-outline-variant/60 group-focus-within:-translate-y-1 transition-all duration-300"
                >
                  <Lock className="w-5 h-5 text-outline-variant/60" />
                </motion.span>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-0 border-b border-outline-variant/30 py-3 pl-8 pr-4 text-on-surface placeholder:text-outline/40 focus:ring-0 focus:border-[#00ffff] transition-all duration-500 font-body text-sm outline-none input-enhanced"
                  required
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="absolute right-0 bottom-3 text-outline-variant hover:text-on-surface-variant transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-6"
            >
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 10px 30px -5px rgba(255, 0, 127, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="btn-gradient relative w-full h-14 rounded-full flex items-center justify-center gap-2 overflow-hidden group/btn disabled:opacity-60 neon-button"
              >
                <motion.span 
                  animate={loading ? { rotate: 360 } : {}}
                  transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                  className="relative z-10 font-headline font-bold text-white tracking-wider"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </motion.span>
                <motion.div 
                  initial={{ x: -100 }}
                  whileHover={{ x: 100 }}
                  className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"
                />
              </motion.button>
            </motion.div>
          </form>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 space-y-3"
          >
            <div className="text-center text-xs uppercase tracking-[0.3em] text-on-surface-variant/60">
              Or continue with
            </div>
            <div className="grid gap-3">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="oauth-btn flex items-center justify-center gap-3 rounded-full h-12 text-sm font-semibold"
                onClick={() => {
                  window.location.href = `${authBase}/auth/github`;
                }}
              >
                <Github className="w-5 h-5" />
                GitHub
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="oauth-btn oauth-google flex items-center justify-center gap-3 rounded-full h-12 text-sm font-semibold"
                onClick={() => {
                  window.location.href = `${authBase}/auth/google`;
                }}
              >
                <span className="oauth-google-icon" aria-hidden="true"></span>
                Google
              </motion.button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12 text-center"
          >
            <p className="text-on-surface-variant/70 text-sm font-medium">
              No account yet?{' '}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-[#ff007f] font-bold ml-1 hover:text-[#00ffff] transition-all underline decoration-[#ff007f]/20 underline-offset-8 hover:decoration-[#ff007f]/60 glow-text"
                onClick={() => router.push('/signup')}
              >
                Create one
              </motion.button>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
        <div className="relative z-10 w-full max-w-[480px]">
          <div className="glass-card rounded-2xl p-8 md:p-12 shadow-2xl flex items-center justify-center min-h-[400px]">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full"
            />
          </div>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
