// LAN demo: Component to indicate active Local Network (LAN) testing mode
import { Wifi, Info } from "lucide-react";

export function LanModeBadge() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLanMode = Boolean(
    hostname &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "0.0.0.0"
  );

  if (!isLanMode) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-medium shadow-xs"
      title={`Running in Local Area Network (LAN) Demo Mode on ${hostname}:5173`}
    >
      <Wifi size={13} className="text-emerald-500 animate-pulse" />
      <span className="font-bold text-[11px] uppercase tracking-wider hidden xs:inline">
        LAN MODE
      </span>
      <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
        {hostname}
      </span>
      <Info size={12} className="text-emerald-500/70 hidden sm:inline" />
    </div>
  );
}

export default LanModeBadge;
