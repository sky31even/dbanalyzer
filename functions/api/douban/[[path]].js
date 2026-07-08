import { proxyDouban } from '../_proxyHelper.js';

export async function onRequest(context) {
  return proxyDouban(context.request, '/api/douban', 'https://www.douban.com');
}
