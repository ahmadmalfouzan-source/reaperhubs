import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, Search, Library, Bell, Settings, User, LogOut, ChevronDown, Trophy, Award, Activity } from 'lucide-react';
import { cn } from './lib/utils';
import { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { getUnreadNotificationCount } from './lib/reaperhub/queries';
import { InstallPrompt } from './components/InstallPrompt';

import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import AchievementListener from './components/AchievementListener';
import ErrorBoundary from './components/ErrorBoundary';

const HomePage = lazy(() => import('./pages/Home'));
const LoginPage = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const FeedPage = lazy(() => import('./pages/Feed'));
const SearchPage = lazy(() => import('./pages/Search'));
const LibraryPage = lazy(() => import('./pages/Library'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard'));
const AchievementsPage = lazy(() => import('./pages/Achievements'));
const StatsPage = lazy(() => import('./pages/Stats'));
const SignUpPage = lazy(() => import('./pages/SignUp'));
const MediaDetailPage = lazy(() => import('./pages/MediaDetail'));

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
    <div className="min-h-screen flex flex-col font-sans bg-bg-base text-text-primary">
      <header className="border-b border-surface-2 bg-bg-elevated/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1180px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl text-accent-primary tracking-tighter uppercase">
            <div className="w-8 h-8 rounded bg-gradient-primary flex items-center justify-center text-white text-xs shadow-glow-primary">RH</div>
            ReaperHub
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/feed" 
              className={cn("px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest", isActive('/feed') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
            >
              <Compass size={18} />
              <span>Feed</span>
            </Link>
            <Link 
              to="/search" 
              className={cn("px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest", isActive('/search') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
            >
              <Search size={18} />
              <span>Search</span>
            </Link>
            <Link 
              to="/leaderboard" 
              className={cn("px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest", isActive('/leaderboard') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
            >
              <Trophy size={18} />
              <span>Hall of Fame</span>
            </Link>
            <Link 
              to="/achievements" 
              className={cn("px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest", isActive('/achievements') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
            >
              <Award size={18} />
              <span>Milestones</span>
            </Link>
            
            {user ? (
              <>
                <Link 
                  to="/stats" 
                  className={cn("px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest", isActive('/stats') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
                >
                  <Activity size={18} />
                  <span>Performance</span>
                </Link>
                <div className="w-px h-6 bg-surface-3 mx-2" />
                <Link 
                  to="/dashboard" 
                  className={cn("p-2 rounded-lg transition-all", isActive('/dashboard') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
                >
                  <Home size={20} />
                </Link>
                <Link 
                  to="/library" 
                  className={cn("p-2 rounded-lg transition-all", isActive('/library') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
                >
                  <Library size={20} />
                </Link>
                <Link 
                  to="/notifications" 
                  className={cn("p-2 rounded-lg transition-all relative", isActive('/notifications') ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-accent-secondary text-[8px] font-bold text-white flex items-center justify-center rounded-full border-2 border-bg-elevated shadow-glow-secondary">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                
                <div className="relative ml-2" ref={menuRef}>
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 p-1 pl-2 hover:bg-surface-2 rounded-lg transition-colors border border-transparent hover:border-surface-3"
                  >
                    <div className="w-8 h-8 rounded-md bg-surface-2 border border-surface-3 flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img loading="lazy" src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover"  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                      ) : (
                        <User size={16} className="text-accent-primary" />
                      )}
                    </div>
                    <ChevronDown size={14} className={cn("text-text-muted transition-transform", menuOpen && "rotate-180")} />
                  </button>
                  
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 card p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-4 py-3 border-b border-surface-3 mb-1">
                        <p className="text-xs font-bold truncate uppercase tracking-widest text-text-primary">{profile?.display_name || profile?.username || 'Operative'}</p>
                        <p className="text-[10px] text-text-muted truncate font-mono uppercase">{user.email}</p>
                      </div>
                      
                      <Link 
                        to={profile?.username ? `/profile/${profile.username}` : "/profile"} 
                        className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 rounded-md transition-colors text-xs font-bold uppercase tracking-wider"
                      >
                        <User size={14} />
                        Identity File
                      </Link>
                      
                      <Link 
                        to="/settings" 
                        className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 rounded-md transition-colors text-xs font-bold uppercase tracking-wider"
                      >
                        <Settings size={14} />
                        Comm Settings
                      </Link>
                      
                      <div className="border-t border-surface-3 mt-1 pt-1">
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-accent-danger/10 text-accent-danger rounded-md transition-colors text-xs font-bold uppercase tracking-wider w-full text-left"
                        >
                          <LogOut size={14} />
                          Terminate Session
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary ml-4 py-2 px-6 h-auto text-xs">
                Request Access
              </Link>
            )}
          </nav>

          {/* Mobile Login Button (if logged out) */}
          {!user && (
            <div className="md:hidden">
              <Link to="/login" className="btn btn-primary py-1.5 px-4 text-[10px]">
                Access
              </Link>
            </div>
          )}
          
          {/* Mobile Notification Bell (if logged in) */}
          {user && (
            <div className="md:hidden">
              <Link to="/notifications" className="p-2 text-text-muted hover:text-text-primary rounded-lg relative">
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-accent-secondary text-[8px] font-bold text-white flex items-center justify-center rounded-full border-2 border-bg-elevated">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 max-w-[1180px] w-full mx-auto px-4 py-8 pb-24 md:pb-8">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-elevated/95 backdrop-blur-lg border-t border-surface-3 flex justify-around items-center h-16 z-50 pb-safe shadow-5">
        <Link 
          to="/" 
          className={cn("flex flex-col items-center p-2 w-full transition-colors", isActive('/') || isActive('/dashboard') ? "text-accent-primary" : "text-text-muted")}
        >
          <Home size={22} className="mb-0.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
        </Link>
        <Link 
          to="/search" 
          className={cn("flex flex-col items-center p-2 w-full transition-colors", isActive('/search') ? "text-accent-primary" : "text-text-muted")}
        >
          <Search size={22} className="mb-0.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Search</span>
        </Link>
        {user && (
          <Link 
            to="/library" 
            className={cn("flex flex-col items-center p-2 w-full transition-colors", isActive('/library') ? "text-accent-primary" : "text-text-muted")}
          >
            <Library size={22} className="mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Intel</span>
          </Link>
        )}
        <Link 
          to="/feed" 
          className={cn("flex flex-col items-center p-2 w-full transition-colors", isActive('/feed') ? "text-accent-primary" : "text-text-muted")}
        >
          <Compass size={22} className="mb-0.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Feed</span>
        </Link>
        {user ? (
          <Link 
            to={profile?.username ? `/profile/${profile.username}` : '/profile'} 
            className={cn("flex flex-col items-center p-2 w-full transition-colors", location.pathname.includes('/profile') ? "text-accent-primary" : "text-text-muted")}
          >
            <User size={22} className="mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Dossier</span>
          </Link>
        ) : (
          <Link 
            to="/login" 
            className={cn("flex flex-col items-center p-2 w-full transition-colors", isActive('/login') ? "text-accent-primary" : "text-text-muted")}
          >
            <User size={22} className="mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Login</span>
          </Link>
        )}
      </div>
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-accent-primary" size={32} /></div>}>
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
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/media/:type/:id" element={<MediaDetailPage />} />
            <Route path="/media/:id" element={<MediaDetailPage />} />
          </Routes>
        </Suspense>
      </Layout>
      <Toaster 
        position="top-right" 
        theme="dark" 
        closeButton 
        richColors 
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            border: '1px solid var(--surface-3)',
            color: 'var(--text-primary)',
          },
        }}
      />
      <AchievementListener />
    </BrowserRouter>
  );
}
