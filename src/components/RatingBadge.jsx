const RatingBadge = ({ rating, isSnapshotting }) => {
  if (rating <= 0) return null;

  if (isSnapshotting) {
    return (
      <div className="absolute top-1 right-1">
        <svg width="24" height="14" viewBox="0 0 24 14">
          <rect x="0" y="0" width="24" height="14" rx="2" fill="#fbbf24" />
          <text x="12" y="10" fontSize="9" fill="white" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
            {rating}★
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="absolute top-1 right-1 bg-yellow-400 text-white text-[10px] px-1 rounded shadow font-bold">
      {rating}★
    </div>
  );
};

export default RatingBadge;
