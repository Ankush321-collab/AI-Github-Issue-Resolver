'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { REGISTER } from '@/lib/queries';
import { setAuthToken } from '@/lib/auth';
import { Eye, EyeOff, UserPlus, Mail, Lock, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const authBase = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:4000';

  const [register, { loading }] = useMutation(REGISTER, {
    onCompleted: (data) => {
      setAuthToken(data.register.token);
      router.replace('/');
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    register({ variables: { email, password } });
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
      <motion.div 
        animate={{ 
          x: [0, 20, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#ff007f]/15 blur-[120px] rounded-full opacity-50 pointer-events-none"
      />
      <motion.div 
        animate={{ 
          x: [0, -20, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#00ffff]/10 blur-[100px] rounded-full opacity-50 pointer-events-none"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div 
          whileHover={{ scale: 1.02, boxShadow: "0_20px_60px_-20px_rgba(0,255,255,0.4),0_0_30px_rgba(255,0,127,0.2)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass rounded-3xl p-8 border border-white/10 shadow-2xl hover-card"
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
                  '0 0 20px rgba(0, 255, 255, 0.3)',
                  '0 0 40px rgba(255, 0, 127, 0.3)',
                  '0 0 20px rgba(0, 255, 255, 0.3)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center"
            >
              <UserPlus className="w-6 h-6 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-semibold mt-4 text-gradient-animated">Create your account</h1>
            <p className="text-text-muted text-sm mt-2">Get a private workspace for your tokens.</p>
          </motion.div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label className="text-xs uppercase tracking-[0.2em] text-text-muted">Email</label>
              <motion.div 
                whileFocus={{ scale: 1.02 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-secondary/40 focus-within:bg-white/10 transition-all"
              >
                <Mail className="w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent outline-none text-sm input-enhanced"
                  required
                />
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <label className="text-xs uppercase tracking-[0.2em] text-text-muted">Password</label>
              <motion.div 
                whileFocus={{ scale: 1.02 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-secondary/40 focus-within:bg-white/10 transition-all"
              >
                <Lock className="w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  className="flex-1 bg-transparent outline-none text-sm input-enhanced"
                  required
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="text-text-muted hover:text-text transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </motion.div>
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

            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 10px 30px -5px rgba(0, 255, 255, 0.5)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-primary text-background font-semibold tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-60 neon-button"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </motion.button>
          </form>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 space-y-3"
          >
            <div className="text-center text-xs uppercase tracking-[0.3em] text-text-muted">
              Or sign up with
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
            transition={{ delay: 0.6 }}
            className="text-center text-sm text-text-muted mt-6"
          >
            Already have an account?{' '}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-primary hover:text-primary/80 glow-text-cyan"
              onClick={() => router.push('/login')}
            >
              Sign in
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
        <div className="relative z-10 w-full max-w-md">
          <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl flex items-center justify-center min-h-[400px]">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full"
            />
          </div>
        </div>
      </main>
    }>
      <SignupForm />
    </Suspense>
  );
}
