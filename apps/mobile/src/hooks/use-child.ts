import { useLocalSearchParams } from 'expo-router';

/** Child-detail marshrutlaridan studentId va ismni o'qish. */
export function useChildParams() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  return { id: params.id, name: params.name ?? '' };
}
