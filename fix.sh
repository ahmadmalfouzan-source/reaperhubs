sed -i '425c\
               </button>\
            )}\
          </div>\
        </div>\
      </div>\
      \
      {/* Currently Watching / Playing Widget */}\
      {library.filter(item => item.status === "watching" || item.status === "in_progress").length > 0 && (\
        <div className="bg-surface border border-border/50 rounded-[32px] p-6 mb-8 shadow-xl">\
          <div className="flex justify-between items-center mb-4">\
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-tighter flex items-center gap-2">\
              <Play size={16} className="text-primary fill-current" />\
              Active Operations\
            </h3>\
            <span className="text-[10px] text-muted uppercase font-bold tracking-widest">In Progress</span>\
          </div>\
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">\
            {library.filter(item => item.status === "watching" || item.status === "in_progress").slice(0, 3).map(item => (\
              <div \
                key={item.id}\
                onClick={() => {\
                   const mediaType = item.media_type || item.media_items?.type || "movie";\
                   const mediaId = item.media_id || item.media_items?.tmdb_id || item.media_items?.rawg_id || item.id;\
                   navigate(`/media/${mediaType}/${mediaId}`);\
                }}\
                className="flex items-center gap-4 bg-surface-2/50 border border-border/30 rounded-2xl p-3 cursor-pointer hover:bg-surface-2 hover:border-primary/50 transition-all group"\
              >\
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">\
                  <img src={item.media_items?.cover_url || item.poster_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />\
                </div>\
                <div className="flex-1 min-w-0">\
                  <p className="text-[9px] text-primary uppercase font-bold tracking-widest mb-1">{item.media_type}</p>\
                  <p className="text-sm text-white font-bold truncate">{item.title}</p>\
                </div>\
              </div>\
            ))}\
          </div>\
        </div>\
      )}\
\
      {/* Tabs Navigation */}\
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-border/50">\
        {[\
          { id: "library", label: "Library", icon: <Library size={16} /> },\
          { id: "reviews", label: "Reviews", icon: <Star size={16} /> },\
          { id: "activity", label: "Activity Feed", icon: <Activity size={16} /> },\
          { id: "achievements", label: "Achievements", icon: <Award size={16} /> }\
        ].map(tab => (\
          <button\
            key={tab.id}' src/pages/Profile.tsx
