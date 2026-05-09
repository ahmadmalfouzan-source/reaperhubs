import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updateProfile } from '../lib/reaperhub/queries';
import { supabase } from '../lib/supabase';
import { 
  User, Camera, LogOut, ShieldCheck, Mail, MapPin, 
  Zap, Save, Loader2, Sparkles, AlertCircle, Terminal
} from 'lucide-react';
import { toast } from '../lib/toastUtils';
import { MediaCardSkeleton } from '../components/Skeleton';
import ImageCropper from '../components/ImageCropper';
import { cn } from '../lib/utils';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coverToCrop, setCoverToCrop] = useState<string | null>(null);
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
        setCoverUrl(data.cover_url || '');
      }
      setLoading(false);
    });
  }, [navigate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Visual feed updated.", "Finalize config to save changes.");
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Protocol Failure: ${err.message || 'Unknown storage error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCoverToCrop(reader.result?.toString() || null));
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleCoverUpload = async (croppedImageBlob: Blob) => {
    try {
      setUploadingCover(true);
      setCoverToCrop(null);
      
      const fileName = `${Math.random().toString(36).substring(2)}.webp`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, croppedImageBlob, {
          upsert: true,
          contentType: 'image/webp',
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      setCoverUrl(publicUrl);
      toast.success("Cover field updated.", "Finalize config to save changes.");
    } catch (err: any) {
      console.error('Cover upload error:', err);
      toast.error(`Protocol Failure: ${err.message || 'Unknown storage error'}`);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      const res = await updateProfile({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      });

      if (!res.success) throw new Error(res.message);
      
      setProfile({ ...profile, display_name: displayName, bio, avatar_url: avatarUrl, cover_url: coverUrl });
      toast.success('System configuration updated.', 'Mission parameters synchronized.');
    } catch (err: any) {
      toast.error('Sync Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-10 px-4 py-12">
        <div className="space-y-4">
          <div className="h-10 w-48 bg-surface-2 animate-pulse rounded-lg" />
          <div className="h-4 w-64 bg-surface-2 animate-pulse rounded-lg" />
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="h-48 md:h-64 bg-surface-2 animate-pulse" />
          <div className="p-8 pt-24 space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-surface-2 animate-pulse rounded" />
                <div className="h-14 w-full bg-surface-2 animate-pulse rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return (
    <div className="max-w-md mx-auto text-center py-20 card p-10 mt-12 relative overflow-hidden">
      <TacticalGrid />
      <div className="relative z-10">
        <div className="p-4 bg-accent-danger/10 text-accent-danger rounded-full w-fit mx-auto mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-tight mb-2 italic text-text-primary">Registry Access Failure</h2>
        <p className="text-text-muted text-sm mb-8 italic">Unable to load operative profile. Connection unstable.</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary w-full">
          Re-authenticate
        </button>
      </div>
    </div>
  );

  const hasChanges = displayName !== (profile?.display_name || '') ||
                     bio !== (profile?.bio || '') || 
                     avatarUrl !== (profile?.avatar_url || '') || 
                     coverUrl !== (profile?.cover_url || '');

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <TacticalGrid />
      <ScanlineOverlay opacity={0.03} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-primary/10 rounded-full border border-accent-primary/20 text-[10px] font-bold text-accent-primary uppercase tracking-[0.2em] mb-2">
            <Terminal size={12} /> System Parameters
          </div>
          <h1 className="font-display font-bold text-4xl uppercase tracking-tighter text-text-primary italic">Registry Tuning</h1>
          <p className="text-text-muted text-sm font-medium italic">Configure your operative parameters and field identifiers.</p>
        </div>

        <div className="card p-0 overflow-hidden shadow-5">
          {/* Cover Image Upload Area */}
          <div className="relative group">
            <div className="h-48 md:h-64 bg-surface-2 relative overflow-hidden">
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt="Cover" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-muted/30 gap-2 relative">
                  <TacticalGrid />
                  <Sparkles size={48} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] relative z-10">No Cover Active</span>
                </div>
              )}
              
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] flex items-center justify-center cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleCoverSelect}
                  disabled={uploadingCover}
                />
                <div className="btn btn-secondary border-white/10 text-text-primary bg-bg-elevated/40 hover:bg-bg-elevated/60">
                  <Camera size={16} /> 
                  {uploadingCover ? 'Synchronizing...' : 'Update Cover Intel'}
                </div>
              </label>
            </div>
            
            {/* Avatar Upload Area */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-16">
              <div className="relative group/avatar">
                <div className="w-32 h-32 rounded-[40px] bg-bg-base border-4 border-bg-base overflow-hidden shadow-5 relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-all group-hover/avatar:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted/30 relative">
                      <TacticalGrid />
                      <User size={60} strokeWidth={1} className="relative z-10" />
                    </div>
                  )}
                  
                  <label className="absolute inset-0 bg-bg-base/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-[2px] flex items-center justify-center cursor-pointer">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                    <Camera className="text-text-primary" size={32} />
                  </label>
                </div>
                
                {uploading && (
                  <div className="absolute inset-0 bg-bg-base/70 rounded-[40px] flex items-center justify-center z-20">
                    <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 pt-24 space-y-10">
            <form onSubmit={handleUpdate} className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] ml-1">
                    <Mail size={12} className="text-accent-primary" /> Communication Node
                  </label>
                  <div className="input opacity-60 bg-surface-2 border-dashed flex items-center justify-between group cursor-not-allowed">
                     <span className="font-mono text-xs">{user.email}</span>
                     <ShieldCheck size={16} className="text-accent-success/50" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] ml-1">
                    <Zap size={12} className="text-accent-primary" /> Public Designation
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input font-medium italic"
                    placeholder="Tactical display name"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] ml-1">
                    <MapPin size={12} className="text-accent-primary" /> Tactical Intelligence (Bio)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="input min-h-[140px] resize-none font-medium italic"
                    placeholder="Brief mission objectives / background summary..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-surface-3">
                <button
                  type="submit"
                  disabled={saving || !hasChanges || uploading || uploadingCover}
                  className="btn btn-primary px-10"
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
        </div>

        <div className="card p-8 border-accent-danger/20 bg-accent-danger/5 flex flex-col md:flex-row items-center justify-between gap-6 group overflow-hidden relative shadow-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-danger/5 blur-[40px] pointer-events-none group-hover:bg-accent-danger/10 transition-all"></div>
          <div className="space-y-1 text-center md:text-left relative z-10">
             <h2 className="font-display font-bold text-xl text-accent-danger uppercase tracking-tight italic">Decommission Session</h2>
             <p className="text-sm text-text-muted font-medium italic">Terminate secure link and purge temporary local cache.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="btn btn-danger px-8 group relative z-10"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            Terminal Exit
          </button>
        </div>

        {coverToCrop && (
          <ImageCropper
            imageSrc={coverToCrop}
            onCropComplete={handleCoverUpload}
            onCancel={() => setCoverToCrop(null)}
            aspectRatio={3 / 1}
          />
        )}
      </div>
    </div>
  );
}
