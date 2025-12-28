import { clsx } from "clsx";

interface QuickActionsProps {
  onNearbyClick: () => void;
  onClimateOnlyClick: () => void;
  climateOnly: boolean;
}

export const QuickActions = ({ onNearbyClick, onClimateOnlyClick, climateOnly }: QuickActionsProps) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onNearbyClick}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
          "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        내 주변
      </button>
      <button
        onClick={onClimateOnlyClick}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
          climateOnly
            ? "bg-climate-eligible text-white"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        기후동행카드
      </button>
    </div>
  );
};
