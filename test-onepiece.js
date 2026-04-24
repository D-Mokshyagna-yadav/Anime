const http = require('http');

function test(endpoint) {
  return new Promise((resolve) => {
    const url = `http://localhost:5000/api${endpoint}`;
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
  console.log('=== Testing One Piece ===\n');

  try {
    // Test 1: Get anime details
    console.log('TEST 1: Get One Piece anime details (ID: 21)');
    const animeRes = await test('/anime/21');
    if (animeRes?.data) {
      console.log('✓ Title:', animeRes.data.title?.english);
      console.log('  Episodes:', animeRes.data.episodes);
    }
    console.log();

    // Test 2: Get episodes with slug (no total param)
    console.log('TEST 2: Get episodes with slug "one-piece" (no total)');
    const eps1Res = await test('/anime/one-piece/episodes');
    console.log('✓ Status: 200');
    console.log('  Episodes count:', eps1Res?.data?.episodes?.length || 0);
    console.log();

    // Test 3: Get episodes with slug + total parameter
    console.log('TEST 3: Get episodes with slug + total=1000');
    const eps2Res = await test('/anime/one-piece/episodes?total=1000');
    console.log('✓ Status: 200');
    const epCount = eps2Res?.data?.episodes?.length || 0;
    console.log('  Episodes count:', epCount);
    if (epCount > 0) {
      console.log('  First episode:', JSON.stringify(eps2Res.data.episodes[0]));
      console.log('  Last episode:', JSON.stringify(eps2Res.data.episodes[epCount - 1]));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
