const http = require('http');

function test(endpoint, params = {}) {
  return new Promise((resolve) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `http://localhost:5000/api${endpoint}${queryString ? '?' + queryString : ''}`;
    console.log(`\nGET ${url}`);
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
  console.log('=== Testing MegaPlay + AnimePahe Fallback Chain ===\n');

  // Test 1: One Piece anime details
  console.log('TEST 1: Get One Piece anime details (ID: 21)');
  const animeRes = await test('/anime/21');
  if (animeRes?.data) {
    const anilistId = animeRes.data.id;
    const malId = animeRes.data.idMal;
    console.log(`✓ AniList ID: ${anilistId}`);
    console.log(`  MAL ID: ${malId}`);
    console.log(`  Episodes: ${animeRes.data.episodes}`);
    console.log(`  Status: ${animeRes.data.status}`);

    // Test 2: Stream endpoint with MegaPlay params
    console.log('\nTEST 2: Stream endpoint with MegaPlay parameters');
    const streamRes = await test('/anime/stream/one-piece-episode-1', {
      anilistId,
      episodeNum: 1,
      language: 'sub'
    });
    console.log(`✓ Provider: ${streamRes.data?.provider || 'unknown'}`);
    if (streamRes.data?.embedUrl) {
      console.log(`  Embed URL: ${streamRes.data.embedUrl}`);
      console.log(`  \u2713 MegaPlay is PRIMARY provider!`);
    }
    if (streamRes.data?.sources) {
      console.log(`  Sources available: ${streamRes.data.sources.length}`);
    }

    // Test 3: Episodes endpoint
    console.log('\nTEST 3: Episodes endpoint with total=1000');
    const epsRes = await test('/anime/one-piece/episodes', { total: 1000 });
    console.log(`✓ Episodes returned: ${epsRes.data?.episodes?.length || 0}`);
    if (epsRes.data?.episodes?.length > 0) {
      console.log(`  First: ${epsRes.data.episodes[0].number}`);
      console.log(`  Last: ${epsRes.data.episodes[epsRes.data.episodes.length - 1].number}`);
    }
  }
  
  console.log('\n✓ All tests completed!');
})();
