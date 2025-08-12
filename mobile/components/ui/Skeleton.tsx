import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

interface SkeletonProps {
  width?: string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width, height = 20, borderRadius = 4, className = '' }: SkeletonProps) {
  const animatedOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedOpacity]);

  // Build the width class
  const widthClass = width ? `w-[${width}]` : 'w-full';

  // Build the height style (since arbitrary values work better for height)
  const heightStyle = { height };

  // Build the border radius style
  const borderRadiusStyle = { borderRadius };

  return (
    <View
      className={`${widthClass} overflow-hidden ${className}`}
      style={[heightStyle, borderRadiusStyle]}
    >
      <Animated.View
        style={{
          flex: 1,
          opacity: animatedOpacity,
        }}
        className="bg-muted"
      />
    </View>
  );
}
