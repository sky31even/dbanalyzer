const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-stone-100">
        <p className="font-bold text-stone-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm flex items-center gap-1" style={{ color: entry.color }}>
            {entry.name} : {entry.value} <span style={{ color: '#ff9800' }}>★</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
