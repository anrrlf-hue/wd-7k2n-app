"use client";

import { motion } from "framer-motion";

export function LoadingStep() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <motion.div
        className="h-16 w-16 rounded-full border-2 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-sm text-muted-foreground">
        사주를 살펴보는 중이에요...
      </p>
    </div>
  );
}
