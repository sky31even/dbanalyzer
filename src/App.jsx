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

const SummarySection = ({ title, data, color, bgColor }) => {
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
        <div className="flex gap-4">
          {data.recent.slice(0, 5).map((item, i) => (
            <div key={i} className={`flex-shrink-0 w-20 flex flex-col gap-1 group ${(i >= 3 && !window.isSnapshotting) ? 'hidden md:flex' : 'flex'}`} title={item.title}>
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
  const [summary, setSummary] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [error, setError] = useState('');
  const [hiddenSeries, setHiddenSeries] = useState([]);
  const [generatedImage, setGeneratedImage] = useState(null);

  const favoriteYear = useMemo(() => {
    if (!data || data.length === 0) return null;
    let maxCount = 0;
    let maxYear = null;
    data.forEach(item => {
      const count = (item.movie || 0) + (item.tv || 0) + (item.book || 0) + (item.music || 0);
      if (count > maxCount) {
        maxCount = count;
        maxYear = item.year;
      }
    });
    return maxYear;
  }, [data]);

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

  const handleSaveImage = async () => {
    try {
      setIsSnapshotting(true);
      window.isSnapshotting = true; // Global flag for non-React access
      
      // Wait for React to render the snapshot view
      await new Promise(resolve => setTimeout(resolve, 200));

      // Find the main content container
      const element = document.querySelector('.min-h-screen');
      if (!element) {
        setIsSnapshotting(false);
        window.isSnapshotting = false;
        return;
      }
      
      // Force container to fixed width for consistent screenshot
      const originalStyle = element.style.cssText;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // On mobile, force a standard width (e.g. 375px or 400px) to prevent layout shifts
      // But ensure it's wide enough for the content
      if (isMobile) {
        element.style.width = '100%'; 
        element.style.maxWidth = '100%';
        element.style.padding = '20px'; // Ensure consistent padding
      }

      const canvas = await html2canvas(element, {
        useCORS: true, // Allow loading cross-origin images (covers)
        allowTaint: true,
        backgroundColor: '#f5f5f4', // Match bg-doubanBg
        scale: isMobile ? 4 : 2, // Higher resolution for mobile
        windowWidth: element.scrollWidth, // Ensure correct width capture
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
           // Ensure SVG takes full width in clone
           const svgs = clonedDoc.querySelectorAll('svg');
           svgs.forEach(svg => {
             svg.style.width = '100%';
             svg.setAttribute('width', '100%');
           });
           
           // Force recent items to be visible in clone ONLY for desktop
           if (!isMobile) {
             const hiddenItems = clonedDoc.querySelectorAll('.hidden.md\\:flex');
             hiddenItems.forEach(el => {
               el.classList.remove('hidden', 'md:flex');
               el.classList.add('flex');
             });
           }
        }
      });
      
      // Restore styles
      if (isMobile) {
        element.style.cssText = originalStyle;
      }

      const dataUrl = canvas.toDataURL('image/png');
      
      // Check if mobile device
      // isMobile is already defined above
      
      if (isMobile) {
        setGeneratedImage(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `dbanalyzer-${username}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Failed to save image:', err);
      alert('保存图片失败，请稍后重试');
    } finally {
      setIsSnapshotting(false);
      window.isSnapshotting = false;
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
            <div className="rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8" style={{ backgroundColor: 'rgba(47, 164, 79, 0.08)' }}>
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
                <div className="text-lg text-stone-700 leading-loose font-medium flex flex-col gap-2">
                  <div>
                    你好！<span className="font-bold">{userProfile.name}</span>
                  </div>
                  {userProfile.registrationDate && (
                    <div>注册于 <span className="font-bold">{userProfile.registrationDate}</span></div>
                  )}
                  <div>
                    共计标注：
                  </div>
                  <div className="pl-0">
                    电影 <span className="font-bold text-doubanBlue">{summary?.movie?.total || 0}</span> 部，
                    电视剧 <span className="font-bold text-purple-600">{summary?.tv?.total || 0}</span> 部，
                    图书 <span className="font-bold text-doubanGreen">{summary?.book?.total || 0}</span> 本，
                    音乐 <span className="font-bold text-doubanPeach">{summary?.music?.total || 0}</span> 首；
                  </div>
                  <div className="mt-2">
                    根据你的标注，<span className="font-bold text-stone-900 text-2xl">{favoriteYear}</span>是你最爱的一年。
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2 text-left">喜好分布</h2>
            <p className="text-sm text-stone-500 mb-6">根据所标注的书影音的首次上映/发行时间分类。</p>
            
            {/* Static Legend for Screenshot - Using SVG for pixel-perfect rendering */}
            {isSnapshotting ? (
              <>
                <div className="mb-6">
                  <svg width="400" height="24" style={{ display: 'block' }}>
                    <g transform="translate(0, 12)">
                      {/* 电影 */}
                      <circle cx="6" cy="0" r="6" fill="#2AA3F4" />
                      <text x="20" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">电影</text>
                      
                      {/* 电视剧 */}
                      <circle cx="80" cy="0" r="6" fill="#7c3aed" />
                      <text x="94" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">电视剧</text>
                      
                      {/* 图书 */}
                      <circle cx="166" cy="0" r="6" fill="#2FA44F" />
                      <text x="180" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">图书</text>
                      
                      {/* 音乐 */}
                      <circle cx="240" cy="0" r="6" fill="#F6C28B" />
                      <text x="254" y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">音乐</text>
                    </g>
                  </svg>
                </div>
                {/* SVG Bar Chart for Screenshot */}
                <div className="w-full">
                  <svg 
                    viewBox={`0 0 ${data.length * 15} 300`} 
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '300px' }}
                  >
                    {(() => {
                      // Calculate max total count for scaling
                      const maxTotal = Math.max(...data.map(d => (d.movie||0) + (d.tv||0) + (d.book||0) + (d.music||0)));
                      const scaleY = 250 / (maxTotal || 1); // Leave 50px for labels
                      const barWidth = 14;
                      const gap = 1;
                      
                      return data.map((d, i) => {
                        const x = i * (barWidth + gap);
                        let currentY = 280; // Start from bottom (above x-axis labels)
                        
                        // Render bars in stack order: music -> book -> tv -> movie (bottom to top visually)
                        const renderBar = (count, color) => {
                          if (!count) return null;
                          const height = count * scaleY;
                          currentY -= height;
                          return (
                            <rect 
                              key={color}
                              x={x} 
                              y={currentY} 
                              width={barWidth} 
                              height={height} 
                              fill={color} 
                              rx={barWidth/2}
                            />
                          );
                        };

                        return (
                          <g key={d.year}>
                            {renderBar(d.music, '#F6C28B')}
                            {renderBar(d.book, '#2FA44F')}
                            {renderBar(d.tv, '#7c3aed')}
                            {renderBar(d.movie, '#2AA3F4')}
                            
                            {/* X Axis Label every ~10 years */}
                            {i % Math.ceil(data.length / 10) === 0 && (
                              <text 
                                x={x + barWidth/2} 
                                y="295" 
                                fontSize="10" 
                                fill="#666" 
                                textAnchor="middle"
                              >
                                {d.year}
                              </text>
                            )}
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              </>
            ) : (
              <>
                <div className="interactive-legend">
                  <CustomLegend hiddenSeries={hiddenSeries} toggleSeries={toggleSeries} />
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data}
                      margin={{
                        top: 20,
                        right: 0,
                        left: 0,
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
              </>
            )}
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
              
              {!isSnapshotting && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleSaveImage}
                    className="save-share-btn flex items-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-full hover:bg-stone-700 transition-colors shadow-md"
                  >
                    <span>📸</span>
                    <span>保存 & 分享我的结果</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!isSnapshotting && (
        <footer className="mt-16 mb-8 text-stone-400 github-footer">
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
      )}

      {/* QR Code Section for Screenshot */}
      {isSnapshotting && (
        <div className="qr-code-section flex flex-col items-center gap-4 mt-8 pb-8">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <QRCodeCanvas value="https://dbanalyzer.pages.dev/" size={100} />
          </div>
          <p className="text-stone-500 text-sm font-medium">扫码查看我的艺术年轮</p>
        </div>
      )}

      {/* Image Preview Modal for Mobile */}
      {generatedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4" onClick={() => setGeneratedImage(null)}>
          <div className="bg-white p-2 rounded-lg max-h-[80vh] overflow-auto max-w-full" onClick={e => e.stopPropagation()}>
            <img src={generatedImage} alt="Generated Analysis" className="w-full h-auto" />
          </div>
          <p className="text-white mt-4 text-center font-medium">长按图片保存到相册</p>
          <button 
            className="mt-4 px-6 py-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
            onClick={() => setGeneratedImage(null)}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
