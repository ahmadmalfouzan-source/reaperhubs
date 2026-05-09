import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../lib/reaperhub/queries';
import { User, Mail, Lock, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { ScanlineOverlay } from '../components/Decorative';

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
        <h1 className="text-4xl uppercase tracking-tighter text-text-primary mb-2">Join the Collective</h1>
        <p className="text-text-muted text-sm uppercase tracking-widest">Initialize your reaper designation.</p>
      </div>

      <div className="card p-8 relative overflow-hidden">
        <ScanlineOverlay className="opacity-50" />
        
        {/* Background glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent-secondary/10 blur-[100px] pointer-events-none" />

        {error && (
          <div className="flex items-center gap-3 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger p-4 rounded-xl mb-6 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <span className="font-medium uppercase tracking-wide">{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted ml-1">Callsign</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="REAPER_01"
                className="input pl-12 uppercase"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted ml-1">Uplink Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="AGENT@REAPERHUB.COM"
                className="input pl-12 uppercase"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted ml-1">Security Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-12"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted ml-1">Verify Key</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-12"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full group mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Initialize Profile
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-surface-3 pt-6 relative z-10">
          <p className="text-text-muted text-xs uppercase tracking-widest">
            Already registered?{' '}
            <Link to="/login" className="text-accent-primary hover:text-accent-tertiary font-bold transition-colors">
              Access Core
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
