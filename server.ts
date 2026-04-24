import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";

// Removed __dirname

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API. Omitting apiKey lets it use process.env.GEMINI_API_KEY automatically.
  // We use the optional chaining to provide a fallback if it's strictly required, 
  // but if the key is invalid we should still rely on the env.
  const ai = new GoogleGenAI({});

  // AI Recommendation Route
  app.post('/api/ai/recommendations', async (req, res) => {
    try {
      const { watchlist } = req.body;
      const prompt = `Based on the following user's media library: [${(watchlist || []).join(", ")}], suggest 4 new movies, series, or games. 
Focus on items that are popular or highly rated. Provide title, type (movie/series/game), primary genre, and a 1-sentence reasoning for the recommendation.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                genre: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["title", "type", "genre", "reason"],
            },
          },
        },
      });

      if (!result.text) return res.json([]);
      res.json(JSON.parse(result.text));
    } catch (error: any) {
      console.warn('AI Recommendation returning fallback due to error:', error.message);
      res.json([]);
    }
  });

  // AI Discover Route
  app.get('/api/ai/discover', async (_req, res) => {
    try {
      const prompt = `Suggest 6 trending or classic movies, series, and games for a "Discover" section. 
Mix different types and genres. Provide title, type (movie/series/game), primary genre, and a short catchy description.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                genre: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["title", "type", "genre", "description"],
            },
          },
        },
      });

      if (!result.text) return res.json(getFallbackDiscoverPicks());
      res.json(JSON.parse(result.text));
    } catch (error: any) {
      console.warn('AI Discover returning fallback due to error:', error.message);
      res.json(getFallbackDiscoverPicks());
    }
  });

  function getFallbackDiscoverPicks() {
    return [
      { title: "Inception", type: "movie", genre: "Sci-Fi", description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O." },
      { title: "Breaking Bad", type: "series", genre: "Drama", description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine." },
      { title: "The Witcher 3: Wild Hunt", type: "game", genre: "RPG", description: "As Geralt of Rivia, explore a massive open world, fight terrifying monsters, and make choices that change the world." },
      { title: "Spirited Away", type: "movie", genre: "Animation", description: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits." },
      { title: "Stranger Things", type: "series", genre: "Sci-Fi", description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl." },
      { title: "Elden Ring", type: "game", genre: "RPG", description: "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between." }
    ];
  }

  // RAWG Proxy
  app.get('/api/games*', async (req, res) => {
    try {
      const queryParams = new URLSearchParams(req.query as any);
      const apiKey = '4d04b89bb977405d831f7dd24b492dd7'; // User's RAWG key
      
      queryParams.set('key', apiKey);

      const rawgPath = req.path.replace('/api/games', '');
      const rawgUrl = `https://api.rawg.io/api/games${rawgPath}?${queryParams.toString()}`;
      
      const response = await fetch(rawgUrl);
      const data = await response.json();
      
      res.status(response.status).json(data);
    } catch (error) {
      console.error('RAWG Proxy Error:', error);
      res.status(500).json({ error: 'Failed to fetch from RAWG' });
    }
  });

  // TMDB Proxy (optional but good for consistency)
  app.get('/api/tmdb*', async (req, res) => {
    try {
      const queryParams = new URLSearchParams(req.query as any);
      const apiKey = 'e09c714c70283f7112fa2b6f7391a9db'; // Use the same key from client or move to env
      
      queryParams.set('api_key', apiKey);

      const tmdbPath = req.path.replace('/api/tmdb', '');
      const tmdbUrl = `https://api.themoviedb.org/3${tmdbPath}?${queryParams.toString()}`;
      
      const response = await fetch(tmdbUrl);
      const data = await response.json();
      
      res.status(response.status).json(data);
    } catch (error) {
      console.error('TMDB Proxy Error:', error);
      res.status(500).json({ error: 'Failed to fetch from TMDB' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
