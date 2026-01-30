export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/douban', '');
  const targetUrl = `https://www.douban.com${path}${url.search}`;

  const init = {
    method: context.request.method,
    headers: {
      'Referer': 'https://www.douban.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  };

  try {
    const response = await fetch(targetUrl, init);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  } catch (err) {
    return new Response('Proxy Error', { status: 500 });
  }
}