"use client";

import { useState, useEffect } from "react";

export function BuildTimestamp() {
  const [buildTime, setBuildTime] = useState<string>("");

  useEffect(() => {
    // Try to load build info
    try {
      import("@/lib/build-info.json").then((buildInfo) => {
        setBuildTime(buildInfo.date);
      }).catch(() => {
        // In dev mode, just show current time
        setBuildTime("Dev mode");
      });
    } catch {
      setBuildTime("Dev mode");
    }
  }, []);

  if (!buildTime) return null;

  return (
    <span className="absolute -bottom-4 left-0 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
      {buildTime}
    </span>
  );
}