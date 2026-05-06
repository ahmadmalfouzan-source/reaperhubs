export async function getGameBosses(gameTitle: string): Promise<string[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(gameTitle + " bosses")}&format=json&origin=*`;

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

    // Simple heuristic: look for a "Bosses" or "Enemies" section or lists
    // This is very approximate but works for many games
    const bossSection = text.match(/Bosses\n([\s\S]*?)\n\n/i) || text.match(/Enemies\n([\s\S]*?)\n\n/i);
    
    if (bossSection) {
      // Split by lines and clean up
      return bossSection[1]
        .split('\n')
        .map(line => line.replace(/^\* /, '').trim())
        .filter(line => line.length > 3 && line.length < 50)
        .slice(0, 15);
    }

    return [];
  } catch (error) {
    console.error('Wikipedia Boss Error:', error);
    return [];
  }
}
