const http = require('http');

http.get('http://localhost:5000/api/anime/stream/one-piece-episode-1?anilistId=21&episodeNum=1&language=sub', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('\n=== Stream Endpoint Full Response ===\n');
    console.log('Provider:', json.data.provider);
    console.log('Embed URL:', json.data.embedUrl);
    console.log('Has iframeCode:', !!json.data.iframeCode);
    console.log('Sources:', json.data.sources?.length, 'available');
    console.log('\n✓ Stream ready for MegaPlay iframe embed!');
  });
}).on('error', e => console.log('Error:', e.message));
