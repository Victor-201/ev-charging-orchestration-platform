/**
 * API Error Mapping Utilities
 *
 * Maps backend API error codes to localized translation resource paths.
 * Resolves fallback definitions for legacy or structurally unclassified payloads.
 */

import i18next from '../index';

export const mapApiError = (errorCode: string | undefined, defaultMessage?: string): string => {
  // Derives internal error classifications from message signatures when structural error codes are absent (legacy payload fallback).
  let effectiveCode = errorCode;
  if (!effectiveCode && typeof defaultMessage === 'string') {
    const lowerMsg = defaultMessage.toLowerCase();
    if (lowerMsg.includes('invalid email or password')) effectiveCode = 'INVALID_CREDENTIALS';
    if (lowerMsg.includes('user not found')) effectiveCode = 'INVALID_CREDENTIALS';
    if (lowerMsg.includes('unauthorized')) effectiveCode = 'UNAUTHORIZED';
  }

  if (!effectiveCode) return i18next.t('common:api_errors.UNKNOWN_ERROR');

  const key = `common:api_errors.${effectiveCode}`;
  const translated = i18next.t(key);

  if (translated === key) {
    return i18next.t('common:api_errors.UNKNOWN_ERROR');
  }

  return translated;
};
