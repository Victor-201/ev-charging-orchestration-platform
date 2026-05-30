/**
 * EVOLTTOUCH Kiosk — Offline Screen
 * 
 * Shown when the charger is in 'offline' state.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { WifiOff, AlertOctagon, Phone, Info, RefreshCw } from "lucide-react";
import { CHARGER_ID } from "../../data/sources/localStorage";

interface OfflineScreenProps {
  onRetry?: () => void;
}

const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setRetrying(false), 1000);
    }
  };

  return (
    <motion.div
      key="offline"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center relative p-20"
    >
      {/* ── Ambient Glow BG (Red/Slate/Dim) ── */}
      <div className="ambient-glow bg-red-600 opacity-[0.06] w-[60%] h-[60%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[120px]" />
      <div className="grid-overlay opacity-30" />

      {/* ── Main Card ── */}
      <div className="relative z-10 max-w-3xl w-full text-center space-y-12">
        
        {/* Animated Icon Container */}
        <div className="relative inline-block">
          <motion.div 
            animate={{ 
              scale: [1, 1.04, 1],
              opacity: [0.9, 1, 0.9]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 glass rounded-[40px] flex items-center justify-center relative z-10 mx-auto border-[var(--card-border)]"
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.1)',
            }}
          >
            <WifiOff size={48} className="text-red-500" />
          </motion.div>
          
          {/* Pulsing Alert Badge */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -top-3 -right-3 w-10 h-10 bg-red-950 rounded-full flex items-center justify-center border border-red-500/30"
          >
            <AlertOctagon size={18} className="text-red-500" />
          </motion.div>
        </div>

        <div className="space-y-6">
          <h1 className="text-6xl font-black tracking-tight leading-tight uppercase">
            Trụ sạc <br />
            <span className="text-red-500">Ngoại tuyến</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Thiết bị tạm thời mất kết nối với hệ thống máy chủ trung tâm. Quý khách vui lòng thử lại hoặc sử dụng các trụ sạc khác.
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 pt-4">
          <div className="glass p-6 rounded-3xl border-[var(--card-border)] flex flex-col items-center gap-3">
            <Info size={24} className="text-slate-400" />
            <div>
              <p className="caption">Khắc phục sự cố</p>
              <p className="text-lg font-bold">Đang kiểm tra kết nối...</p>
            </div>
          </div>
          <div className="glass p-6 rounded-3xl border-[var(--card-border)] flex flex-col items-center gap-3">
            <Phone size={24} className="text-[var(--primary)]" />
            <div>
              <p className="caption">Hỗ trợ khách hàng</p>
              <p className="text-lg font-bold">1900 6000</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {onRetry && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="glass-pill px-8 py-3.5 flex items-center gap-3 border-[var(--pill-border)] text-sm font-black uppercase tracking-wider transition-all duration-200 active:scale-95 hover:scale-105 cursor-pointer"
            >
              <RefreshCw size={16} className={retrying ? "animate-spin" : ""} />
              {retrying ? "ĐANG KẾT NỐI..." : "THỬ KẾT NỐI LẠI"}
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-8 flex flex-col items-center gap-2">
          <p className="caption">Mã thiết bị: {CHARGER_ID || "Chưa cấu hình"}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <p className="text-[10px] font-bold tracking-[0.2em] text-red-500/80 uppercase">
              NO SIGNAL — DISCONNECTED FROM NETWORK
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OfflineScreen;
