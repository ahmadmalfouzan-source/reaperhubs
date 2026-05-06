export interface HLTBData {
  main: string;
  extra: string;
  completionist: string;
}

export async function getHLTBData(gameTitle: string): Promise<HLTBData | null> {
  // Call our internal Vercel serverless function to avoid CORS and unreliable proxies
  const url = `/api/hltb?q=${encodeURIComponent(gameTitle)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('HLTB Internal API Error:', error);
    return null;
  }
}
