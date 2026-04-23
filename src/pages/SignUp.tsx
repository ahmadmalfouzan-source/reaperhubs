import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../lib/reaperhub/queries';
import { User, Mail, Lock, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (username.length < 3) return setError('Username must be at least 3 characters');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);

    try {
      const res = await signUp(email, password, username);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error || 'Failed to create account');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 py-10">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-4xl uppercase tracking-tighter text-white mb-2">Join the Collective</h1>
        <p className="text-muted text-sm">Initialize your reaper designation.</p>
      </div>

      <div className="bg-surface border border-border shadow-2xl rounded-[32px] p-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary-2/20 blur-[100px] pointer-events-none"></div>

        {error && (
          <div className="flex items-center gap-3 bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl mb-6 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="reaper_01"
                className="w-full bg-[#0e1430] border border-border rounded-2xl p-4 pl-12 text-text focus:outline-none focus:border-primary transition-all shadow-inner"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@reaperhub.com"
                className="w-full bg-[#0e1430] border border-border rounded-2xl p-4 pl-12 text-text focus:outline-none focus:border-primary transition-all shadow-inner"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Password</label>
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Confirm Password</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                Initialize Profile
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border/50 pt-6">
          <p className="text-muted text-sm">
            Already registered?{' '}
            <Link to="/login" className="text-primary hover:text-primary-2 font-bold transition-colors">
              Access Core
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
