import { Redirect } from 'expo-router';

// Boshlang'ich marshrut — haqiqiy yo'naltirish _layout dagi useProtectedRoute'da.
export default function Index() {
  return <Redirect href="/(app)" />;
}
