import CoverImage from './CoverImage';
import { proxyImageUrl } from '../constants';

const UserProfile = ({ userProfile, summary, favoriteYears, favoriteCovers }) => {
  if (!userProfile) return null;

  return (
    <div className="rounded-3xl flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(47, 164, 79, 0.08)' }}>
      <div className="p-8 pb-4 flex flex-col md:flex-row items-start gap-8 relative">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center gap-3 min-w-[60px] md:min-w-[120px]">
          <div className="w-12 h-12 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
            {userProfile.avatar ? (
              <img
                src={proxyImageUrl(userProfile.avatar)}
                alt={userProfile.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-stone-200 flex items-center justify-center text-stone-400">
                无头像
              </div>
            )}
          </div>
        </div>

        {/* Stats Text */}
        <div className="flex-1 text-left pt-0 w-full">
          <div className="text-base text-stone-700 leading-tight font-medium flex flex-col gap-3">
            <div className="text-2xl md:text-3xl font-bold text-stone-900 mb-1">
              你好！{userProfile.name}
            </div>
            <div className="leading-relaxed text-justify">
              共计标注
              电影 <span className="font-bold text-doubanBlue">{summary?.movie?.total || 0}</span> 部，
              电视剧 <span className="font-bold text-doubanPurple">{summary?.tv?.total || 0}</span> 部，
              图书 <span className="font-bold text-doubanGreen">{summary?.book?.total || 0}</span> 本，
              音乐 <span className="font-bold text-doubanPeach">{summary?.music?.total || 0}</span> 首；
            </div>
            <div className="text-justify">
              根据你的标注，<span className="font-bold text-stone-900 text-xl">{favoriteYears.join('，')}</span>是你最喜欢的年份。
            </div>
          </div>
        </div>
      </div>

      {/* Cover Wall with Gradient Blur */}
      {favoriteCovers.length > 0 && (
        <div className="relative h-32 w-full mt-2 overflow-hidden">
          <div className="flex gap-2 px-4 justify-center">
            {favoriteCovers.map((item, idx) => (
              <div key={idx} className="flex-shrink-0 w-20 h-28 bg-stone-100 rounded overflow-hidden shadow-sm">
                <CoverImage cover={item.cover} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {/* Gradient Blur Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              maskImage: 'linear-gradient(to bottom, black 0%, transparent 25%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 25%)'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default UserProfile;
