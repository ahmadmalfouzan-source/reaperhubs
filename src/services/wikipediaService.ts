export async function getGameBosses(gameTitle: string): Promise<string[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(gameTitle)}&format=json&origin=*`;

  try {
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.query.search.length) return [];

    // Get the first result's content
    const pageTitle = searchData.query.search[0].title;
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();
    const pages = contentData.query.pages;
    const pageId = Object.keys(pages)[0];
    const text = pages[pageId].extract;

    if (!text) return [];

    // Improved heuristic: look for "Bosses", "Enemies", or lists in sections
    const patterns = [
      /Bosses\n([\s\S]*?)\n\n/i,
      /Enemies\n([\s\S]*?)\n\n/i,
      /Characters\n([\s\S]*?)\n\n/i,
      /Protagonists\n([\s\S]*?)\n\n/i,
      /Antagonists\n([\s\S]*?)\n\n/i,
      /Key figures\n([\s\S]*?)\n\n/i,
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
          line.length > 3 && 
          line.length < 60 && 
          !line.includes('==') && 
          !line.toLowerCase().includes('further reading') &&
          !line.toLowerCase().includes('see also')
        );
      
      return [...new Set(candidates)].slice(0, 15);
    }

    return [];
  } catch (error) {
    console.error('Wikipedia Boss Error:', error);
    return [];
  }
}
