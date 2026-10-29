// The one place that persists the chosen language on the person's profile. It is a no-op until the account system
// (Supabase profiles.language) is connected; the language itself is already saved in the browser by setLanguage().
let saver = null;
export const registerProfileLanguageSaver = (fn) => { saver = fn; };
export async function saveProfileLanguage(code) {
  if (!saver) return false;
  await saver(code);
  return true;
}
