import { isAllowedImageUrl, DOUBAN_UA } from '../_proxyHelper.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // SSRF protection: only allow Douban image domains
  if (!isAllowedImageUrl(targetUrl)) {
    return new Response('Forbidden domain', { status: 403 });
  }

  const init = {
    method: 'GET',
    headers: {
      Referer: 'https://www.douban.com',
      'User-Agent': DOUBAN_UA,
    },
  };

  try {
    const response = await fetch(targetUrl, init);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  } catch {
    return new Response('Proxy Error', { status: 500 });
  }
}
