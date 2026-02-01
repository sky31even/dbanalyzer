import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { Github } from 'lucide-react';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { fetchDoubanData } from './services/douban';

const CustomBar = (props) => {
  const { fill, x, y, width, height, payload, dataKey, hiddenSeries } = props;
  // Don't render if series is hidden
  if (hiddenSeries.includes(dataKey)) return null;

  const keys = ['movie', 'tv', 'book', 'music'];
  // Filter keys that have value > 0 for this year AND are not hidden
  const activeKeys = keys.filter(k => payload[k] > 0 && !hiddenSeries.includes(k));
  
  if (activeKeys.length === 0) return null;

  const index = activeKeys.indexOf(dataKey);
  if (index === -1) return null;
  const isBottom = index === 0;
  
  // Radius = width / 2 for full semi-circle
  const r = width / 2;

  // Path Generation for "Puzzle Fit" (Bottom covers Top visually):
  // Top Bar:
  //   Top: Rounded Convex (standard)
  //   Bottom: Rounded Concave (to fit the bar below)
  // Bottom Bar:
  //   Top: Rounded Convex (fits into bar above)
  //   Bottom: Rounded Convex (standard bottom)

  const d = [
    `M ${x},${y}`, // Start at top-left (before arc)
    `A ${r},${r} 0 0 1 ${x + width},${y}`, // Top Convex Arc (extends upward)
    `L ${x + width},${y + height - (isBottom ? r : 0)}`, // Right Line
  ];

  if (isBottom) {
    // Bottom is standard rounded (Convex)
    d.push(`A ${r},${r} 0 0 1 ${x},${y + height - r}`);
  } else {
    // Middle/Top bars have Concave Bottom to fit the bar below
    // Line to (x+w, y+height) is already covered by the logic above (if isBottom false, -0)
    // We want to curve UP. Sweep 0.
    d.push(`A ${r},${r} 0 0 0 ${x},${y + height}`);
  }

  d.push('Z'); // Close path

  return <path d={d.join(' ')} fill={fill} />;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-stone-100">
        <p className="font-bold text-stone-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name} : {entry.value} 🌟
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomCursor = (props) => {
  const { x, y, width, height } = props;
  return (
    <Rectangle
      fill="url(#cursor-gradient)"
      x={x}
      y={y}
      width={width}
      height={height}
      style={{ pointerEvents: 'none' }}
    />
  );
};

const CustomLegend = ({ hiddenSeries, toggleSeries }) => {
  const items = [
    { key: 'movie', label: '电影', color: '#2AA3F4' },
    { key: 'tv', label: '电视剧', color: '#7c3aed' },
    { key: 'book', label: '图书', color: '#2FA44F' },
    { key: 'music', label: '音乐', color: '#F6C28B' }
  ];

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {items.map(item => (
        <div 
          key={item.key} 
          className={`cursor-pointer transition-opacity relative ${hiddenSeries.includes(item.key) ? 'opacity-50 grayscale' : ''}`}
          onClick={() => toggleSeries(item.key)}
          style={{ paddingLeft: '18px', minHeight: '20px' }}
        >
          {/* Using Absolute Positioning for precise html2canvas rendering */}
          <div 
            style={{ 
              position: 'absolute',
              left: 0,
              top: '50%',
              marginTop: '-6px',
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: item.color 
            }} 
          />
          <span className="text-sm text-stone-600" style={{ lineHeight: '20px', display: 'inline-block' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const SummarySection = ({ title, data, color, bgColor, isSnapshotting }) => {
  if (!data) return null;
  
  // Calculate max value for distribution bar
  const maxCount = Math.max(...Object.values(data.distribution));

  const getVerb = (title) => {
    if (title === '图书') return '读过';
    if (title === '音乐') return '听过';
    return '看过';
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 py-8 border-t border-stone-100 last:border-0">
      {/* Left: Category Name */}
      <div className="w-full md:w-32 flex-shrink-0">
        <h3 className={`text-xl font-bold ${color}`}>{title}</h3>
      </div>

      {/* Middle: Stats */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
        <div className="text-stone-600">
          共计{getVerb(title)} <span className="font-bold text-stone-800">{data.total}</span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="text-sm text-stone-500 mb-1">评价分布</div>
          <div className="flex items-end h-24 gap-2">
            {[1, 2, 3, 4, 5].map(star => {
              const count = data.distribution[star] || 0;
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={star} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  <div className="text-xs text-stone-400 mb-0.5">{count > 0 ? count : ''}</div>
                  <div 
                    className="w-full rounded-t-sm transition-all duration-500 opacity-80 hover:opacity-100"
                    style={{ height: `${Math.max(height, 2)}%`, backgroundColor: bgColor }}
                  ></div>
                  <div className="text-xs text-stone-400">{star}★</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Recent Covers */}
      <div className="flex-1 overflow-hidden pb-2">
        <div className="text-sm text-stone-500 mb-3">最近标注</div>
        <div className="flex gap-4 flex-nowrap overflow-hidden">
          {data.recent.slice(0, 5).map((item, i) => (
            <div 
              key={i} 
              className={`flex-shrink-0 w-20 flex flex-col gap-1 group ${
                i === 3 ? 'hidden sm:flex' : 
                i === 4 ? 'hidden md:flex' : 
                'flex'
              }`} 
              title={item.title}
            >
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="w-20 h-28 bg-stone-100 rounded overflow-hidden shadow-sm group-hover:shadow-md transition-shadow relative">
                  {item.cover ? (
                    <img 
                      src={`/api/proxy/image?url=${encodeURIComponent(item.cover)}&t=${Date.now()}`}
                      alt={item.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center text-stone-300 text-xs">Load Failed</div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">No Cover</div>
                  )}
                  {item.rating > 0 && (
                    <div className="absolute top-1 right-1 bg-yellow-400 text-white text-[10px] px-1 rounded shadow">
                      {item.rating}★
                    </div>
                  )}
                </div>
                <div className="text-xs text-stone-600 w-full text-center leading-tight mt-1 px-1 group-hover:text-doubanBlue transition-colors break-words">
                  {item.title.length > 12 ? item.title.slice(0, 11) + '...' : item.title}
                </div>
              </a>
            </div>
          ))}
          {data.recent.length === 0 && <div className="text-stone-400 text-sm">暂无数据</div>}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [allHighRatedItems, setAllHighRatedItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [error, setError] = useState('');
  const [hiddenSeries, setHiddenSeries] = useState([]);

  const favoriteYears = useMemo(() => {
    if (!data || data.length === 0) return [];
    let maxCount = 0;
    data.forEach(item => {
      const count = (item.movie || 0) + (item.tv || 0) + (item.book || 0) + (item.music || 0);
      if (count > maxCount) {
        maxCount = count;
      }
    });
    
    if (maxCount === 0) return [];
    
    return data
      .filter(item => (item.movie || 0) + (item.tv || 0) + (item.book || 0) + (item.music || 0) === maxCount)
      .map(item => item.year);
  }, [data]);

  const favoriteCovers = useMemo(() => {
    if (!allHighRatedItems || allHighRatedItems.length === 0 || favoriteYears.length === 0) return [];
    
    // Filter items from favorite years and shuffle or pick 10
    const itemsFromFavYears = allHighRatedItems.filter(item => 
      item.year && favoriteYears.includes(item.year.toString())
    );
    
    return itemsFromFavYears.slice(0, 10);
  }, [allHighRatedItems, favoriteYears]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Find the first year that has any data
    const firstYearIndex = data.findIndex(d => (d.movie + d.tv + d.book + d.music) > 0);
    if (firstYearIndex === -1) return [];
    return data.slice(firstYearIndex);
  }, [data]);

  const headerOffset = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    
    // Check the first ~25% of the chart for tall bars
    const rangeToCheck = Math.ceil(chartData.length * 0.25);
    const earlyData = chartData.slice(0, rangeToCheck);
    
    // Find max value in this range
    const maxValInRange = Math.max(...earlyData.map(d => d.movie + d.tv + d.book + d.music));
    const totalMaxVal = Math.max(...chartData.map(d => d.movie + d.tv + d.book + d.music));
    
    // If the max value in the early range is more than 40% of the total height,
    // we should move the header up
    if (totalMaxVal > 0 && (maxValInRange / totalMaxVal) > 0.4) {
      return -100; // Move up by 100px
    }
    return 0;
  }, [chartData]);

  const toggleSeries = (dataKey) => {
    setHiddenSeries(prev => 
      prev.includes(dataKey) 
        ? prev.filter(k => k !== dataKey)
        : [...prev, dataKey]
    );
  };

  const handleSearch = async () => {
    if (!username) return;
    setLoading(true);
    setError('');
    setData(null);
    setSummary(null);
    setStatus('开始获取数据...');

    try {
      const result = await fetchDoubanData(username, (category, page) => {
        const catMap = {
          'movie': '影视',
          'book': '图书',
          'music': '音乐'
        };
        setStatus(`正在获取${catMap[category] || category}数据 (第${page}页)...`);
      });
      
      if (result.yearData.length === 0) {
        setError('未找到数据或用户不存在/设置了隐私权限');
      } else {
        setData(result.yearData);
        setAllHighRatedItems(result.allHighRatedItems || []);
        setSummary(result.summary);
        setUserProfile(result.userProfile);
      }
    } catch (err) {
      console.error(err);
      setError('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-doubanBg flex flex-col items-center py-20 px-4 font-sans relative">
      <div className="relative inline-block mb-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-wider">
          <span className="text-doubanBlue">艺</span>
          <span className="text-doubanBlue">术</span>
          <span className="text-doubanGreen">年</span>
          <span className="text-doubanPeach">轮</span>
        </h1>
      </div>
      
      <p className="text-stone-600 text-lg md:text-xl mb-12 text-center max-w-2xl leading-relaxed font-qiuHong">
        “用一生去发现自己所属的时代。”
      </p>

      {!data && (
        <div className="w-full max-w-md flex items-center gap-2 mb-16">
          <div className="relative flex-1">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入豆瓣用户名"
              className="w-full px-6 py-4 rounded-full border-2 border-stone-300 focus:border-stone-500 focus:outline-none bg-white text-lg shadow-sm transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-stone-800 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md whitespace-nowrap"
          >
            {loading ? '处理中...' : 'GO!'}
          </button>
        </div>
      )}

      {loading && <p className="text-stone-500 mb-8 animate-pulse">{status}</p>}
      {error && <p className="text-red-500 mb-8">{error}</p>}

      {data && (
        <div className="w-full max-w-5xl bg-white p-8 rounded-3xl shadow-xl flex flex-col gap-12">
          {/* User Profile Section */}
          {userProfile && (
            <div className="rounded-3xl flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(47, 164, 79, 0.08)' }}>
              <div className="p-8 pb-4 flex flex-col md:flex-row items-center gap-8">
                {/* Avatar & Name */}
                <div className="flex flex-col items-center gap-3 min-w-[120px]">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                    {userProfile.avatar ? (
                      <img 
                        src={`/api/proxy/image?url=${encodeURIComponent(userProfile.avatar)}`} 
                        alt={userProfile.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-stone-200 flex items-center justify-center text-stone-400">
                        无头像
                      </div>
                    )}
                  </div>
                  <div className="text-xl font-bold text-stone-800">{userProfile.name}</div>
                </div>

                {/* Stats Text */}
                <div className="flex-1 text-left">
                  <div className="text-base text-stone-700 leading-tight font-medium flex flex-col gap-2">
                    <div>
                      你好！<span className="font-bold">{userProfile.name}</span>
                    </div>
                    <div>
                      共计标注：
                      电影 <span className="font-bold text-doubanBlue">{summary?.movie?.total || 0}</span> 部，
                      电视剧 <span className="font-bold text-purple-600">{summary?.tv?.total || 0}</span> 部，
                      图书 <span className="font-bold text-doubanGreen">{summary?.book?.total || 0}</span> 本，
                      音乐 <span className="font-bold text-doubanPeach">{summary?.music?.total || 0}</span> 首；
                    </div>
                    <div>
                      根据你的标注，<span className="font-bold text-stone-900 text-xl">{favoriteYears.join('，')}</span>是你最喜欢的年份。
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Wall with Gradient Blur */}
              {favoriteCovers.length > 0 && (
                <div className="relative h-32 w-full mt-2 overflow-hidden">
                  <div className="flex gap-2 px-4 justify-center">
                    {favoriteCovers.map((item, idx) => (
                      <div key={idx} className="flex-shrink-0 w-20 h-28 bg-stone-100 rounded overflow-hidden shadow-sm">
                        {item.cover ? (
                          <img 
                            src={`/api/proxy/image?url=${encodeURIComponent(item.cover)}&t=${Date.now()}`}
                            alt="" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-200" />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Gradient Blur Overlay */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(244, 250, 246, 1) 0%, rgba(244, 250, 246, 0.8) 15%, rgba(244, 250, 246, 0) 40%)',
                      backdropFilter: 'blur(2px)',
                      WebkitBackdropFilter: 'blur(2px)',
                      maskImage: 'linear-gradient(to bottom, black 0%, transparent 40%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 40%)'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Chart Section */}
          <div className="relative pt-4">
            {/* Internal Chart Header: Title, Description, and Legend */}
            <div 
              className="absolute left-8 top-8 z-10 pointer-events-none transition-transform duration-500"
              style={{ transform: `translateY(${headerOffset}px)` }}
            >
              <h2 className="text-2xl font-bold text-stone-800 mb-1">喜好分布</h2>
              <p className="text-sm text-stone-500 mb-4 whitespace-normal md:whitespace-nowrap">仅收录评价为四星及以上的作品，根据书影音的首次上映/发行时间分类。</p>
              
              <div className="pointer-events-auto">
                {isSnapshotting ? (
                  <div className="mb-2">
                    <svg width="400" height="24" style={{ display: 'block' }}>
                      <g transform="translate(0, 12)">
                        <circle cx="6" cy="0" r="6" fill="#2AA3F4" />
                        <text x="20" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">电影</text>
                        <circle cx="80" cy="0" r="6" fill="#7c3aed" />
                        <text x="94" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">电视剧</text>
                        <circle cx="166" cy="0" r="6" fill="#2FA44F" />
                        <text x="180" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">图书</text>
                        <circle cx="240" cy="0" r="6" fill="#F6C28B" />
                        <text x="254" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">音乐</text>
                      </g>
                    </svg>
                  </div>
                ) : (
                  <div className="interactive-legend">
                    <CustomLegend hiddenSeries={hiddenSeries} toggleSeries={toggleSeries} />
                  </div>
                )}
              </div>
            </div>

            {isSnapshotting ? (
              <div className="w-full" style={{ width: '100%' }}>
                <BarChart
                  width={window.innerWidth > 1024 ? 960 : window.innerWidth - 64}
                  height={450}
                  data={chartData}
                  margin={{ top: 120, right: 20, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="cursor-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                      <stop offset="20%" stopColor="rgba(0,0,0,0.1)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="year" 
                    interval={chartData ? Math.ceil(chartData.length / 10) : 0} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666', fontSize: 12 }}
                    dy={10}
                  />
                  <Bar 
                    dataKey="movie" 
                    name="电影" 
                    fill="#2AA3F4" 
                    stackId="a" 
                    shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                    barSize={12} 
                    hide={hiddenSeries.includes('movie')}
                  />
                  <Bar 
                    dataKey="tv" 
                    name="电视剧" 
                    fill="#7c3aed" 
                    stackId="a" 
                    shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                    barSize={12} 
                    hide={hiddenSeries.includes('tv')}
                  />
                  <Bar 
                    dataKey="book" 
                    name="图书" 
                    fill="#2FA44F" 
                    stackId="a" 
                    shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                    barSize={12} 
                    hide={hiddenSeries.includes('book')}
                  />
                  <Bar 
                    dataKey="music" 
                    name="音乐" 
                    fill="#F6C28B" 
                    stackId="a" 
                    shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                    barSize={12} 
                    hide={hiddenSeries.includes('music')}
                  />
                </BarChart>
              </div>
            ) : (
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 120, right: 20, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="cursor-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                        <stop offset="20%" stopColor="rgba(0,0,0,0.1)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="year" 
                      interval={chartData ? Math.ceil(chartData.length / 10) : 0} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#666', fontSize: 12 }}
                      dy={10}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={<CustomCursor />}
                    />
                    <Bar 
                      dataKey="movie" 
                      name="电影" 
                      fill="#2AA3F4" 
                      stackId="a" 
                      shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                      barSize={12} 
                      hide={hiddenSeries.includes('movie')}
                    />
                    <Bar 
                      dataKey="tv" 
                      name="电视剧" 
                      fill="#7c3aed" 
                      stackId="a" 
                      shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                      barSize={12} 
                      hide={hiddenSeries.includes('tv')}
                    />
                    <Bar 
                      dataKey="book" 
                      name="图书" 
                      fill="#2FA44F" 
                      stackId="a" 
                      shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                      barSize={12} 
                      hide={hiddenSeries.includes('book')}
                    />
                    <Bar 
                      dataKey="music" 
                      name="音乐" 
                      fill="#F6C28B" 
                      stackId="a" 
                      shape={<CustomBar hiddenSeries={hiddenSeries} />} 
                      barSize={12} 
                      hide={hiddenSeries.includes('music')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Summary Stats Section */}
          {summary && (
            <div className="border-t-2 border-stone-100 pt-8">
              <h2 className="text-2xl font-bold text-stone-800 mb-8 text-left">详细统计</h2>
              <div className="flex flex-col">
                <SummarySection title="电影" data={summary.movie} color="text-doubanBlue" bgColor="#2AA3F4" isSnapshotting={isSnapshotting} />
                <SummarySection title="电视剧" data={summary.tv} color="text-purple-600" bgColor="#7c3aed" isSnapshotting={isSnapshotting} />
                <SummarySection title="图书" data={summary.book} color="text-doubanGreen" bgColor="#2FA44F" isSnapshotting={isSnapshotting} />
                <SummarySection title="音乐" data={summary.music} color="text-doubanPeach" bgColor="#F6C28B" isSnapshotting={isSnapshotting} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center mt-12 mb-8 text-stone-400 text-sm flex flex-col items-center gap-2">
        <a 
          href="https://github.com/sky31even/dbanalyzer" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="bg-black text-white p-1 rounded-full">
            <Github size={16} fill="white" />
          </div>
        </a>
      </footer>
    </div>
  );
}

export default App;
