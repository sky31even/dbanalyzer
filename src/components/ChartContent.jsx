import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SERIES_CONFIG } from '../constants';
import CustomBar from './CustomBar';
import CustomTooltip from './CustomTooltip';
import CustomCursor from './CustomCursor';

const renderBars = (hiddenSeries) => {
  return SERIES_CONFIG.map(series => (
    <Bar
      key={series.key}
      dataKey={series.key}
      name={series.label}
      fill={series.color}
      stackId="a"
      shape={<CustomBar hiddenSeries={hiddenSeries} />}
      barSize={12}
      hide={hiddenSeries.includes(series.key)}
    />
  ));
};

const renderDefs = () => (
  <defs>
    <linearGradient id="cursor-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="rgba(0,0,0,0)" />
      <stop offset="20%" stopColor="rgba(0,0,0,0.1)" />
      <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
    </linearGradient>
  </defs>
);

const renderXAxis = (chartData) => (
  <XAxis
    dataKey="year"
    interval={chartData ? Math.ceil(chartData.length / 10) : 0}
    axisLine={false}
    tickLine={false}
    tick={{ fill: '#666', fontSize: 12 }}
    dy={10}
  />
);

/**
 * Shared chart content component.
 * Eliminates the duplication between snapshotting and non-snapshotting BarChart configs.
 */
const ChartContent = ({ chartData, hiddenSeries, isSnapshotting, windowWidth }) => {
  const commonProps = {
    data: chartData,
    margin: { top: 120, right: 20, left: 20, bottom: 20 },
  };

  if (isSnapshotting) {
    const width = windowWidth > 1024 ? 960 : windowWidth - 64;
    return (
      <div className="w-full" style={{ width: '100%' }}>
        <BarChart width={width} height={450} {...commonProps}>
          {renderDefs()}
          {renderXAxis(chartData)}
          {renderBars(hiddenSeries)}
        </BarChart>
      </div>
    );
  }

  return (
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonProps}>
          {renderDefs()}
          {renderXAxis(chartData)}
          <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
          {renderBars(hiddenSeries)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartContent;
