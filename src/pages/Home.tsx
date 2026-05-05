import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="space-y-12 md:space-y-16">
      <section className="text-center py-12 md:py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 md:w-[500px] h-64 md:h-[500px] bg-primary/20 rounded-full blur-[60px] md:blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl mb-6 tracking-tight leading-tight">
          Track Your Media.<br />
          <span className="text-primary-2">Level Up Your Life.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 px-4">
          ReaperHub is the ultimate platform to log movies, games, and series. Earn XP, rank up, and share your journey with friends.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 px-6">
          <Link to="/login" className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors text-lg text-center">
            Start Tracking
          </Link>
          <Link to="/feed" className="px-8 py-4 bg-surface-2 hover:bg-surface-2/80 text-white font-bold rounded-xl transition-colors text-lg border border-border text-center">
            Explore Feed
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 sm:px-0">
        <div className="bg-surface rounded-[18px] p-[20px] border border-border transition-transform hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-xl font-bold mb-4">1</div>
          <h3 className="font-display font-bold text-xl mb-2">Track Everything</h3>
          <p className="text-muted text-sm sm:text-base">Log movies, TV series, and video games in one unified library. Never forget what you've watched or played.</p>
        </div>
        <div className="bg-surface rounded-[18px] p-[20px] border border-border transition-transform hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-xl bg-primary-2/20 text-primary-2 flex items-center justify-center text-xl font-bold mb-4">2</div>
          <h3 className="font-display font-bold text-xl mb-2">Level Up</h3>
          <p className="text-muted text-sm sm:text-base">Earn XP and coins for every interaction. Level up your profile and climb the ranks within the community.</p>
        </div>
        <div className="bg-surface rounded-[18px] p-[20px] border border-border transition-transform hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-xl bg-success/20 text-success flex items-center justify-center text-xl font-bold mb-4">3</div>
          <h3 className="font-display font-bold text-xl mb-2">Socialize</h3>
          <p className="text-muted text-sm sm:text-base">Follow friends, share your thoughts, and discover new media through the community feed.</p>
        </div>
      </section>
    </div>
  );
}
