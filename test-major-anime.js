const http = require('http');

function test(endpoint, params = {}) {
  return new Promise((resolve) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `http://localhost:5000/api${endpoint}${queryString ? '?' + queryString : ''}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    }).on('error', e => resolve({ error: e.message }));
  });
}

(async () => {
  console.log('=== Testing Major Anime with MegaPlay PRIMARY ===\n');

  const testAnime = [
    { id: 21, name: 'One Piece', expectedEps: 1000 },
    { id: 20, name: 'Naruto', expectedEps: 220 },
    { id: 16498, name: 'Attack on Titan', expectedEps: 80 },
    { id: 38000, name: 'Demon Slayer', expectedEps: 70 }
  ];

  for (const anime of testAnime) {
    console.log(`\n📺 ${anime.name} (ID: ${anime.id})`);
    
    // Get anime details
    const details = await test(`/anime/${anime.id}`);
    if (details.data) {
      console.log(`   Episodes: ${details.data.episodes || 'null'}`);
      console.log(`   Status: ${details.data.status}`);
      console.log(`   AniList ID: ${details.data.id}`);
      
      const anilistId = details.data.id;
      
      // Test stream endpoint with MegaPlay
      const stream = await test(`/anime/stream/${anime.name.toLowerCase()}-episode-1`, {
        anilistId,
        episodeNum: 1,
        language: 'sub'
      });
      
      if (stream.data?.provider === 'megaplay') {
        console.log(`   ✓ Provider: ${stream.data.provider} (PRIMARY)`);
        if (stream.data.embedUrl) {
          console.log(`   ✓ Embed: ${stream.data.embedUrl.substring(0, 50)}...`);
        }
      } else if (stream.data?.provider) {
        console.log(`   ⚠ Provider: ${stream.data.provider} (not MegaPlay)`);
      } else {
        console.log(`   ✗ Stream failed: ${stream.error || 'unknown error'}`);
      }
      
      // Test episodes endpoint
      const episodes = await test(`/anime/${details.data.slug}/episodes`, { 
        total: anime.expectedEps 
      });
      
      if (episodes.data?.episodes?.length > 0) {
        console.log(`   ✓ Episodes: ${episodes.data.episodes.length}/${anime.expectedEps}`);
      } else {
        console.log(`   ✗ Episodes failed`);
      }
    } else {
      console.log(`   ✗ Failed to fetch details`);
    }
  }
  
  console.log('\n✓ All major anime tested!\n');
})();
