import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 py-10">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-4xl uppercase tracking-tighter text-white mb-2">Access Granted</h1>
        <p className="text-muted text-sm">Enter your credentials to continue.</p>
      </div>

      <div className="bg-surface border border-border shadow-2xl rounded-[32px] p-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-2/20 blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/20 blur-[100px] pointer-events-none"></div>

        {error && (
          <div className="flex items-center gap-3 bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl mb-6 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reaper@hub.com"
                className="w-full bg-[#0e1430] border border-border rounded-2xl p-4 pl-12 text-text focus:outline-none focus:border-primary transition-all shadow-inner"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Password</label>
              <button 
                type="button"
                className="text-[10px] font-bold text-primary hover:text-primary-2 transition-colors uppercase"
                onClick={() => alert('Password recovery system coming soon.')}
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0e1430] border border-border rounded-2xl p-4 pl-12 text-text focus:outline-none focus:border-primary transition-all shadow-inner"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl p-4 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 group overflow-hidden relative shadow-lg shadow-primary/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Synchronize
                <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border/50 pt-6">
          <p className="text-muted text-sm">
            Net new?{' '}
            <Link to="/signup" className="text-primary hover:text-primary-2 font-bold transition-colors">
              Request Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
