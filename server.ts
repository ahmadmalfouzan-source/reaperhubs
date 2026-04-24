import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
    } catch (error) {
      console.error('AI Recommendation Error:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // AI Discover Route
  app.get('/api/ai/discover', async (req, res) => {
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

      if (!result.text) return res.json([]);
      res.json(JSON.parse(result.text));
    } catch (error) {
      console.error('AI Discover Error:', error);
      res.status(500).json({ error: 'Failed to generate discover picks' });
    }
  });

  // RAWG Proxy
  app.get('/api/games*', async (req, res) => {
    try {
      const queryParams = new URLSearchParams(req.query as any);
      const apiKey = '3502b8ce76e945a0bb7a2e9f7e660c6c'; // Public demo key
      
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
