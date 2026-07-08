import { Rectangle } from 'recharts';

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

export default CustomCursor;
