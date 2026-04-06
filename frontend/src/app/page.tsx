'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  GET_RUNS,
  GET_RUN_DETAILS,
  START_RUN,
  AGENT_PROGRESS,
  ADD_GITHUB_TOKEN,
  UPDATE_GITHUB_TOKEN,
  DELETE_GITHUB_TOKEN,
  SET_ACTIVE_GITHUB_TOKEN,
  ME,
  LOGOUT,
} from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Github,
  ExternalLink,
  Terminal,
  Plus,
  Zap,
  Brain,
  Code,
  FlaskConical,
  GitPullRequest,
  KeyRound,
  LogOut,
  UserRound
} from 'lucide-react';
import clsx from 'clsx';
import { AuthGate } from '@/components/AuthGate';
import { clearAuthToken } from '@/lib/auth';

type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface Run {
  id: string;
  issue: string;
  repoUrl: string;
  status: RunStatus;
  error?: string;
  plan?: string;
  patch?: string;
  tests?: string;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
  logs?: Log[];
}

interface Log {
  id: string;
  agentName: string;
  message: string;
  timestamp: string;
}

interface ProgressEvent {
  runId: string;
  agentName: string;
  eventType: string;
  content: string;
  timestamp: string;
}

interface GitHubToken {
  id: string;
  label: string;
  lastFour: string;
  createdAt: string;
}

const statusConfig: Record<RunStatus, { color: string; bg: string; icon: typeof CheckCircle }> = {
  PENDING: { color: 'text-zinc-400', bg: 'bg-zinc-500/10', icon: Clock },
  RUNNING: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Loader2 },
  COMPLETED: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
  FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
  CANCELLED: { color: 'text-zinc-400', bg: 'bg-zinc-500/10', icon: XCircle },
};

const agentIcons: Record<string, typeof Brain> = {
  code_reader: Brain,
  planner: Zap,
  code_writer: Code,
  test_writer: FlaskConical,
  pr_agent: GitPullRequest,
};

const agentNames: Record<string, string> = {
  code_reader: 'Code Reader',
  planner: 'Planner',
  code_writer: 'Code Writer',
  test_writer: 'Test Writer',
  pr_agent: 'PR Agent',
};

const agents = ['code_reader', 'planner', 'code_writer', 'test_writer', 'pr_agent'];

