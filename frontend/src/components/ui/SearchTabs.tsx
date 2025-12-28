import { clsx } from "clsx";

interface SearchTabsProps {
  activeTab: "route" | "station";
  onTabChange: (tab: "route" | "station") => void;
}

export const SearchTabs = ({ activeTab, onTabChange }: SearchTabsProps) => {
  return (
    <div className="flex gap-2 p-1 bg-secondary rounded-xl">
      <button
        onClick={() => onTabChange("route")}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          activeTab === "route"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        노선 검색
      </button>
      <button
        onClick={() => onTabChange("station")}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          activeTab === "station"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        정류장 검색
      </button>
    </div>
  );
};
