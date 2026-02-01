import axios from 'axios';
import * as cheerio from 'cheerio';

const DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchUrl = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
};

const parseYear = (text) => {
  const match = text.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
};

// Extract rating from class name (e.g. "rating4-t" -> 4)
const parseRating = ($, el) => {
  // Try finding elements with rating classes
  const ratingEl = $(el).find('[class*="rating"], [class*="allstar"]');
  
  if (ratingEl.length > 0) {
    // Iterate through all matches to find a valid rating class
    for (let i = 0; i < ratingEl.length; i++) {
      const className = $(ratingEl[i]).attr('class') || '';
      
      // Match ratingN-t (e.g. rating4-t -> 4)
      const match1 = className.match(/rating(\d)-t/);
      if (match1) return parseInt(match1[1], 10);
      
      // Match allstarN (e.g. allstar40 -> 4)
      const match2 = className.match(/allstar(\d+)/);
      if (match2) return Math.floor(parseInt(match2[1], 10) / 10);
    }
  }

  // Fallback: search for span directly with regex check on class attribute
  // This helps when find('[class*="rating"]') misses some nested or dynamically loaded elements (though cheerio loads static HTML)
  // Or specific structure like <span class="rating5-t"></span> seen in curl
  const spans = $(el).find('span');
  for (let i = 0; i < spans.length; i++) {
      const cls = $(spans[i]).attr('class');
      if (cls) {
          const m = cls.match(/rating(\d)-t/);
          if (m) return parseInt(m[1], 10);
          const m2 = cls.match(/allstar(\d+)/);
          if (m2) return Math.floor(parseInt(m2[1], 10) / 10);
      }
  }

  return 0; // No rating
};

const fetchCategory = async (username, category, proxyPrefix, parseFn, onProgress) => {
  let start = 0;
  let hasMore = true;
  const items = [];
  const maxPages = 20; // Safety limit
  let pageCount = 0;
  let totalCount = 0;

  while (hasMore && pageCount < maxPages) {
    if (onProgress) {
        onProgress(category, pageCount + 1);
    }

    const url = `${proxyPrefix}/people/${username}/collect?start=${start}&sort=time&rating=all&filter=all&mode=grid`;
    const html = await fetchUrl(url);
    
    if (!html) break;

    const $ = cheerio.load(html);

    // Try to parse total count from the first page
    if (pageCount === 0) {
      const titleText = $('title').text();
      const match = titleText.match(/\((\d+)\)/);
      if (match) {
        totalCount = parseInt(match[1], 10);
      }
    }

    // Support both grid view (.item) and list view (.subject-item)
    const listItems = $('.item, .subject-item');

    if (listItems.length === 0) {
      hasMore = false;
      break;
    }

    listItems.each((_, el) => {
      const item = parseFn($, el);
      if (item) {
        items.push(item);
      }
    });

    const nextBtn = $('span.next a');
    if (nextBtn.length > 0) {
      start += 15;
      pageCount++;
      await sleep(DELAY_MS);
    } else {
      hasMore = false;
    }
  }

  // If totalCount was not found or 0, fallback to items.length (though items might be truncated)
  if (totalCount === 0) {
    totalCount = items.length;
  }

  return { items, totalCount };
};

const parseMovie = ($, el) => {
  // Grid: .title a; List: .info .title a (usually) or .info h2 a
  // Actually Movie List view structure: .item .info .title em (text)
  // But we are supporting .item (Grid) and .subject-item (List)
  
  // Grid (.item): .title a
  // List (.item? or .subject-item?): Movie usually supports grid. 
  // If list view: .info ul li.title a
  
  const title = $(el).find('.title a, .info .title a, .info h2 a').first().text().trim().split('/')[0].trim();
  const url = $(el).find('.title a, .info .title a, .info h2 a').first().attr('href');
  const intro = $(el).find('.intro, .bd p').first().text().trim(); // .intro (Grid), .bd p (List)
  const year = parseYear(intro);
  const cover = $(el).find('.pic img').attr('src');
  const rating = parseRating($, el);
  
  const isTV = /Season|季|集/.test(title) || /Season|季|集/.test(intro);
  
  return {
    title,
    url,
    year,
    cover,
    rating,
    type: isTV ? 'tv' : 'movie'
  };
};

const parseBook = ($, el) => {
  // Grid: .title a; List: .info h2 a
  const title = $(el).find('.title a, .info h2 a').first().text().trim().split('/')[0].trim();
  const url = $(el).find('.title a, .info h2 a').first().attr('href');
  
  // Grid: .pub? List: .pub
  const pub = $(el).find('.pub, .desc, .intro').first().text().trim();
  const year = parseYear(pub);
  const cover = $(el).find('.pic img').attr('src');
  const rating = parseRating($, el);
  
  return {
    title,
    url,
    year,
    cover,
    rating,
    type: 'book'
  };
};

