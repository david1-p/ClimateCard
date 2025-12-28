import { motion, useAnimation } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useEffect, useState, useCallback, ReactNode } from "react";
import { clsx } from "clsx";

interface BottomSheetProps {
  children: ReactNode;
  contentItemCount?: number; // 표시할 아이템 개수 (버스 노선 수)
}

type SnapPoint = "closed" | "half" | "full";

const BottomSheet = ({ children, contentItemCount = 0 }: BottomSheetProps) => {
  const [snapPoint, setSnapPoint] = useState<SnapPoint>("closed");
  const controls = useAnimation();

  // 아이템 개수에 따라 동적으로 높이 계산
  const calculateHalfHeight = (itemCount: number): string => {
    if (itemCount === 0) return "25vh"; // 기본값

    // 도착정보를 옆으로 배치하여 카드 높이가 줄어듦
    // 버스 노선 1개당 약 88px (카드 + 간격 + 여유)
    // 헤더 + 필터 + 여백 약 240px
    const headerHeight = 240;
    const itemHeight = 88;
    const totalContentHeight = headerHeight + (itemHeight * itemCount);

    // vh로 변환 (window.innerHeight 기준)
    const viewportHeight = window.innerHeight;
    const contentVh = (totalContentHeight / viewportHeight) * 100;

    // 최소 40vh, 최대 88vh로 제한 (여유있게)
    const clampedVh = Math.min(Math.max(contentVh, 40), 88);

    return `${100 - clampedVh}vh`;
  };

  // Snap point heights (percentage of viewport)
  const snapHeights: Record<SnapPoint, string> = {
    closed: "68vh",  // Show ~32% (bottom sheet peek)
    half: calculateHalfHeight(contentItemCount),
    full: "8vh",     // Show ~92% (leave space for status bar)
  };

  const onDragEnd = useCallback((_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 50;
    const velocityThreshold = 300;

    // Swipe up (negative offset/velocity) - open to half
    if (offset.y < -threshold || velocity.y < -velocityThreshold) {
      setSnapPoint("half");
    }
    // Swipe down (positive offset/velocity) - close
    else if (offset.y > threshold || velocity.y > velocityThreshold) {
      setSnapPoint("closed");
    }
  }, [snapPoint]);

  useEffect(() => {
    controls.start({ y: snapHeights[snapPoint] });
  }, [snapPoint, controls, contentItemCount]);

  const handleHandleClick = () => {
    // Toggle: closed ⇄ half
    if (snapPoint === "closed") {
      setSnapPoint("half");
    } else {
      setSnapPoint("closed");
    }
  };

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={onDragEnd}
      animate={controls}
      initial={{ y: snapHeights.closed }}
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30",
        "bg-card rounded-t-2xl shadow-sheet",
        "flex flex-col",
        "h-[92vh]", // Total height available
        "touch-none"
      )}
    >
      {/* Handle bar */}
      <div 
        onClick={handleHandleClick}
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50 transition-colors" />
      </div>

      {/* Content area with scroll */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe touch-auto">
        {children}
      </div>
    </motion.div>
  );
};

export default BottomSheet;
