import { SERIES_KEYS } from '../constants';

const CustomBar = (props) => {
  const { fill, x, y, width, height, payload, dataKey, hiddenSeries } = props;
  // Don't render if series is hidden
  if (hiddenSeries.includes(dataKey)) return null;

  // Filter keys that have value > 0 for this year AND are not hidden
  const activeKeys = SERIES_KEYS.filter(k => payload[k] > 0 && !hiddenSeries.includes(k));

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
    d.push(`A ${r},${r} 0 0 0 ${x},${y + height}`);
  }

  d.push('Z'); // Close path

  return <path d={d.join(' ')} fill={fill} />;
};

export default CustomBar;
