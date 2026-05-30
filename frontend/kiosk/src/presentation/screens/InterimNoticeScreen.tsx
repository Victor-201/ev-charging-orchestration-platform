/**
 * EVOLTTOUCH Kiosk — Interim Charging Notice Screen (Soft Lock)
 * 
 * Shown when a walk-in user wants to charge but a booking is scheduled within 2 hours.
 * Prompts the user with remaining time n and forced shutoff disclaimer.
 */

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Zap, ArrowRight, X } from "lucide-react";

interface InterimNoticeScreenProps {
  onConfirm: () => void;
  onCancel: () => void;
  bookingTime?: string;       // e.g. "11:30"
  remainingMinutes?: number;   // e.g. 45
}

const InterimNoticeScreen: React.FC<InterimNoticeScreenProps> = ({
  onConfirm,
  onCancel,
  bookingTime = "11:30",
  remainingMinutes = 45
}) => {
  // Let's compute the force stop time based on booking time (no early stop, stops exactly at booking time)
  const stopTimeStr = bookingTime;

  return (
    <motion.div
      key="interim-notice"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex-1 flex items-center justify-center relative p-16"
    >
      {/* ── Ambient Glow BG ── */}
      <div className="ambient-glow bg-[var(--warning)] opacity-[0.08] w-[50%] h-[50%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[120px]" />
      <div className="grid-overlay opacity-30" />

      <div 
        className="max-w-4xl w-full rounded-[48px] overflow-hidden relative z-10 flex flex-col border border-[var(--card-border)]"
        style={{ 
          background: 'var(--card-bg)',
          backdropFilter: 'blur(60px)',
          WebkitBackdropFilter: 'blur(60px)',
          boxShadow: 'var(--card-shadow), 0 25px 60px rgba(245,158,11,0.1)' 
        }}
      >
        <div className="absolute inset-0" style={{ background: 'var(--sq-shine)' }} />
        
        {/* Header */}
        <div className="bg-[var(--warning)]/10 px-12 py-8 flex items-center gap-6 border-b border-[var(--card-border)] relative z-10">
          <div className="w-16 h-16 rounded-full bg-[var(--warning)] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.35)]">
            <AlertTriangle size={32} className="text-black" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Quy Định Giới Hạn Phiên</h2>
            <p className="caption !text-[var(--warning)] font-bold tracking-widest uppercase">Trụ sạc có lịch đặt trước</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-12 py-10 space-y-8 relative z-10">
          <div className="space-y-4">
            <p className="text-2xl leading-relaxed font-bold" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
              Trụ sạc này đã có lịch đặt trước từ một người dùng khác vào lúc <span className="text-[var(--warning)] font-black">{bookingTime}</span>.
            </p>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed font-medium">
              Bạn vẫn có thể tiếp tục sạc walk-in ngay bây giờ. Tuy nhiên, hệ thống sẽ <span className="font-bold text-red-500">cưỡng bức ngắt sạc tự động</span> đúng vào lúc <span className="font-bold text-[var(--warning)]">{stopTimeStr}</span> để bàn giao trụ sạc cho chủ lịch hẹn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div 
              className="p-6 rounded-3xl border flex items-center gap-5 relative overflow-hidden"
              style={{
                background: 'var(--pill-bg)',
                borderColor: 'var(--pill-border)',
                boxShadow: 'var(--pill-shadow)',
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--warning)]/15 border border-[var(--warning)]/20 flex items-center justify-center">
                <Clock className="text-[var(--warning)]" size={24} />
              </div>
              <div>
                <p className="caption">Thời gian sạc tối đa</p>
                <p className="text-2xl font-black text-[var(--text-primary)]">~ {remainingMinutes} phút</p>
              </div>
            </div>
            
            <div 
              className="p-6 rounded-3xl border flex items-center gap-5 relative overflow-hidden"
              style={{
                background: 'var(--pill-bg)',
                borderColor: 'var(--pill-border)',
                boxShadow: 'var(--pill-shadow)',
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/15 border border-[var(--primary)]/20 flex items-center justify-center">
                <Zap className="text-[var(--primary)]" size={24} />
              </div>
              <div>
                <p className="caption">Cơ chế bảo vệ đặt trạm</p>
                <p className="text-2xl font-black text-[var(--text-primary)]">Tự động ngắt sạc</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-12 py-8 bg-black/10 dark:bg-white/5 flex gap-6 border-t border-[var(--card-border)] relative z-10">
          <button 
            onClick={onCancel}
            className="flex-1 py-4.5 rounded-2xl border border-[var(--card-border)] hover:bg-black/10 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider cursor-pointer text-[var(--text-primary)]"
          >
            <X size={18} />
            HỦY BỎ
          </button>
          <button 
            onClick={onConfirm}
            className="flex-[2] py-4.5 rounded-2xl bg-[var(--warning)] hover:bg-[var(--warning)]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm font-black text-black shadow-[0_8px_25px_rgba(245,158,11,0.25)] cursor-pointer tracking-wider"
          >
            ĐỒNG Ý & BẮT ĐẦU SẠC
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default InterimNoticeScreen;
