import { SERIES_CONFIG } from '../constants';
import CustomLegend from './CustomLegend';
import ChartContent from './ChartContent';

const SnapshotLegend = () => {
  return (
    <div className="mb-2">
      <svg width="400" height="24" style={{ display: 'block' }}>
        <g transform="translate(0, 12)">
          {SERIES_CONFIG.map((item, i) => {
            const positions = [
              { cx: 6, textX: 20 },
              { cx: 80, textX: 94 },
              { cx: 166, textX: 180 },
              { cx: 240, textX: 254 },
            ];
            const pos = positions[i];
            return (
              <g key={item.key}>
                <circle cx={pos.cx} cy="0" r="6" fill={item.color} />
                <text x={pos.textX} y="5" fontSize="14" fill="#57534e" fontFamily="sans-serif">{item.label}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

const ChartSection = ({ chartData, hiddenSeries, toggleSeries, isSnapshotting, headerOffset, windowWidth }) => {
  return (
    <div className="relative pt-4">
      {/* Internal Chart Header: Title, Description, and Legend */}
      <div
        className="absolute left-0 top-8 z-10 pointer-events-none transition-transform duration-500 w-full"
        style={{ transform: `translateY(${headerOffset}px)` }}
      >
        <h2 className="text-2xl font-bold text-stone-800 mb-1">喜好分布</h2>
        <p className="text-sm text-stone-500 mb-4 whitespace-normal md:whitespace-nowrap max-w-[calc(100%-2rem)]">仅收录评价为四星及以上的作品，根据书影音的首次上映/发行时间分类。</p>

        <div className="pointer-events-auto">
          {isSnapshotting ? (
            <SnapshotLegend />
          ) : (
            <div className="interactive-legend">
              <CustomLegend hiddenSeries={hiddenSeries} toggleSeries={toggleSeries} />
            </div>
          )}
        </div>
      </div>

      <ChartContent
        chartData={chartData}
        hiddenSeries={hiddenSeries}
        isSnapshotting={isSnapshotting}
        windowWidth={windowWidth}
      />
    </div>
  );
};

export default ChartSection;
