import { useState } from 'react';
import { proxyImageUrl } from '../constants';

const CoverImage = ({ cover, alt, className, fallbackText = 'No Cover' }) => {
  const [error, setError] = useState(false);

  if (!cover || error) {
    return (
      <div className={`${className || 'w-full h-full'} flex items-center justify-center text-stone-300 text-xs bg-stone-100`}>
        {error ? 'Load Failed' : fallbackText}
      </div>
    );
  }

  return (
    <img
      src={proxyImageUrl(cover)}
      alt={alt}
      className={className || 'w-full h-full object-cover'}
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
};

export default CoverImage;
