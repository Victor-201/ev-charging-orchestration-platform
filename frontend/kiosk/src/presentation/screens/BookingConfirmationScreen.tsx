/**
 * EVOLTTOUCH Kiosk — Booking Confirmation Screen (Hard Lock)
 * 
 * Shown when a charger is in 'reserved' state (within 10 minutes of booking).
 * Walk-ins are locked out. Only the booking owner can scan the QR to begin.
 */

import React from "react";
import { motion } from "framer-motion";
import { Zap, Calendar, QrCode, Clock, ArrowLeft, ShieldAlert } from "lucide-react";
import { CHARGER_ID } from "../../data/sources/localStorage";

interface BookingConfirmationScreenProps {
  onCancel: () => void;
  bookingId?: string;
  bookingTimeRange?: string; // e.g. "10:30 — 11:00"
}

const BookingConfirmationScreen: React.FC<BookingConfirmationScreenProps> = ({ 
  onCancel,
  bookingId = "B-9842",
  bookingTimeRange = "Hôm nay, 10:30 — 11:00"
}) => {
  return (
    <motion.div
      key="booking-confirm"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex-1 flex flex-col h-full relative p-10"
    >
      {/* ── Ambient Glow BG ── */}
      <div className="ambient-glow bg-[var(--warning)] opacity-[0.08] w-[60%] h-[60%] top-[-10%] right-[-10%] blur-[130px]" />
      <div className="ambient-glow bg-[var(--primary)] opacity-[0.05] w-[40%] h-[40%] bottom-[-5%] left-[-5%] blur-[100px]" />
      <div className="grid-overlay opacity-30" />

      {/* ── Header ── */}
      <header className="relative z-10 flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 glass rounded-[20px] flex items-center justify-center border-[var(--card-border)] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Calendar size={26} className="text-[var(--warning)]" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-[var(--warning)]">
              Cổng Sạc Đã Giữ Chỗ
            </h1>
            <p className="caption">Reserved Charger Gate</p>
          </div>
        </div>

        <button 
          onClick={onCancel}
          className="glass-pill px-6 py-3.5 flex items-center gap-3 border-[var(--pill-border)] text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 hover:scale-105 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>QUAY LẠI</span>
        </button>
      </header>

      {/* ── Main Content ── */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-12 items-center">
        
        {/* Left: Booking Details */}
        <div className="col-span-5 flex flex-col space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[var(--warning)] font-black text-xs uppercase tracking-wider">
              <ShieldAlert size={14} />
              Chế độ khóa cứng (10 phút)
            </div>
            <h2 className="text-[52px] font-black leading-[1.05] tracking-tight">
              Giữ Trạm <br /> 
              <span className="text-[var(--warning)]">Đã Đặt Trước</span>
            </h2>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed font-medium">
              Cổng sạc này hiện đang được giữ chỗ cố định cho khách hàng đã đặt lịch trên ứng dụng EVOLT. Walk-in tạm thời bị khóa.
            </p>
          </div>

          <div className="glass p-8 rounded-[32px] border-[var(--card-border)] space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'var(--sq-shine)' }} />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-[18px] bg-[var(--warning)]/15 border border-[var(--warning)]/20 flex items-center justify-center">
                <Clock size={22} className="text-[var(--warning)]" />
              </div>
              <div>
                <p className="caption">Khung giờ đặt trước</p>
                <p className="text-xl font-black text-[var(--text-primary)]">{bookingTimeRange}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 border-t border-[var(--card-border)] pt-6 relative z-10">
              <div className="w-12 h-12 rounded-[18px] bg-[var(--primary)]/15 border border-[var(--primary)]/20 flex items-center justify-center">
                <Zap size={22} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="caption">Mã đặt chỗ (Booking ID)</p>
                <p className="text-xl font-black text-[var(--text-primary)] font-mono tracking-wider">{bookingId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: QR Scan Area */}
        <div className="col-span-7 flex items-center justify-center">
          <div className="relative">
            {/* Animated scan corners */}
            <div className="absolute -top-5 -left-5 w-14 h-14 border-t-[3.5px] border-l-[3.5px] border-[var(--warning)] rounded-tl-2xl z-20" />
            <div className="absolute -top-5 -right-5 w-14 h-14 border-t-[3.5px] border-r-[3.5px] border-[var(--warning)] rounded-tr-2xl z-20" />
            <div className="absolute -bottom-5 -left-5 w-14 h-14 border-b-[3.5px] border-l-[3.5px] border-[var(--warning)] rounded-bl-2xl z-20" />
            <div className="absolute -bottom-5 -right-5 w-14 h-14 border-b-[3.5px] border-r-[3.5px] border-[var(--warning)] rounded-br-2xl z-20" />

            <div 
              className="p-10 rounded-[48px] border-[1.5px] border-[var(--card-border)] relative overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                backdropFilter: 'blur(60px)',
                WebkitBackdropFilter: 'blur(60px)',
                boxShadow: 'var(--card-shadow), 0 20px 50px rgba(245,158,11,0.12)',
              }}
            >
              <div className="absolute inset-0" style={{ background: 'var(--sq-shine)' }} />
              
              {/* Actual QR Container */}
              <div className="w-64 h-64 bg-white rounded-3xl flex items-center justify-center relative overflow-hidden p-4 shadow-inner">
                <QrCode size={220} className="text-slate-900" />
                {/* Moving scan line */}
                <motion.div 
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-1 bg-[var(--warning)] shadow-[0_0_15px_var(--warning)] z-20"
                />
              </div>
            </div>
            
            <div className="mt-10 text-center space-y-3">
              <p className="text-2xl font-black tracking-wide uppercase">QUÉT ĐỂ NHẬN TRẠM</p>
              <p className="caption max-w-[340px] mx-auto text-center leading-relaxed">
                Quý khách vui lòng mở ứng dụng <span className="text-[var(--warning)] font-bold">EVOLT</span> và quét mã QR trên để xác thực quyền chủ xe và bắt đầu phiên sạc.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="relative z-10 mt-auto border-t border-[var(--card-border)] pt-8 flex justify-between items-center">
        <div>
          <p className="caption mb-1">Trạng thái cổng sạc</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] animate-pulse" />
            <p className="text-xs font-black uppercase tracking-wider text-[var(--warning)]">
              RESERVED — ĐANG KHOÁ CỨNG
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="caption mb-1">Thiết bị</p>
          <p className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">{CHARGER_ID || "Chưa cấu hình"}</p>
        </div>
      </footer>
    </motion.div>
  );
};

export default BookingConfirmationScreen;
