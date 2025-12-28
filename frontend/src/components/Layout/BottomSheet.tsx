import { motion, useAnimation } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useEffect, useState, useCallback, ReactNode } from "react";
import { clsx } from "clsx";

interface BottomSheetProps {
  children: ReactNode;
}

type SnapPoint = "closed" | "half" | "full";

const BottomSheet = ({ children }: BottomSheetProps) => {
  const [snapPoint, setSnapPoint] = useState<SnapPoint>("closed");
  const controls = useAnimation();

  // Snap point heights (percentage of viewport)
  const snapHeights: Record<SnapPoint, string> = {
    closed: "68vh",  // Show ~32% (bottom sheet peek)
    half: "50vh",    // Show 50%
    full: "8vh",     // Show ~92% (leave space for status bar)
  };

  const onDragEnd = useCallback((_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 50;
    const velocityThreshold = 300;

    // Swipe up (negative offset/velocity)
    if (offset.y < -threshold || velocity.y < -velocityThreshold) {
      if (snapPoint === "closed") setSnapPoint("half");
      else if (snapPoint === "half") setSnapPoint("full");
    }
    // Swipe down (positive offset/velocity)
    else if (offset.y > threshold || velocity.y > velocityThreshold) {
      if (snapPoint === "full") setSnapPoint("half");
      else if (snapPoint === "half") setSnapPoint("closed");
    }
  }, [snapPoint]);

  useEffect(() => {
    controls.start({ y: snapHeights[snapPoint] });
  }, [snapPoint, controls]);

  const handleHandleClick = () => {
    // Cycle through snap points
    const cycle: Record<SnapPoint, SnapPoint> = {
      closed: "half",
      half: "full",
      full: "closed",
    };
    setSnapPoint(cycle[snapPoint]);
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
