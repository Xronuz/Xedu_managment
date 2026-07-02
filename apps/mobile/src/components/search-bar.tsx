import { useState, useRef } from 'react';
import { Pressable, TextInput, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, type, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColorAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderColorAnim, {
      toValue: 1,
      duration: anim.duration.fast,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderColorAnim, {
      toValue: 0,
      duration: anim.duration.normal,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View
      style={{
        borderWidth: 1.5,
        borderRadius: radius.md,
        borderColor: borderColorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [theme.border, theme.primary],
        }),
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: focused ? 8 : 0,
        shadowOpacity: focused ? 0.08 : 0,
        elevation: focused ? 2 : 0,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: theme.card,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          height: 46,
        }}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={focused ? theme.primary : theme.textMuted}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ flex: 1, color: theme.text, ...type.body }}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: theme.bgSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={12} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
