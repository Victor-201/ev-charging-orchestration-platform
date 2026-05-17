/**
 * Localization Formatting Utilities
 *
 * Formats numeric metrics, currencies, times, and relative date differences
 * conforming to the active UI internationalization locale context.
 */

import i18next from '../index';

export const formatCurrency = (amount: number): string => {
  const lng = i18next.language || 'vi';
  
  if (lng === 'en') {
    // Enforces English currency formatting for VND to maintain consistent numeric symbols for international users.
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(amount);
  }

  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatNumberLocale = (n: number): string => {
  const lng = i18next.language || 'vi';
  return new Intl.NumberFormat(lng === 'en' ? 'en-US' : 'vi-VN').format(n);
};

export const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
  const lng = i18next.language || 'vi';
  return new Date(dateStr).toLocaleString(lng === 'en' ? 'en-US' : 'vi-VN', options);
};

export const relativeTimeLocale = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const lng = i18next.language || 'vi';

  if (lng === 'en') {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (seconds < 60) return `${seconds}s trước`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h trước`;
  return `${Math.floor(seconds / 86400)}d trước`;
};
