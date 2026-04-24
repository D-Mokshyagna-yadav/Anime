const http = require('http');

function test(endpoint) {
  return new Promise((resolve) => {
    const url = `http://localhost:5000/api${endpoint}`;
    console.log(`\nTesting: ${url}`);
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('Status:', res.statusCode);
          if (json.data?.provider) {
            console.log('Provider:', json.data.provider);
            console.log('Embed URL:', json.data.embedUrl || json.data.embedUrlMal);
          } else if (json.data?.media?.length) {
            console.log('Latest anime count:', json.data.media.length);
          } else {
            console.log('Response:', JSON.stringify(json).substring(0, 200));
          }
        } catch (e) {
          console.log('Error parsing JSON:', e.message);
        }
        resolve();
      });
    }).on('error', e => {
      console.log('Error:', e.message);
      resolve();
    });
  });
}

(async () => {
  console.log('=== Testing All New Endpoints ===\n');

  // Test 1: Latest anime
  await test('/anime/latest');

  // Test 2: One Piece details
  await test('/anime/21');

  // Test 3: MegaPlay direct endpoint
  await test('/anime/megaplay/anilist/21/1?language=sub');

  // Test 4: Episodes with 2000 cap
  await test('/anime/one-piece/episodes?total=2000');

  console.log('\n✓ All endpoint tests complete!');
})();