function Dashboard() {
  const router = useRouter();
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [issue, setIssue] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveProgress, setLiveProgress] = useState<Record<string, ProgressEvent[]>>({});
  const [currentAgent, setCurrentAgent] = useState<string>('');
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [githubToken, setGithubTokenValue] = useState('');
  const [githubTokenLabel, setGithubTokenLabel] = useState('');
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [tokenSaved, setTokenSaved] = useState(false);
  const progressEndRef = useRef<HTMLDivElement>(null);

  const { data, loading, refetch } = useQuery(GET_RUNS, {
    variables: { limit: 50, offset: 0 },
    pollInterval: 3000,
  });

  const { data: meData, refetch: refetchMe } = useQuery(ME);

  const tokens: GitHubToken[] = meData?.me?.githubTokens || [];
  const activeTokenId: string | null = meData?.me?.activeGithubTokenId || null;

  const { data: detailsData } = useQuery(GET_RUN_DETAILS, {
    variables: { id: selectedRun?.id },
    skip: !selectedRun,
    pollInterval: selectedRun?.status === 'RUNNING' ? 2000 : 0,
  });

  const { data: progressData } = useSubscription(AGENT_PROGRESS, {
    variables: { runId: selectedRun?.id },
    skip: !selectedRun?.id,
  });

  const [startRun, { loading: starting }] = useMutation(START_RUN, {
    onCompleted: (data) => {
      setShowForm(false);
      setIssue('');
      setRepoUrl('');
      refetch();
      setSelectedRun({
        ...data.startRun,
        logs: [],
        createdAt: data.startRun.createdAt,
        updatedAt: data.startRun.createdAt,
      });
      setLiveProgress({});
      setCurrentAgent('');
    },
  });

  const [addGithubToken, { loading: savingToken }] = useMutation(ADD_GITHUB_TOKEN, {
    onCompleted: () => {
      setTokenSaved(true);
      setGithubTokenValue('');
      setGithubTokenLabel('');
      setEditingTokenId(null);
      refetchMe();
      setTimeout(() => setTokenSaved(false), 2500);
    },
  });

  const [updateGithubToken, { loading: updatingToken }] = useMutation(UPDATE_GITHUB_TOKEN, {
    onCompleted: () => {
      setTokenSaved(true);
      setGithubTokenValue('');
      setGithubTokenLabel('');
      setEditingTokenId(null);
      refetchMe();
      setTimeout(() => setTokenSaved(false), 2500);
    },
  });

  const [deleteGithubToken] = useMutation(DELETE_GITHUB_TOKEN, {
    onCompleted: () => {
      setEditingTokenId(null);
      setGithubTokenValue('');
      setGithubTokenLabel('');
      setTokenSaved(false);
      refetchMe();
    },
  });

  const [setActiveGithubToken] = useMutation(SET_ACTIVE_GITHUB_TOKEN, {
    onCompleted: () => {
      refetchMe();
    },
  });

  const [logout] = useMutation(LOGOUT, {
    onCompleted: () => {
      clearAuthToken();
      window.location.href = '/login';
    },
  });

  const openTokenForm = () => {
    setEditingTokenId(null);
    setGithubTokenLabel('');
    setGithubTokenValue('');
    setTokenSaved(false);
    setShowTokenForm(true);
  };

  const closeTokenForm = () => {
    setShowTokenForm(false);
    setEditingTokenId(null);
    setGithubTokenLabel('');
    setGithubTokenValue('');
    setTokenSaved(false);
  };

  useEffect(() => {
    if (progressData?.agentProgress) {
      const event = progressData.agentProgress as ProgressEvent;
      
      if (event.eventType === 'started') {
        setCurrentAgent(event.agentName);
        setLiveProgress(prev => ({
          ...prev,
          [event.agentName]: [],
        }));
      } else if (event.eventType === 'thinking' || event.eventType === 'writing') {
        setLiveProgress(prev => ({
          ...prev,
          [event.agentName]: [...(prev[event.agentName] || []), event],
        }));
      } else if (event.eventType === 'completed') {
        if (currentAgent && currentAgent !== event.agentName) {
          setCurrentAgent(event.agentName);
        }
      }
    }
  }, [progressData, currentAgent]);

  useEffect(() => {
    if (progressEndRef.current) {
      progressEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveProgress]);

  const runs: Run[] = data?.getRuns || [];
  const selectedRunDetails = detailsData?.getRunDetails;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim() || !repoUrl.trim()) return;
    startRun({ variables: { issue: issue.trim(), repoUrl: repoUrl.trim() } });
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim() || !githubTokenLabel.trim()) return;
    if (editingTokenId) {
      updateGithubToken({
        variables: {
          id: editingTokenId,
          token: githubToken.trim(),
          label: githubTokenLabel.trim(),
        },
      });
      return;
    }

    addGithubToken({
      variables: {
        token: githubToken.trim(),
        label: githubTokenLabel.trim(),
      },
    });
  };

  const handleTokenEdit = (token: GitHubToken) => {
    setEditingTokenId(token.id);
    setGithubTokenLabel(token.label);
    setGithubTokenValue('');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAgentCompleted = (agentName: string): boolean => {
    const agentIndex = agents.indexOf(agentName);
    const currentIndex = agents.indexOf(currentAgent);
    return agentIndex < currentIndex;
  };

  const isAgentRunning = (agentName: string): boolean => {
    return agentName === currentAgent;
  };

  return (
    <div className="min-h-screen p-6 md:p-8 bg-background dashboard-aurora selection:bg-primary/30">
      <div className="max-w-7xl mx-auto">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12"
        >
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <h1 className="relative text-4xl font-bold tracking-tight flex items-center gap-4">
              <div className="p-3 bg-primary/15 rounded-2xl border border-primary/20 backdrop-blur-xl">
                <Zap className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <span className="animate-text-gradient bg-clip-text">Agent Github</span>
            </h1>
            <p className="text-text-muted mt-2 font-light tracking-wide pl-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              Autonomous Multi-Agent System Control
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-text font-semibold rounded-xl transition-all duration-300 hover:border-secondary/40 hover:text-secondary"
            >
              <UserRound className="w-5 h-5" />
              <span>Profile</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openTokenForm}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-text font-semibold rounded-xl transition-all duration-300 hover:border-primary/40 hover:text-primary"
            >
              <KeyRound className="w-5 h-5" />
              <span>GitHub Token</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-background font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full hover:translate-y-0 transition-transform duration-300" />
              <Plus className="relative w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <span className="relative">New Orchestration Run</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => logout()}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-text-muted font-semibold rounded-xl transition-all duration-300 hover:text-error hover:border-error/40"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </motion.button>
          </div>
        </motion.header>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Active & Past Runs
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">{runs.length} Runs</span>
            </div>
            
            <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-3 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {loading && runs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 glass rounded-2xl">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-text-muted font-light animate-pulse">Initializing data stream...</p>
                  </div>
                ) : runs.length === 0 ? (
                  <div className="text-center py-20 glass rounded-2xl border-dashed">
                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-15" />
                    <p className="text-text-muted font-light px-6">No execution runs found in the system cluster</p>
                  </div>
                ) : (
                  runs.map((run, i) => (
                    <motion.button
                      key={run.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        setSelectedRun(run);
                        setLiveProgress({});
                        setCurrentAgent('');
                      }}
                      className={clsx(
                        "w-full text-left p-5 rounded-2xl border transition-all duration-300 card-3d group relative overflow-hidden",
                        selectedRun?.id === run.id
                          ? "bg-primary/10 border-primary/30 shadow-2xl shadow-primary/10"
                          : "glass border-border hover:border-primary/20 hover:bg-white/[0.05]"
                      )}
                    >
                      {selectedRun?.id === run.id && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                      )}
                      
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors truncate">{run.issue}</p>
                          <div className="text-xs text-text-muted truncate mt-2.5 flex items-center gap-2 font-light">
                            <div className="p-1 bg-white/10 rounded-md">
                              <Github className="w-3 h-3" />
                            </div>
                            <span className="truncate">{run.repoUrl.replace('https://github.com/', '')}</span>
                          </div>
                        </div>
                        <StatusBadge status={run.status} />
                      </div>
                      <div className="flex items-center justify-between mt-4 relative z-10">
                        <div className="flex items-center gap-2">
                           <Clock className="w-3 h-3 text-text-muted/50" />
                           <p className="text-[10px] font-medium text-text-muted/70 uppercase tracking-widest">{formatDate(run.createdAt)}</p>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-primary/20 transition-colors" />
                      </div>
                    </motion.button>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 h-full"
          >
            {selectedRun ? (
              <RunDetails 
                run={selectedRunDetails || selectedRun}
                liveProgress={liveProgress}
                currentAgent={currentAgent}
                progressEndRef={progressEndRef}
                isAgentRunning={isAgentRunning}
                isAgentCompleted={isAgentCompleted}
                onRefresh={() => refetch()}
              />
            ) : (
              <div className="glass border border-white/5 rounded-3xl h-full min-h-[500px] flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
                <div className="text-center relative z-10 px-12">
                  <div className="w-24 h-24 bg-white/[0.03] rounded-3xl border border-white/10 flex items-center justify-center mx-auto mb-8 card-3d">
                    <Terminal className="w-10 h-10 text-primary opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">System Initialized</h3>
                  <p className="text-text-muted font-light max-w-xs mx-auto leading-relaxed">
                    Select a process from the cluster registry to monitor active real-time telemetry and logs.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>


        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
              >
                <h3 className="text-xl font-semibold mb-4">Start New Run</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-textMuted mb-1.5">GitHub Issue</label>
                    <textarea
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="Describe the issue to fix..."
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg resize-none focus:outline-none focus:border-primary/50 transition-colors"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-textMuted mb-1.5">Repository URL</label>
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-surfaceHover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={starting || !issue.trim() || !repoUrl.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-background font-medium rounded-lg transition-all"
                    >
                      {starting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Start Run
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showTokenForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={closeTokenForm}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
              >
                <h3 className="text-xl font-semibold mb-2">GitHub Token Vault</h3>
                <p className="text-sm text-text-muted mb-5">
                  Store up to three tokens. Choose which token is active for runs.
                </p>
                <div className="space-y-3 mb-6">
                  {tokens.length === 0 ? (
                    <div className="text-sm text-text-muted bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      No tokens saved yet.
                    </div>
                  ) : (
                    tokens.map((token) => (
                      <div
                        key={token.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white/90">{token.label}</p>
                          <p className="text-xs text-text-muted">•••• {token.lastFour}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveGithubToken({ variables: { id: token.id } })}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                              activeTokenId === token.id
                                ? 'border-primary/40 text-primary bg-primary/10'
                                : 'border-white/10 text-text-muted hover:text-primary hover:border-primary/30'
                            )}
                          >
                            {activeTokenId === token.id ? 'Active' : 'Set Active'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTokenEdit(token)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-text-muted hover:text-white"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGithubToken({ variables: { id: token.id } })}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-300 hover:text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleTokenSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-textMuted mb-1.5">Token label</label>
                    <input
                      type="text"
                      value={githubTokenLabel}
                      onChange={(e) => setGithubTokenLabel(e.target.value)}
                      placeholder="Personal, Work, Client, etc."
                      className="w-full px-4 py-3 bg-black/80 text-white border border-border rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-textMuted mb-1.5">Personal Access Token</label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubTokenValue(e.target.value)}
                      placeholder="ghp_************************"
                      className="w-full px-4 py-3 bg-black/80 text-white border border-border rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  {tokenSaved && (
                    <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
                      Token saved successfully.
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeTokenForm}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-surfaceHover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        savingToken ||
                        updatingToken ||
                        !githubToken.trim() ||
                        !githubTokenLabel.trim() ||
                        (!editingTokenId && tokens.length >= 3)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-background font-medium rounded-lg transition-all"
                    >
                      {savingToken || updatingToken ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {editingTokenId ? 'Updating...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          {editingTokenId ? 'Update Token' : 'Save Token'}
                        </>
                      )}
                    </button>
                  </div>
                  {!editingTokenId && tokens.length >= 3 && (
                    <p className="text-xs text-warning">
                      You have reached the maximum of 3 tokens. Delete one to add another.
                    </p>
                  )}
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={clsx(
      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500 shadow-sm",
      status === 'RUNNING' ? "bg-secondary/10 text-secondary border-secondary/20 shadow-secondary/5" :
      status === 'COMPLETED' ? "bg-primary/10 text-primary border-primary/20 shadow-primary/5" :
      status === 'FAILED' ? "bg-error/10 text-error border-error/20 shadow-error/5" :
      "bg-white/5 text-text-muted border-white/5"
    )}>
      {status === 'RUNNING' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {status}
    </div>
  );
}


function AgentProgressStepper({ 
  currentAgent, 
  isAgentRunning, 
  isAgentCompleted 
}: { 
  currentAgent: string;
  isAgentRunning: (name: string) => boolean;
  isAgentCompleted: (name: string) => boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-10 overflow-x-auto pb-4 custom-scrollbar">
      {agents.map((agent, index) => {
        const Icon = agentIcons[agent];
        const running = isAgentRunning(agent);
        const completed = isAgentCompleted(agent);
        
        return (
          <div key={agent} className="flex items-center group/step">
            <div className="flex flex-col items-center min-w-[80px]">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative overflow-hidden",
                  completed ? "bg-primary/20 text-primary border border-primary/30" :
                  running ? "bg-secondary/20 text-secondary border border-secondary/30 pulse-glow" :
                  "glass text-text-muted/50 border-white/5"
                )}
              >
                <div className={clsx(
                  "absolute inset-0 opacity-0 group-hover/step:opacity-100 transition-opacity duration-300",
                  completed ? "bg-primary/10" : "bg-white/5"
                )} />
                <Icon className={clsx("w-6 h-6 relative z-10 transition-transform duration-500", running && "scale-110")} />
              </motion.div>
              <span className={clsx(
                "text-[10px] mt-3 font-bold uppercase tracking-widest transition-colors duration-300",
                running ? "text-secondary" : 
                completed ? "text-primary" : 
                "text-text-muted/40"
              )}>
                {agentNames[agent]}
              </span>
            </div>
            {index < agents.length - 1 && (
              <div className="relative w-12 h-[1px] mx-2 -mt-7">
                <div className="absolute inset-0 bg-white/5" />
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: completed ? 1 : 0 }}
                  className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary origin-left transition-transform duration-700" 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RunDetails({ 
  run, 
  liveProgress, 
  currentAgent,
  progressEndRef,
  isAgentRunning,
  isAgentCompleted,
  onRefresh 
}: { 
  run: Run;
  liveProgress: Record<string, ProgressEvent[]>;
  currentAgent: string;
  progressEndRef: React.RefObject<HTMLDivElement>;
  isAgentRunning: (name: string) => boolean;
  isAgentCompleted: (name: string) => boolean;
  onRefresh: () => void;
}) {
  const logEndRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const currentAgentProgress = currentAgent ? (liveProgress[currentAgent] || []) : [];
  const liveEvents = useMemo(() => {
    return Object.values(liveProgress)
      .flat()
      .filter((event) => event?.content)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [liveProgress]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveEvents]);

  return (
    <div className="glass border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
      
      <div className="p-8 border-b border-white/5 relative z-10">
        <AgentProgressStepper 
          currentAgent={currentAgent}
          isAgentRunning={isAgentRunning}
          isAgentCompleted={isAgentCompleted}
        />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4">
              <StatusBadge status={run.status} />
              <div className="flex items-center gap-2 text-[10px] font-medium text-text-muted uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {formatDate(run.createdAt)}
              </div>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-white/90 leading-tight">{run.issue}</h3>
            <div className="text-sm text-text-muted flex items-center gap-2 font-light">
              <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
                <Github className="w-4 h-4" />
              </div>
              <span className="opacity-80 break-all">{run.repoUrl}</span>
            </div>
          </div>
          {run.prUrl && (
            <motion.a
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              href={run.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-3 bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 rounded-2xl transition-all text-sm font-semibold shadow-xl shadow-primary/5 whitespace-nowrap"
            >
              <GitPullRequest className="w-5 h-5" />
              Analyze Pull Request
              <ExternalLink className="w-4 h-4 ml-1 opacity-50" />
            </motion.a>
          )}
        </div>
        {run.error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4"
          >
            <div className="p-2 bg-red-500/20 rounded-xl">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-red-400 font-bold uppercase tracking-widest">Execution Failure</p>
              <p className="text-sm text-red-200/70 mt-1.5 font-light leading-relaxed">{run.error}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-sm font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            Telemetry Analytics
          </h4>
          {run.status === 'RUNNING' && (
            <div className="flex items-center gap-3 px-4 py-1.5 bg-secondary/5 border border-secondary/10 rounded-full">
              <span className="w-2 h-2 bg-secondary rounded-full animate-ping" />
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Live Stream Active</span>
            </div>
          )}
        </div>
        
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
          {currentAgentProgress.length > 0 ? (
            <div className="space-y-4">
              {currentAgentProgress.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={clsx(
                    "p-5 rounded-2xl border font-mono text-sm shadow-sm transition-all duration-300",
                    event.eventType === 'thinking' 
                      ? "bg-secondary/5 border-secondary/20 text-secondary-200" 
                      : "bg-white/[0.02] border-white/5 text-white/80"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={clsx(
                      "w-1.5 h-1.5 rounded-full",
                      event.eventType === 'thinking' ? "bg-secondary animate-pulse" : "bg-white/20"
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                      {event.eventType === 'thinking' ? 'Core Reasoning' : 'Agent Output'}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed opacity-90">{event.content}</p>
                </motion.div>
              ))}
              <div ref={progressEndRef} />
            </div>
          ) : run.logs && run.logs.length > 0 ? (
            <div className="space-y-4">
              {run.logs.map((log, i) => (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex gap-5 p-5 bg-white/[0.01] rounded-2xl border border-white/5 hover:bg-white/[0.03] transition-colors group/log"
                >
                  <div className="w-24 flex-shrink-0">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest px-2 py-1 bg-primary/10 rounded-md border border-primary/20">{log.agentName}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light text-white/70 leading-relaxed group-hover/log:text-white transition-colors">{log.message}</p>
                    <div className="flex items-center gap-2 mt-3 opacity-30">
                      <Clock className="w-3 h-3" />
                      <p className="text-[10px] font-medium uppercase tracking-widest">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-10 glass rounded-3xl border-dashed">
              <div className="text-center px-6">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Loader2 className={clsx("w-8 h-8 text-white/20", run.status === 'RUNNING' && "animate-spin text-primary/40")} />
                </div>
                <p className="text-text-muted font-light tracking-wide">
                  {run.status === 'RUNNING' ? 'Orchestrating agents...' : 'No telemetry data available for this run'}
                </p>
              </div>
              <div className="mt-8 grid gap-3 px-6">
                {[
                  'Code Reader scanning repository',
                  'Planner composing strategy',
                  'Code Writer drafting patch',
                  'Test Writer generating checks',
                  'PR Agent preparing update',
                ].map((label, index) => (
                  <div
                    key={label}
                    className="telemetry-step flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className="telemetry-dot" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/60">
                        Stage {index + 1}
                      </p>
                      <p className="text-sm text-white/80 mt-1">{label}</p>
                    </div>
                    <div className="telemetry-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-black/30 p-6 shadow-inner">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-[0.3em] text-text-muted">Live Log Stream</h5>
            {run.status === 'RUNNING' && (
              <span className="text-[10px] uppercase tracking-widest text-secondary">Streaming</span>
            )}
          </div>
          <div className="mt-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar font-mono text-xs">
            {liveEvents.length > 0 ? (
              <div className="space-y-3">
                {liveEvents.map((event, index) => (
                  <div key={`${event.agentName}-${event.timestamp}-${index}`} className="flex gap-3">
                    <span className="text-secondary/70">[{event.agentName}]</span>
                    <span className={clsx(
                      "text-white/70",
                      event.eventType === 'thinking' && "text-secondary/80",
                      event.eventType === 'writing' && "text-primary/80"
                    )}>
                      {event.content}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            ) : (
              <div className="text-text-muted/70">No live events yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
