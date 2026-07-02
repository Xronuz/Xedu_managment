import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { messagingApi, type Message } from '@/api/messaging';
import { useAuthStore } from '@/store/auth.store';
import { Text } from '@/components/text';
import { ListSkeleton } from '@/components/skeleton';
import { EmptyState } from '@/components/empty-state';
import { fonts, radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact, success } from '@/lib/haptics';

export default function ChatScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
  const myId = useAuthStore((s) => s.user?.id);

  const [text, setText] = useState('');

  // Animated value for send button
  const sendBtnAnim = useRef(new Animated.Value(0)).current;

  const query = useQuery<{ data: Message[] }>({
    queryKey: ['messaging', userId],
    queryFn: () => messagingApi.messages(userId),
    enabled: !!userId,
    refetchInterval: 15_000,
  });

  // Ochilganda o'qilgan deb belgilash
  useEffect(() => {
    if (!userId) return;
    messagingApi.markRead(userId).then(() => qc.invalidateQueries({ queryKey: ['messaging', 'conversations'] })).catch(() => {});
  }, [userId, qc]);

  // Animate send button when text changes
  useEffect(() => {
    const toValue = text.trim().length > 0 ? 1 : 0;
    Animated.timing(sendBtnAnim, {
      toValue,
      duration: anim.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [text, sendBtnAnim]);

  const sendBtnOpacity = sendBtnAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });
  const sendBtnScale = sendBtnAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => messagingApi.send(userId, content),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messaging', userId] });
      qc.invalidateQueries({ queryKey: ['messaging', 'conversations'] });
      success();
    },
  });

  function send() {
    const content = text.trim();
    if (content.length === 0 || sendMutation.isPending) return;
    impact('medium');
    sendMutation.mutate(content);
  }

  // Eng yangi pastda — inverted ro'yxat uchun teskari tartib
  const messages = [...(query.data?.data ?? [])].reverse();

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: name || t('messages.title') }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {query.isLoading ? (
          <ListSkeleton />
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState icon="chatbubbles-outline" title={t('messages.empty')} subtitle={t('messages.emptySub')} />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
            renderItem={({ item, index }) => {
              const mine = item.senderId === myId;
              return (
                <AnimatedMessageBubble
                  mine={mine}
                  isFirst={index === 0 || messages[index - 1]?.senderId !== item.senderId}
                >
                  <Text variant="body" style={{ color: mine ? theme.onPrimary : theme.text }}>
                    {item.content}
                  </Text>
                </AnimatedMessageBubble>
              );
            }}
          />
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.card,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('messages.typeMessage')}
            placeholderTextColor={theme.textMuted}
            multiline
            style={{
              flex: 1,
              maxHeight: 110,
              minHeight: 44,
              backgroundColor: theme.bg,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              color: theme.text,
              fontFamily: fonts.medium,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={send}
            disabled={text.trim().length === 0 || sendMutation.isPending}
          >
            <Animated.View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.pill,
                backgroundColor: text.trim().length > 0 ? theme.primary : theme.bgSubtle,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: sendBtnOpacity,
                transform: [{ scale: sendBtnScale }],
              }}
            >
              <Ionicons name="send" size={20} color={text.trim().length > 0 ? theme.onPrimary : theme.textMuted} />
            </Animated.View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Animated message bubble — spring paydo bo'lish. */
function AnimatedMessageBubble({ mine, isFirst, children }: { mine: boolean; isFirst: boolean; children: ReactNode }) {
  const { theme } = useTheme();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    scale.setValue(0);

    if (isFirst) {
      Animated.spring(scale, {
        toValue: 1,
        mass: 0.6,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scale, {
        toValue: 1,
        duration: anim.duration.instant,
        useNativeDriver: true,
      }).start();
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: isFirst ? anim.duration.fast : anim.duration.instant,
      useNativeDriver: true,
    }).start();
  }, [isFirst, opacity, scale]);

  return (
    <Animated.View
      style={[
        {
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
          backgroundColor: mine ? theme.primary : theme.card,
          borderWidth: mine ? 0 : 1,
          borderColor: theme.border,
          borderRadius: radius.lg,
          borderBottomRightRadius: mine ? 4 : radius.lg,
          borderBottomLeftRadius: mine ? radius.lg : 4,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
