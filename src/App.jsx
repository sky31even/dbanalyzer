import { useState, useMemo, useEffect, useRef } from 'react';
import { Github } from 'lucide-react';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { fetchDoubanData } from './services/douban';
import UserProfile from './components/UserProfile';
import ChartSection from './components/ChartSection';
import SummarySection from './components/SummarySection';

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';
const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

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
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Track viewport size for responsive chart (snapshotting mode) and mobile detection
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsMobile(window.matchMedia(MOBILE_MEDIA_QUERY).matches || MOBILE_UA_REGEX.test(navigator.userAgent));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // AbortController ref for cancelling in-flight requests
  const abortControllerRef = useRef(null);

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

    const itemsFromFavYears = allHighRatedItems.filter(item =>
      item.year && favoriteYears.includes(item.year.toString())
    );

    return itemsFromFavYears.slice(0, 10);
  }, [allHighRatedItems, favoriteYears]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstYearIndex = data.findIndex(d => (d.movie + d.tv + d.book + d.music) > 0);
    if (firstYearIndex === -1) return [];
    return data.slice(firstYearIndex);
  }, [data]);

  const headerOffset = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;

    const rangeToCheck = Math.ceil(chartData.length * 0.25);
    const earlyData = chartData.slice(0, rangeToCheck);

    const maxValInRange = Math.max(...earlyData.map(d => d.movie + d.tv + d.book + d.music));
    const totalMaxVal = Math.max(...chartData.map(d => d.movie + d.tv + d.book + d.music));

    if (totalMaxVal > 0 && (maxValInRange / totalMaxVal) > 0.4) {
      return -100;
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

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
      }, controller.signal);

      if (result.yearData.length === 0) {
        setError('未找到数据或用户不存在/设置了隐私权限');
      } else {
        setData(result.yearData);
        setAllHighRatedItems(result.allHighRatedItems || []);
        setSummary(result.summary);
        setUserProfile(result.userProfile);
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // Request was cancelled, ignore
      console.error(err);
      setError('获取数据失败，请稍后重试');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setStatus('');
        abortControllerRef.current = null;
      }
    }
  };

  const handleShare = async () => {
    try {
      setIsSnapshotting(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const element = document.querySelector('.min-h-screen');
      if (!element) {
        setIsSnapshotting(false);
        return;
      }

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f5f5f4',
        scale: 2,
      });

      const dataUrl = canvas.toDataURL('image/png');

      const canShare = typeof navigator.share === 'function' && MOBILE_UA_REGEX.test(navigator.userAgent);
      if (canShare) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `dbanalyzer-${username}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: '艺术年轮',
          text: '这是我的豆瓣艺术年轮，快来生成你的吧！',
        });
      } else {
        const link = document.createElement('a');
        link.download = `dbanalyzer-${username}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsSnapshotting(false);
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
        "用一生去发现自己所属的时代。"
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
          <UserProfile
            userProfile={userProfile}
            summary={summary}
            favoriteYears={favoriteYears}
            favoriteCovers={favoriteCovers}
          />

          {/* Chart Section */}
          <ChartSection
            chartData={chartData}
            hiddenSeries={hiddenSeries}
            toggleSeries={toggleSeries}
            isSnapshotting={isSnapshotting}
            headerOffset={headerOffset}
            windowWidth={windowWidth}
          />

          {/* Summary Stats Section */}
          {summary && (
            <div className="border-t-2 border-stone-100 pt-8">
              <h2 className="text-2xl font-bold text-stone-800 mb-8 text-left">详细统计</h2>
              <div className="flex flex-col">
                <SummarySection title="电影" data={summary.movie} color="text-doubanBlue" bgColor="#2AA3F4" isSnapshotting={isSnapshotting} />
                <SummarySection title="电视剧" data={summary.tv} color="text-doubanPurple" bgColor="#7c3aed" isSnapshotting={isSnapshotting} />
                <SummarySection title="图书" data={summary.book} color="text-doubanGreen" bgColor="#2FA44F" isSnapshotting={isSnapshotting} />
                <SummarySection title="音乐" data={summary.music} color="text-doubanPeach" bgColor="#F6C28B" isSnapshotting={isSnapshotting} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center mt-12 mb-8 text-stone-400 text-sm flex flex-col items-center gap-4">
        {data && (
          <div className="flex flex-col items-center gap-2">
            {isSnapshotting ? (
              <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl shadow-sm mb-2">
                <QRCodeCanvas value="https://dbanalyzer.pages.dev/" size={isMobile ? 60 : 80} />
                <span className="text-[8px] md:text-[10px] text-stone-400 font-medium">扫码生成你的艺术年轮</span>
              </div>
            ) : (
              <button
                onClick={handleShare}
                className="px-6 py-2 bg-doubanGreen/10 text-doubanGreen rounded-full font-bold hover:bg-doubanGreen/20 transition-all flex items-center gap-2 group text-sm md:text-base border border-doubanGreen/20"
              >
                <span>✨</span>
                分享结果
              </button>
            )}
          </div>
        )}

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
