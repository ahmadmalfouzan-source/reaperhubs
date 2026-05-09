import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { ScanlineOverlay } from '../components/Decorative';

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
        <h1 className="text-4xl uppercase tracking-tighter text-text-primary mb-2">Access Granted</h1>
        <p className="text-text-muted text-sm uppercase tracking-widest">Enter credentials to establish uplink.</p>
      </div>

      <div className="card p-8 relative overflow-hidden">
        <ScanlineOverlay className="opacity-50" />
        
        {/* Background glows using tokens */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent-secondary/10 blur-[100px] pointer-events-none" />

        {error && (
          <div className="flex items-center gap-3 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger p-4 rounded-xl mb-6 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <span className="font-medium uppercase tracking-wide">{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted ml-1">Identity Signature</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="OPERATIVE@REAPERHUB.COM"
                className="input pl-12 uppercase placeholder:text-text-disabled/30"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Security Key</label>
              <button 
                type="button"
                className="text-[10px] font-bold text-accent-primary hover:text-accent-tertiary transition-colors uppercase tracking-widest"
                onClick={() => alert('Password recovery system coming soon.')}
              >
                Reset Access?
              </button>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full group mt-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="relative z-10 flex items-center gap-2">
                  Establish Connection
                  <LogIn size={18} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-surface-3 pt-6 relative z-10">
          <p className="text-text-muted text-xs uppercase tracking-widest">
            Unregistered?{' '}
            <Link to="/signup" className="text-accent-primary hover:text-accent-tertiary font-bold transition-colors">
              Request Designation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
