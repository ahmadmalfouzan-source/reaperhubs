import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, Search, Library, Bell, Settings, User, LogOut, ChevronDown, Trophy } from 'lucide-react';
import { cn } from './lib/utils';
import { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { getUnreadNotificationCount } from './lib/reaperhub/queries';

import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import FeedPage from './pages/Feed';
import SearchPage from './pages/Search';
import LibraryPage from './pages/Library';
import NotificationsPage from './pages/Notifications';
import SettingsPage from './pages/Settings';
import ProfilePage from './pages/Profile';
import LeaderboardPage from './pages/Leaderboard';
import SignUpPage from './pages/SignUp';
import MediaDetailPage from './pages/MediaDetail';
import { Toaster } from 'sonner';

function Layout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUnreadCount = async () => {
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUnreadCount();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUnreadCount();
      } else {
        setProfile(null);
        setUnreadCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time notifications listener
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="border-b border-border bg-surface sticky top-0 z-50">
        <div className="max-w-[1180px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">RH</div>
            ReaperHub
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link 
              to="/feed" 
              className={cn("p-2 rounded-lg transition-colors flex items-center gap-2", isActive('/feed') ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-surface-2")}
            >
              <Compass className="w-5 h-5" />
              <span>Feed</span>
            </Link>
            <Link 
              to="/search" 
              className={cn("p-2 rounded-lg transition-colors flex items-center gap-2", isActive('/search') ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-surface-2")}
            >
              <Search className="w-5 h-5" />
              <span>Search</span>
            </Link>
            <Link 
              to="/leaderboard" 
              className={cn("p-2 rounded-lg transition-colors flex items-center gap-2", isActive('/leaderboard') ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-surface-2")}
            >
              <Trophy className="w-5 h-5" />
              <span>Hall of Fame</span>
            </Link>
            
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={cn("p-2 rounded-lg transition-colors", isActive('/dashboard') ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-surface-2")}
                >
                  <Home className="w-5 h-5" />
                </Link>
                <Link 
                  to="/library" 
                  className={cn("p-2 rounded-lg transition-colors", isActive('/library') ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-surface-2")}
                >
                  <Library className="w-5 h-5" />
                </Link>
                <Link 
                  to="/notifications" 
                  className={cn("p-2 rounded-lg transition-colors relative", isActive('/notifications') ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-surface-2")}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-surface">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                
                <div className="relative ml-2" ref={menuRef}>
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 p-1 pl-2 hover:bg-surface-2 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-surface-2 border border-border flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted" />
                  </button>
                  
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded shadow-xl overflow-hidden py-1 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-bold truncate">{profile?.display_name || profile?.username || user.email?.split('@')[0] || 'Agent'}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                      </div>
                      
                      <Link 
                        to={profile?.username ? `/profile/${profile.username}` : "/profile"} 
                        className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors text-sm"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                      
                      <Link 
                        to="/settings" 
                        className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors text-sm"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      
                      <div className="border-t border-border mt-1 pt-1">
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-danger/10 text-danger transition-colors text-sm w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="ml-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors">
                Sign In
              </Link>
            )}
          </nav>

          {/* Mobile Login Button (if logged out) */}
          {!user && (
            <div className="md:hidden">
              <Link to="/login" className="px-4 py-2 bg-primary hover:bg-primary/90 text-[10px] text-white font-bold rounded-xl transition-colors">
                Sign In
              </Link>
            </div>
          )}
          
          {/* Mobile Notification Bell (if logged in) */}
          {user && (
            <div className="md:hidden">
              <Link to="/notifications" className="p-2 text-muted hover:text-text rounded-lg relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-surface">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 max-w-[1180px] w-full mx-auto px-4 py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around items-center h-16 z-50 pb-safe">
        <Link 
          to="/" 
          className={cn("flex flex-col items-center p-2 w-full", isActive('/') || isActive('/dashboard') ? "text-primary" : "text-muted")}
        >
          <Home className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link 
          to="/search" 
          className={cn("flex flex-col items-center p-2 w-full", isActive('/search') ? "text-primary" : "text-muted")}
        >
          <Search className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">Search</span>
        </Link>
        {user && (
          <Link 
            to="/library" 
            className={cn("flex flex-col items-center p-2 w-full", isActive('/library') ? "text-primary" : "text-muted")}
          >
            <Library className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Library</span>
          </Link>
        )}
        <Link 
          to="/feed" 
          className={cn("flex flex-col items-center p-2 w-full", isActive('/feed') ? "text-primary" : "text-muted")}
        >
          <Compass className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">Feed</span>
        </Link>
        {user ? (
          <Link 
            to={profile?.username ? `/profile/${profile.username}` : '/profile'} 
            className={cn("flex flex-col items-center p-2 w-full", location.pathname.includes('/profile') ? "text-primary" : "text-muted")}
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        ) : (
          <Link 
            to="/login" 
            className={cn("flex flex-col items-center p-2 w-full", isActive('/login') ? "text-primary" : "text-muted")}
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Login</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/media/:type/:id" element={<MediaDetailPage />} />
          <Route path="/media/:id" element={<MediaDetailPage />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" theme="dark" closeButton richColors />
    </BrowserRouter>
  );
}
