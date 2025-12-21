import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";
import { clsx } from "clsx";

interface BottomSheetProps {
    children: React.ReactNode;
    isOpen?: boolean;
}

const BottomSheet = ({ children }: BottomSheetProps) => {
    // 시트의 상태: "closed" (1/3), "half" (중간), "full" (전체)
    const [snapPoint, setSnapPoint] = useState<"closed" | "half" | "full">("closed");
    const controls = useAnimation();

    const onDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
        const offset = info.offset.y;
        const velocity = info.velocity.y;

        // 위로 드래그하거나 빠르게 위로 쓸어올릴 때
        if (offset < -100 || velocity < -500) {
            if (snapPoint === "closed") setSnapPoint("half");
            else setSnapPoint("full");
        }
        // 아래로 드래그하거나 빠르게 아래로 쓸어내릴 때
        else if (offset > 100 || velocity > 500) {
            if (snapPoint === "full") setSnapPoint("half");
            else setSnapPoint("closed");
        }
    };

    useEffect(() => {
        // 애니메이션 제어 - 반응형 높이
        const yVariants = {
            closed: "calc(100vh - 33vh)",  // 화면의 1/3만 보이게
            half: "calc(100vh - 50vh)",     // 화면 절반
            full: "calc(100vh - 85vh)",     // 화면의 85% (상단 여백)
        };

        controls.start({ y: yVariants[snapPoint] });
    }, [snapPoint, controls]);

    return (
        <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            animate={controls}
            initial={{ y: "calc(100vh - 33vh)" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={clsx(
                "absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.1)] z-20 overflow-hidden flex flex-col",
                "h-[90vh] max-w-full", // 최대 높이 및 반응형
                "md:max-w-2xl md:left-1/2 md:-translate-x-1/2" // 태블릿/데스크톱: 중앙 정렬, 최대 너비
            )}
        >
            {/* 핸들바 영역 */}
            <div className="w-full pt-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing shrink-0 items-center touch-none"
                onClick={() => setSnapPoint(snapPoint === "closed" ? "half" : snapPoint === "half" ? "full" : "closed")}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors" />
            </div>

            {/* 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-4 px-4 md:px-6">
                {children}
            </div>
        </motion.div>
    );
};

export default BottomSheet;
