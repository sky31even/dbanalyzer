import { proxyDouban } from '../_proxyHelper.js';

export async function onRequest(context) {
  return proxyDouban(context.request, '/api/music', 'https://music.douban.com');
}
