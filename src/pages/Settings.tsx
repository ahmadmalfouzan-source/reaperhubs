import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../lib/reaperhub/queries';
import { supabase } from '../lib/supabase';
import { User, Camera, LogOut, ShieldCheck, Mail, MapPin, Zap, Save, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Skeleton from '../components/Skeleton';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getCurrentUser().then(async u => {
      if (!u) {
        navigate('/login');
        return;
      }
      setUser(u);
      const { data } = await supabase.from('users').select('*').eq('id', u.id).single();
      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
      setLoading(false);
    });
  }, [navigate]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded. Save to finalize.");
    } catch (err: any) {
      toast.error('Error uploading avatar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      const updates = {
        username,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('users').update(updates).eq('id', user.id);
      if (error) throw error;
      
      setProfile({ ...profile, ...updates });
      toast.success('System configuration updated.');
    } catch (err: any) {
      toast.error('Error updating settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    window.location.reload();
  };

  const SettingsSkeleton = () => (
    <div className="max-w-xl mx-auto space-y-8">
      <Skeleton className="h-10 w-1/3 rounded-xl" />
      <div className="bg-surface border border-border rounded-[40px] p-10 space-y-10">
        <div className="flex flex-col items-center gap-4">
           <Skeleton className="w-24 h-24 rounded-full" />
           <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-6">
           <Skeleton className="h-12 w-full rounded-2xl" />
           <Skeleton className="h-12 w-full rounded-2xl" />
           <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );

  if (loading) return <SettingsSkeleton />;
  if (!profile) return (
    <div className="text-center py-20 text-muted">
      <p>Unable to load operative profile. Please try again later.</p>
      <button onClick={() => navigate('/login')} className="mt-4 px-6 py-2 bg-primary text-black font-bold rounded-xl">
        Return to Login
      </button>
    </div>
  );

  const hasChanges = username !== (profile?.username || '') || 
                     displayName !== (profile?.display_name || '') ||
                     bio !== (profile?.bio || '') || 
                     avatarUrl !== (profile?.avatar_url || '');

  return (
    <div className="max-w-xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="space-y-2">
        <h1 className="font-display font-bold text-4xl uppercase tracking-tighter text-white">Registry Tuning</h1>
        <p className="text-muted text-sm font-medium">Configure your operative parameters and field identifiers.</p>
      </div>

      <div className="bg-surface border-2 border-border/50 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none"></div>
        
        <div className="flex flex-col items-center mb-12">
          <div 
            className="relative w-32 h-32 rounded-[40px] bg-surface-2 border-2 border-primary/30 cursor-pointer group overflow-hidden shadow-2xl transition-all hover:border-primary"
            onClick={handleAvatarClick}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/30">
                <User size={50} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
              <Camera className="text-white" size={30} />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button 
            type="button"
            onClick={handleAvatarClick}
            className="mt-6 flex items-center gap-2 group"
          >
            <span className="text-[10px] font-bold text-muted group-hover:text-primary transition-colors uppercase tracking-[0.3em]">
              Update Visual Feed
            </span>
            <Sparkles size={12} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-[0.2em] ml-2">
                <Mail size={12} /> Communication Node
              </label>
              <div className="w-full bg-surface-2/50 border border-border/50 rounded-2xl p-4 text-muted/50 cursor-not-allowed flex items-center gap-3 italic">
                 {user.email}
                 <ShieldCheck size={14} className="text-success ml-auto" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-[0.2em] ml-2">
                <User size={12} /> System Identifier
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-2/30 border border-border/50 rounded-2xl p-4 text-white focus:outline-none focus:border-primary transition-all font-medium italic"
                placeholder="Agent code name"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-[0.2em] ml-2">
                <Zap size={12} /> Public Designation
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-surface-2/30 border border-border/50 rounded-2xl p-4 text-white focus:outline-none focus:border-primary transition-all font-medium italic"
                placeholder="Tactical display name"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-[0.2em] ml-2">
                <MapPin size={12} /> Tactical Intelligence (Bio)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface-2/30 border border-border/50 rounded-2xl p-4 text-white focus:outline-none focus:border-primary transition-all min-h-[120px] resize-none font-medium italic"
                placeholder="Brief mission objectives / background summary..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-border/30">
            <button
              type="submit"
              disabled={saving || !hasChanges || uploading}
              className="bg-primary hover:bg-primary/90 text-black font-bold rounded-2xl px-12 py-4 transition-all disabled:opacity-30 disabled:scale-100 flex items-center gap-3 shadow-2xl shadow-primary/20 group active:scale-95 transform overflow-hidden relative"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  <span>Finalize Config</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface/50 border border-danger/20 rounded-[40px] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
           <h2 className="font-display font-bold text-xl text-danger uppercase tracking-tight">Decommission Session</h2>
           <p className="text-sm text-muted italic">Terminate secure link and purge temporary local cache.</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-8 py-3 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          <LogOut size={16} />
          Terminal Exit
        </button>
      </div>
    </div>
  );
}
