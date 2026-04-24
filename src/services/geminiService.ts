
export async function getMediaRecommendations(watchlist: string[]) {
  try {
    const response = await fetch('/api/ai/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlist })
    });
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    return await response.json();
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return [];
  }
}

export async function getDiscoverPicks() {
  try {
    const response = await fetch('/api/ai/discover');
    if (!response.ok) throw new Error('Failed to fetch discover picks');
    return await response.json();
  } catch (error) {
    console.error("Error getting discover picks:", error);
    return [];
  }
}
