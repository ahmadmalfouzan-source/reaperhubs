export interface HLTBData {
  main: string;
  extra: string;
  completionist: string;
}

export async function getHLTBData(gameTitle: string): Promise<HLTBData | null> {
  // Using a known community API/Proxy for HLTB
  const url = `https://hltb-proxy.vercel.app/api/search?q=${encodeURIComponent(gameTitle)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data && data.results && data.results.length > 0) {
      const bestMatch = data.results[0];
      return {
        main: bestMatch.comp_main ? `${bestMatch.comp_main}h` : '--',
        extra: bestMatch.comp_plus ? `${bestMatch.comp_plus}h` : '--',
        completionist: bestMatch.comp_100 ? `${bestMatch.comp_100}h` : '--'
      };
    }
    return null;
  } catch (error) {
    console.error('HLTB Fetch Error:', error);
    return null;
  }
}
