import CoverImage from './CoverImage';
import RatingBadge from './RatingBadge';

const getVerb = (title) => {
  if (title === '图书') return '读过';
  if (title === '音乐') return '听过';
  return '看过';
};

const SummarySection = ({ title, data, color, bgColor, isSnapshotting }) => {
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
        <div className="flex gap-4 flex-nowrap justify-start">
          {data.recent.slice(0, 5).map((item, i) => (
            <div
              key={i}
              className={`flex-shrink-0 w-20 flex flex-col gap-1 group ${
                i === 3 ? 'hidden xs:flex' :
                i === 4 ? 'hidden sm:flex' :
                'flex'
              }`}
              title={item.title}
            >
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="w-20 h-28 bg-stone-100 rounded overflow-hidden shadow-sm group-hover:shadow-md transition-shadow relative">
                  <CoverImage cover={item.cover} alt={item.title} className="w-full h-full object-cover" />
                  <RatingBadge rating={item.rating} isSnapshotting={isSnapshotting} />
                </div>
                <div
                  className="text-[11px] text-stone-600 w-full text-center mt-1 px-1 group-hover:text-doubanBlue transition-colors overflow-hidden font-medium"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: '2',
                    WebkitBoxOrient: 'vertical',
                    height: '2.6em',
                    lineHeight: '1.3em',
                    wordBreak: 'break-all'
                  }}
                >
                  {item.title}
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

export default SummarySection;
