import { useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
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
          className={`flex items-center gap-2 cursor-pointer transition-opacity ${hiddenSeries.includes(item.key) ? 'opacity-50 grayscale' : ''}`}
          onClick={() => toggleSeries(item.key)}
        >
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-stone-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const SummarySection = ({ title, data, color, bgColor }) => {
  if (!data) return null;
  
  // Calculate max value for distribution bar
  const maxCount = Math.max(...Object.values(data.distribution));

  return (
    <div className="flex flex-col md:flex-row gap-6 py-8 border-t border-stone-100 last:border-0">
      {/* Left: Category Name */}
      <div className="w-full md:w-32 flex-shrink-0">
        <h3 className={`text-xl font-bold ${color}`}>{title}</h3>
      </div>

      {/* Middle: Stats */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
        <div className="text-stone-600">
          共计看过/读过 <span className="font-bold text-stone-800">{data.total}</span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="text-sm text-stone-500 mb-1">评价分布</div>
          <div className="flex items-end h-24 gap-2">
            {[1, 2, 3, 4, 5].map(star => {
              const count = data.distribution[star] || 0;
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={star} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  <div className="text-xs text-stone-400 opacity-0 group-hover:opacity-100 absolute -top-4">{count}</div>
                  <div 
                    className="w-full rounded-t-sm transition-all duration-500 opacity-60 hover:opacity-100"
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
      <div className="flex-1 overflow-x-auto pb-2">
        <div className="text-sm text-stone-500 mb-3">最近标注</div>
        <div className="flex justify-between gap-4">
          {data.recent.slice(0, 5).map((item, i) => (
            <div key={i} className="flex-shrink-0 w-20 flex flex-col gap-1 group" title={item.title}>
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
                <div className="text-xs text-stone-600 w-full text-center line-clamp-2 min-h-[2.5rem] leading-tight mt-1 overflow-hidden px-1 group-hover:text-doubanBlue transition-colors">{item.title}</div>
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
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [hiddenSeries, setHiddenSeries] = useState([]);

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
        setSummary(result.summary);
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
    <div className="min-h-screen bg-doubanBg flex flex-col items-center py-20 px-4 font-sans">
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

      {loading && <p className="text-stone-500 mb-8 animate-pulse">{status}</p>}
      {error && <p className="text-red-500 mb-8">{error}</p>}

      {data && (
        <div className="w-full max-w-5xl bg-white p-8 rounded-3xl shadow-xl flex flex-col gap-12">
          {/* Chart Section */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2 text-left">喜好分布</h2>
            <p className="text-sm text-stone-500 mb-6">根据所标注的书影音的首次上映/发行时间分类。</p>
            <CustomLegend hiddenSeries={hiddenSeries} toggleSeries={toggleSeries} />
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
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
                    interval={data ? Math.ceil(data.length / 10) : 0} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666', fontSize: 12 }}
                    dy={10}
                  />
                  <Tooltip 
                    cursor={<CustomCursor />}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
          </div>

          {/* Summary Stats Section */}
          {summary && (
            <div className="border-t-2 border-stone-100 pt-8">
              <h2 className="text-2xl font-bold text-stone-800 mb-8 text-left">详细统计</h2>
              <div className="flex flex-col">
                <SummarySection title="电影" data={summary.movie} color="text-doubanBlue" bgColor="#2AA3F4" />
                <SummarySection title="电视剧" data={summary.tv} color="text-purple-600" bgColor="#7c3aed" />
                <SummarySection title="图书" data={summary.book} color="text-doubanGreen" bgColor="#2FA44F" />
                <SummarySection title="音乐" data={summary.music} color="text-doubanPeach" bgColor="#F6C28B" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
