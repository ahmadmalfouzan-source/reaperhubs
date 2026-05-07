export interface HLTBData {
  main: string;
  extra: string;
  completionist: string;
}

export async function getHLTBData(gameTitle: string): Promise<HLTBData | null> {
  console.log('Fetching HLTB data for:', gameTitle);
  // Call our internal Vercel serverless function to avoid CORS and unreliable proxies
  const url = `/api/hltb?q=${encodeURIComponent(gameTitle)}`;

  try {
    const response = await fetch(url);
    console.log('HLTB Response Status:', response.status);
    if (!response.ok) return null;
    const data = await response.json();
    console.log('HLTB Data Received:', data);
    return data;
  } catch (error) {
    console.error('HLTB Internal API Error:', error);
    return null;
  }
}
