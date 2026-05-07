export async function getGameBosses(gameTitle: string): Promise<string[]> {
  // Try searching for characters specifically if it's a major game
  const queries = [
    `${gameTitle} characters`,
    `${gameTitle} bosses`,
    gameTitle
  ];

  for (const query of queries) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;

    try {
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      
      if (!searchData.query.search.length) continue;

      // Get the first result's content
      const pageTitle = searchData.query.search[0].title;
      const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
      
      const contentRes = await fetch(contentUrl);
      const contentData = await contentRes.json();
      const pages = contentData.query.pages;
      const pageId = Object.keys(pages)[0];
      const text = pages[pageId].extract;

      if (!text) continue;

      // Expanded patterns for bosses, characters, and antagonists
      const patterns = [
        /Bosses\n([\s\S]*?)\n\n/i,
        /Enemies\n([\s\S]*?)\n\n/i,
        /Characters\n([\s\S]*?)\n\n/i,
        /Main characters\n([\s\S]*?)\n\n/i,
        /Protagonists\n([\s\S]*?)\n\n/i,
        /Antagonists\n([\s\S]*?)\n\n/i,
        /Key figures\n([\s\S]*?)\n\n/i,
        /Major villains\n([\s\S]*?)\n\n/i,
        /Cast\n([\s\S]*?)\n\n/i
      ];
      
      let listText = "";
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          listText += match[1] + "\n";
        }
      }

      if (listText) {
        const candidates = listText
          .split('\n')
          .map(line => line.replace(/^\* /, '').trim())
          .filter(line => 
            line.length > 2 && 
            line.length < 60 && 
            !line.includes('==') && 
            !line.toLowerCase().includes('further reading') &&
            !line.toLowerCase().includes('see also') &&
            !line.toLowerCase().includes('main article')
          );
        
        const uniqueResults = [...new Set(candidates)].slice(0, 15);
        if (uniqueResults.length > 0) return uniqueResults;
      }
    } catch (error) {
      console.error('Wikipedia Scraper Error for query:', query, error);
    }
  }

  return [];
}
