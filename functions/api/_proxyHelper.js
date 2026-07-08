// Shared proxy helper for Douban API functions

const DOUBAN_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Allowed domains for image proxy (SSRF protection)
const ALLOWED_IMAGE_DOMAINS = [
  'doubanio.com',
  'douban.com',
  'img1.doubanio.com',
  'img2.doubanio.com',
  'img3.doubanio.com',
  'img9.doubanio.com',
];

/**
 * Validate that a URL points to an allowed domain (SSRF protection).
 * @param {string} targetUrl
 * @param {string[]} allowedDomains
 * @returns {boolean}
 */
export function isAllowedDomain(targetUrl, allowedDomains) {
  try {
    const urlObj = new URL(targetUrl);
    return allowedDomains.some((d) => urlObj.hostname.endsWith(d));
  } catch {
    return false;
  }
}

/**
 * Validate image proxy URL against allowed domains.
 * @param {string} targetUrl
 * @returns {boolean}
 */
export function isAllowedImageUrl(targetUrl) {
  return isAllowedDomain(targetUrl, ALLOWED_IMAGE_DOMAINS);
}

/**
 * Create a proxied response to a Douban sub-domain.
 * @param {Request} request - The incoming request
 * @param {string} apiPrefix - The API path prefix (e.g. '/api/movie')
 * @param {string} targetOrigin - The target origin (e.g. 'https://movie.douban.com')
 * @returns {Promise<Response>}
 */
export async function proxyDouban(request, apiPrefix, targetOrigin) {
  const url = new URL(request.url);
  const path = url.pathname.replace(apiPrefix, '');
  const targetUrl = `${targetOrigin}${path}${url.search}`;

  const init = {
    method: request.method,
    headers: {
      Referer: targetOrigin,
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

export { DOUBAN_UA, ALLOWED_IMAGE_DOMAINS };
