import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../lib/reaperhub/queries';
import { supabase } from '../lib/supabase';
import { User, Upload, Camera } from 'lucide-react';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
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
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
    });
  }, [navigate]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage('');
      
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

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setMessage('Avatar uploaded! Click "Save Changes" to apply it to your profile.');
    } catch (err: any) {
      setMessage('Error uploading avatar: ' + (err.error_description || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    
    try {
      const updates = {
        username,
        bio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('users').update(updates).eq('id', user.id);
      if (error) throw error;
      
      setProfile({ ...profile, ...updates });
      setMessage('Settings updated successfully.');
    } catch (err: any) {
      setMessage('Error updating settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    // Force reload to clear query cache / states
    window.location.reload();
  };

  if (!user || !profile) return <div className="text-center py-20 text-muted">Loading settings...</div>;

  const hasChanges = username !== profile.username || bio !== profile.bio || avatarUrl !== profile.avatar_url;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="font-display font-bold text-3xl">Settings</h1>

      <div className="bg-surface border border-border rounded-[18px] p-8 space-y-8">
        <div className="flex flex-col items-center">
          <div 
            className="relative w-24 h-24 rounded-full bg-surface-2 border-2 border-primary-2 cursor-pointer group overflow-hidden"
            onClick={handleAvatarClick}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary-2 transition-opacity group-hover:opacity-50">
                <User size={40} />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
            className="mt-3 text-xs font-bold text-primary hover:text-primary-2 transition-colors uppercase tracking-widest"
          >
            Change Profile Picture
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm text-muted mb-2 font-medium">Email (read-only)</label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full bg-[#0e1430] border border-border rounded-xl p-[14px] text-muted opacity-70 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-2 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0e1430] border border-border rounded-xl p-[14px] text-text focus:outline-none focus:border-primary transition-colors"
              placeholder="Your username"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-2 font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#0e1430] border border-border rounded-xl p-[14px] text-text focus:outline-none focus:border-primary transition-colors min-h-[100px] resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-sm ${message.includes('Error') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving || !hasChanges || uploading}
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-10 py-3 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface border border-border rounded-[18px] p-[20px] border-danger/30">
        <h2 className="font-bold text-danger mb-2">Danger Zone</h2>
        <p className="text-sm text-muted mb-4">Sign out of your account on this device.</p>
        <button
          onClick={handleSignOut}
          className="bg-danger/10 hover:bg-danger/20 text-danger font-bold rounded-xl px-6 py-2 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
