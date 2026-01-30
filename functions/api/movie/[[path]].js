export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Get the path after /api/movie
  const path = url.pathname.replace('/api/movie', '');
  const targetUrl = `https://movie.douban.com${path}${url.search}`;

  const init = {
    method: context.request.method,
    headers: {
      'Referer': 'https://movie.douban.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Pass through other headers if needed, but be careful with host headers
    },
  };

  try {
    const response = await fetch(targetUrl, init);
    // Create a new response to modify headers (CORS)
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  } catch (err) {
    return new Response('Proxy Error', { status: 500 });
  }
}
