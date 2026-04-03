'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADD_GITHUB_TOKEN,
  UPDATE_GITHUB_TOKEN,
  DELETE_GITHUB_TOKEN,
  SET_ACTIVE_GITHUB_TOKEN,
  UPDATE_PROFILE,
  ME,
  LOGOUT,
} from '@/lib/queries';
import { AuthGate } from '@/components/AuthGate';
import { clearAuthToken } from '@/lib/auth';
import {
  ArrowLeft,
  Github,
  Mail,
  ShieldCheck,
  UserRound,
  Image as ImageIcon,
  Trash2,
  Save,
  KeyRound,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface GitHubToken {
  id: string;
  label: string;
  lastFour: string;
  createdAt: string;
}

function getInitials(email: string): string {
  const parts = email.split('@')[0]?.split(/[._-]/).filter(Boolean) ?? [];
  const first = parts[0]?.[0] ?? email[0] ?? 'U';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
}

function ProviderBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] border',
        active
          ? 'border-secondary/40 bg-secondary/10 text-secondary'
          : 'border-white/10 bg-white/5 text-text-muted'
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', active ? 'bg-secondary' : 'bg-white/20')} />
      {label}
    </div>
  );
}

function ProfilePage() {
  const router = useRouter();
  const { data, loading, refetch } = useQuery(ME);
  const me = data?.me;
  const tokens: GitHubToken[] = me?.githubTokens ?? [];
  const activeTokenId: string | null = me?.activeGithubTokenId ?? null;
  const providers: string[] = me?.authProviders ?? [];

  const [profileImageUrl, setProfileImageUrl] = useState(me?.profileImageUrl ?? '');
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [githubTokenLabel, setGithubTokenLabel] = useState('');
  const [githubTokenValue, setGithubTokenValue] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);

  const initials = useMemo(() => (me?.email ? getInitials(me.email) : 'U'), [me?.email]);

  useEffect(() => {
    if (me?.profileImageUrl !== undefined) {
      setProfileImageUrl(me?.profileImageUrl ?? '');
    }
  }, [me?.profileImageUrl]);

  const [updateProfile, { loading: savingProfile }] = useMutation(UPDATE_PROFILE, {
    onCompleted: (payload) => {
      setProfileImageUrl(payload.updateProfile.profileImageUrl || '');
      refetch();
    },
  });

  const [addGithubToken, { loading: addingToken }] = useMutation(ADD_GITHUB_TOKEN, {
    onCompleted: () => {
      setTokenSaved(true);
      setGithubTokenValue('');
      setGithubTokenLabel('');
      setEditingTokenId(null);
      refetch();
      setTimeout(() => setTokenSaved(false), 2000);
    },
  });

  const [updateGithubToken, { loading: updatingToken }] = useMutation(UPDATE_GITHUB_TOKEN, {
    onCompleted: () => {
      setTokenSaved(true);
      setGithubTokenValue('');
      setGithubTokenLabel('');
      setEditingTokenId(null);
      refetch();
      setTimeout(() => setTokenSaved(false), 2000);
    },
  });

  const [deleteGithubToken] = useMutation(DELETE_GITHUB_TOKEN, {
    onCompleted: () => {
      setEditingTokenId(null);
      setGithubTokenValue('');
      setGithubTokenLabel('');
      refetch();
    },
  });

  const [setActiveGithubToken] = useMutation(SET_ACTIVE_GITHUB_TOKEN, {
    onCompleted: () => refetch(),
  });

  const [logout] = useMutation(LOGOUT, {
    onCompleted: () => {
      clearAuthToken();
      window.location.href = '/login';
    },
  });

  const handleProfileSave = () => {
    updateProfile({ variables: { profileImageUrl: profileImageUrl.trim() || null } });
  };

  const handleProfileRemove = () => {
    setProfileImageUrl('');
    updateProfile({ variables: { profileImageUrl: null } });
  };

  const handleTokenSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!githubTokenLabel.trim() || (!editingTokenId && !githubTokenValue.trim())) {
      return;
    }

    if (editingTokenId) {
      updateGithubToken({
        variables: {
          id: editingTokenId,
          token: githubTokenValue.trim(),
          label: githubTokenLabel.trim(),
        },
      });
      return;
    }

    addGithubToken({
      variables: {
        token: githubTokenValue.trim(),
        label: githubTokenLabel.trim(),
      },
    });
  };

  const handleTokenEdit = (token: GitHubToken) => {
    setEditingTokenId(token.id);
    setGithubTokenLabel(token.label);
    setGithubTokenValue('');
  };

  const handleTokenDelete = (tokenId: string) => {
    deleteGithubToken({ variables: { id: tokenId } });
  };

  const handleTokenCancel = () => {
    setEditingTokenId(null);
    setGithubTokenLabel('');
    setGithubTokenValue('');
  };

  return (
    <div className="min-h-screen bg-background profile-gradient px-6 py-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto space-y-10"
      >
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <motion.div
            whileHover={{ x: -5 }}
            className="flex items-center gap-4"
          >
            <button
              className="flex items-center gap-2 text-sm text-text-muted hover:text-secondary transition-colors"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </button>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-text-muted hover:text-error hover:border-error/40 transition-colors"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </motion.button>
        </motion.div>

        <div className="grid lg:grid-cols-[1.1fr_1.4fr] gap-8">
          <motion.section 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-8 shadow-2xl border border-white/10 hover-card"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-6"
            >
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 3 }}
                className="relative"
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="h-24 w-24 rounded-2xl object-cover border border-white/10"
                  />
                ) : (
                  <motion.div 
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(255, 0, 127, 0.3)',
                        '0 0 40px rgba(0, 255, 255, 0.3)',
                        '0 0 20px rgba(255, 0, 127, 0.3)'
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center text-2xl font-bold text-white"
                  >
                    {initials}
                  </motion.div>
                )}
                <motion.div 
                  whileHover={{ scale: 1.2 }}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center"
                >
                  <UserRound className="w-4 h-4 text-secondary" />
                </motion.div>
              </motion.div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Website</p>
                <h1 className="text-2xl font-semibold mt-1 text-gradient-animated">Agent Orchestrator</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
                  <Mail className="w-4 h-4" />
                  {me?.email || (loading ? 'Loading...' : 'Unknown')}
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 space-y-4"
            >
              <div className="flex flex-wrap gap-3">
                <ProviderBadge label="Email" active={providers.includes('email')} />
                <ProviderBadge label="GitHub" active={providers.includes('github')} />
                <ProviderBadge label="Google" active={providers.includes('google')} />
              </div>
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-sm font-semibold">Profile image URL</p>
                    <p className="text-xs text-text-muted">Paste an image URL to personalize your profile</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <motion.input
                    whileFocus={{ scale: 1.02, boxShadow: "0 0 15px rgba(0, 255, 255, 0.2)" }}
                    value={profileImageUrl}
                    onChange={(event) => setProfileImageUrl(event.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm focus:border-secondary/40 focus:outline-none input-enhanced"
                  />
                  <div className="flex flex-wrap gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 rounded-full bg-secondary text-background px-4 py-2 text-sm font-semibold hover:bg-secondary/90 transition-colors neon-button"
                      onClick={handleProfileSave}
                      disabled={savingProfile}
                    >
                      <Save className="w-4 h-4" />
                      {savingProfile ? 'Saving...' : 'Update image'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, borderColor: "rgba(239, 68, 68, 0.4)", color: "#ef4444" }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-text-muted transition-colors"
                      onClick={handleProfileRemove}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove image
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-3xl p-8 shadow-2xl border border-white/10 hover-card"
          >
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Security</p>
                <h2 className="text-2xl font-semibold mt-1 text-gradient-animated">GitHub tokens</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <ShieldCheck className="w-4 h-4" />
                Max 3 tokens
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 space-y-4"
            >
                {tokens.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-text-muted"
                  >
                    No tokens yet. Add one to enable GitHub operations.
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {tokens.map((token, index) => (
                      <motion.div
                        key={token.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className={clsx(
                          'flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition-all hover:shadow-lg',
                          token.id === activeTokenId
                            ? 'border-secondary/40 bg-secondary/10 shadow-secondary/10'
                            : 'border-white/10 bg-white/5 hover:border-secondary/20'
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <Github className="w-4 h-4 text-secondary" />
                            <p className="font-semibold">{token.label}</p>
                            {token.id === activeTokenId && (
                              <motion.span 
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="flex items-center gap-1 text-xs text-secondary"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </motion.span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-1">•••• {token.lastFour}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {token.id !== activeTokenId && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="rounded-full border border-secondary/30 px-3 py-1 text-xs text-secondary hover:bg-secondary/10"
                              onClick={() => setActiveGithubToken({ variables: { id: token.id } })}
                            >
                              Set active
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.05, color: "#00ffff" }}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-text-muted"
                            onClick={() => handleTokenEdit(token)}
                          >
                            Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05, color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-text-muted"
                            onClick={() => handleTokenDelete(token.id)}
                          >
                            Delete
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <motion.form 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onSubmit={handleTokenSubmit} 
                  className="mt-6 space-y-4"
                >
                  <div className="grid gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-text-muted">Token label</label>
                      <motion.input
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 15px rgba(255, 0, 127, 0.2)" }}
                        value={githubTokenLabel}
                        onChange={(event) => setGithubTokenLabel(event.target.value)}
                        placeholder="Work, Personal, Team"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm focus:border-secondary/40 focus:outline-none input-enhanced"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-text-muted">Token value</label>
                      <motion.input
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 15px rgba(255, 0, 127, 0.2)" }}
                        value={githubTokenValue}
                        onChange={(event) => setGithubTokenValue(event.target.value)}
                        placeholder={editingTokenId ? 'Paste a new token value' : 'ghp_...'}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm focus:border-secondary/40 focus:outline-none input-enhanced"
                        required={!editingTokenId}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255, 0, 127, 0.4)" }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={
                        addingToken ||
                        updatingToken ||
                        !githubTokenLabel.trim() ||
                        (!editingTokenId && tokens.length >= 3) ||
                        (!editingTokenId && !githubTokenValue.trim())
                      }
                      className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary/90 disabled:opacity-50 neon-button"
                    >
                      <KeyRound className="w-4 h-4" />
                      {addingToken || updatingToken
                        ? 'Saving...'
                        : editingTokenId
                          ? 'Update token'
                          : 'Add token'}
                    </motion.button>
                    {editingTokenId && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-text-muted hover:text-secondary"
                        onClick={handleTokenCancel}
                      >
                        Cancel edit
                      </motion.button>
                    )}
                    {tokenSaved && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs text-secondary glow-text-cyan"
                      >
                        Saved!
                      </motion.span>
                    )}
                  </div>
                  {!editingTokenId && tokens.length >= 3 && (
                    <p className="text-xs text-warning">
                      You have reached the maximum of 3 tokens. Delete one to add another.
                    </p>
                  )}
                </motion.form>
              </motion.div>
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
}

export default function ProfileRoute() {
  return (
    <AuthGate>
      <ProfilePage />
    </AuthGate>
  );
}