const parseMusic = ($, el) => {
  const title = $(el).find('.title a, .info h2 a').first().text().trim().split('/')[0].trim();
  const url = $(el).find('.title a, .info h2 a').first().attr('href');
  const intro = $(el).find('.intro, .pub').first().text().trim();
  const year = parseYear(intro);
  const cover = $(el).find('.pic img').attr('src');
  const rating = parseRating($, el);
  
  return {
    title,
    url,
    year,
    cover,
    rating,
    type: 'music'
  };
};

const computeStats = (items, totalCount) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 0: 0 };
  items.forEach(item => {
    if (distribution[item.rating] !== undefined) {
      distribution[item.rating]++;
    } else {
      distribution[0]++;
    }
  });

  // Recent 10 items (assuming items are sorted by time descending as fetched)
  const recent = items.slice(0, 10).map(i => ({
    title: i.title,
    url: i.url,
    cover: i.cover,
    rating: i.rating
  }));

  return {
    total: totalCount || items.length, // Use parsed total if available
    distribution,
    recent
  };
};

const fetchUserProfile = async (username) => {
  const url = `/api/douban/people/${username}/`;
  const html = await fetchUrl(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  
  // Registration Date
  const text = $('body').text();
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})\s*加入/);
  const registrationDate = dateMatch ? dateMatch[1] : null;

  // Name
  const name = $('title').text().replace(' (豆瓣)', '').trim();

  // Avatar
  const avatar = $('.basic-info img').attr('src') || $('.pic img').attr('src');

  return { registrationDate, name, avatar };
};

export const fetchDoubanData = async (username, onProgress) => {
  const userProfile = await fetchUserProfile(username);
  const [moviesAndTV, books, music] = await Promise.all([
    fetchCategory(username, 'movie', '/api/movie', parseMovie, onProgress),
    fetchCategory(username, 'book', '/api/book', parseBook, onProgress),
    fetchCategory(username, 'music', '/api/music', parseMusic, onProgress)
  ]);

  const movies = moviesAndTV.items.filter(i => i.type === 'movie');
  const tvs = moviesAndTV.items.filter(i => i.type === 'tv');
  
  // Recalculate totals for split Movie/TV based on ratio in fetched items if exact split unknown
  // But wait, the total count from page title covers both Movie and TV usually for "Movie" category in Douban.
  // Actually Douban separates them in profile but the URL /collect mixes them? 
  // /people/xxx/collect usually is just movies/tv mixed. 
  // We can't easily get separate TOTAL counts without fetching all.
  // So for Movie vs TV total, we will approximate using the fetched ratio applied to the total count, 
  // OR just use fetched count if we fetched all.
  // Given we limit pages, let's use the fetched items count for Movie/TV separation stats to be safe,
  // or just use the raw items for stats.
  // Let's use fetched items for stats to be consistent with the charts.
  
  const movieStats = computeStats(movies, movies.length); // Using fetched length
  const tvStats = computeStats(tvs, tvs.length);
  const bookStats = computeStats(books.items, books.totalCount); // Book usually pure
  const musicStats = computeStats(music.items, music.totalCount); // Music usually pure

  // Aggregate by year
  const yearMap = new Map();

  const processItem = (item, type) => {
    if (!item.year || item.rating < 4) return;
    const y = item.year.toString();
    if (!yearMap.has(y)) {
      yearMap.set(y, { year: y, movie: 0, tv: 0, book: 0, music: 0 });
    }
    const entry = yearMap.get(y);
    // Add weighted score instead of just incrementing
    entry[type] += item.rating;
  };

  movies.forEach(i => processItem(i, 'movie'));
  tvs.forEach(i => processItem(i, 'tv'));
  books.items.forEach(i => processItem(i, 'book'));
  music.items.forEach(i => processItem(i, 'music'));

  const yearData = Array.from(yearMap.values()).sort((a, b) => parseInt(a.year) - parseInt(b.year));
  
  const allItems = [
    ...movies,
    ...tvs,
    ...books.items,
    ...music.items
  ].filter(i => i.rating >= 4);

  return {
    yearData,
    summary: {
      movie: { ...movieStats, label: '电影' },
      tv: { ...tvStats, label: '电视剧' },
      book: { ...bookStats, label: '图书' },
      music: { ...musicStats, label: '音乐' }
    },
    userProfile,
    allItems
  };
};
