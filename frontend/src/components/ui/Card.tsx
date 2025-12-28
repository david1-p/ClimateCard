import { clsx } from "clsx";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  highlighted?: boolean;
}

export const Card = ({ 
  children, 
  className, 
  onClick, 
  interactive = false,
  highlighted = false 
}: CardProps) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "rounded-lg border transition-all duration-200",
        interactive && "cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.98]",
        highlighted 
          ? "border-climate-eligible/40 bg-climate-eligible/5 shadow-sm" 
          : "border-border bg-card",
        className
      )}
    >
      {children}
    </div>
  );
};

// Bus route badge component
interface RouteBadgeProps {
  routeName: string;
  routeType: string;
  size?: "sm" | "md" | "lg";
}

const routeTypeColorMap: Record<string, string> = {
  "1": "bg-bus-trunk", // 간선
  "2": "bg-bus-branch", // 지선
  "3": "bg-bus-circulation", // 순환
  "4": "bg-bus-wide", // 광역
  "5": "bg-bus-village", // 마을
  "6": "bg-bus-airport", // 공항
};

export const RouteBadge = ({ routeName, routeType, size = "md" }: RouteBadgeProps) => {
  const colorClass = routeTypeColorMap[routeType] || "bg-bus-default";
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs min-w-[2.5rem]",
    md: "px-2.5 py-1.5 text-sm min-w-[3rem]",
    lg: "px-3 py-2 text-base min-w-[4rem]",
  };
  
  return (
    <span 
      className={clsx(
        "inline-flex items-center justify-center font-bold text-white rounded",
        colorClass,
        sizeClasses[size]
      )}
    >
      {routeName}
    </span>
  );
};

// Climate card eligibility badge
interface ClimateEligibilityBadgeProps {
  eligible: boolean;
  size?: "sm" | "md";
}

export const ClimateEligibilityBadge = ({ eligible, size = "sm" }: ClimateEligibilityBadgeProps) => {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
  };
  
  return (
    <span 
      className={clsx(
        "inline-flex items-center gap-1 font-semibold rounded-full",
        eligible 
          ? "text-climate-eligible bg-climate-eligible/10" 
          : "text-climate-ineligible bg-climate-ineligible/10",
        sizeClasses[size]
      )}
    >
      {eligible ? "✓ 기후동행카드" : "✕ 미적용"}
    </span>
  );
};
