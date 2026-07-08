import { SERIES_CONFIG } from '../constants';

const CustomLegend = ({ hiddenSeries, toggleSeries }) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {SERIES_CONFIG.map(item => (
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

export default CustomLegend;
