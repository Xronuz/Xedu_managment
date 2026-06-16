import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

/**
 * Brend shrifti (Manrope) yuklash. `[loaded, error]` qaytaradi —
 * xato bo'lsa ham ilova tizim shrifti bilan ishlayveradi (bloklanmaydi).
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  return loaded || !!error;
}
