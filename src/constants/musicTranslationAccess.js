/** Único integrante con acceso al módulo Traducción musical (tab `music_translation`). */
export const MUSIC_TRANSLATION_USER_ID = 2992019;

export function canAccessMusicTranslation(userId) {
  if (userId == null || userId === "") return false;
  return Number(userId) === MUSIC_TRANSLATION_USER_ID;
}
