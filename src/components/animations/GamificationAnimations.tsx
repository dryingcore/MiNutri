import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const flamePaths = {
  red: "M 0 120 L 0 100 Q 10 100 22 30 Q 30 100 45 95 Q 55 95 62 10 Q 70 100 85 90 Q 95 90 105 40 Q 115 100 130 95 Q 140 95 150 20 Q 160 100 175 90 Q 185 90 195 100 Q 198 100 200 100 L 200 120 Z",
  orange: "M 0 120 L 0 100 Q 10 100 22 50 Q 30 105 45 100 Q 55 100 62 30 Q 70 105 85 95 Q 95 95 105 60 Q 115 105 130 100 Q 140 100 150 40 Q 160 105 175 95 Q 185 95 195 100 Q 198 100 200 100 L 200 120 Z",
  yellow: "M 0 120 L 0 100 Q 10 100 22 70 Q 30 110 45 105 Q 55 105 62 50 Q 70 110 85 100 Q 95 100 105 80 Q 115 110 130 105 Q 140 105 150 60 Q 160 110 175 100 Q 185 100 195 100 Q 198 100 200 100 L 200 120 Z"
};

const SeamlessFlame = ({ path, color, duration, translateY, baseScale, reverse, opacityBase = 1 }: any) => {
  const scaleY = useSharedValue(baseScale);
  const scaleX = useSharedValue(1);
  const skewX = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(opacityBase);

  useEffect(() => {
    // Fogo sobe rápido e desce mais leve
    scaleY.value = withRepeat(
      withSequence(
        withTiming(baseScale + 0.25, { duration: duration * 0.3, easing: Easing.out(Easing.ease) }),
        withTiming(baseScale - 0.1, { duration: duration * 0.35, easing: Easing.inOut(Easing.ease) }),
        withTiming(baseScale + 0.1, { duration: duration * 0.15, easing: Easing.out(Easing.ease) }),
        withTiming(baseScale, { duration: duration * 0.2, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    // Contração horizontal para acompanhar o esticamento vertical
    scaleX.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: duration * 0.3, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.05, { duration: duration * 0.7, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Vento/Tremor lateral
    skewX.value = withRepeat(
      withSequence(
        withTiming(reverse ? 8 : -8, { duration: duration * 0.25, easing: Easing.inOut(Easing.quad) }),
        withTiming(reverse ? -4 : 4, { duration: duration * 0.45, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: duration * 0.3, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Vibração horizontal sutil
    translateX.value = withRepeat(
      withSequence(
        withTiming(reverse ? 5 : -5, { duration: duration * 0.2, easing: Easing.linear }),
        withTiming(reverse ? -3 : 3, { duration: duration * 0.3, easing: Easing.linear }),
        withTiming(0, { duration: duration * 0.5, easing: Easing.linear })
      ),
      -1,
      true
    );

    // Tremeluzir de opacidade e brilho
    opacity.value = withRepeat(
      withSequence(
        withTiming(opacityBase, { duration: duration * 0.4 }),
        withTiming(opacityBase - 0.2, { duration: duration * 0.2 }),
        withTiming(opacityBase, { duration: duration * 0.4 })
      ),
      -1,
      true
    );
  }, [scaleY, scaleX, skewX, translateX, opacity, duration, reverse, baseScale, opacityBase]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scaleY: scaleY.value },
      { scaleX: scaleX.value },
      { skewX: `${skewX.value}deg` }
    ],
    transformOrigin: 'bottom',
  }));

  return (
    <Animated.View style={[{ position: 'absolute', bottom: translateY, width: '120%', left: '-10%', height: 70 }, animatedStyle]}>
      <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="none">
        <Path fill={color} d={path} />
      </Svg>
    </Animated.View>
  );
};

export const FireAnimation = () => {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFEDD5' }]}>
      <SeamlessFlame path={flamePaths.red} color="#EF4444" duration={2300} translateY={-10} baseScale={1} reverse={false} opacityBase={0.9} />
      <SeamlessFlame path={flamePaths.orange} color="#F97316" duration={2400} translateY={-15} baseScale={0.85} reverse={true} opacityBase={0.95} />
      <SeamlessFlame path={flamePaths.yellow} color="#FACC15" duration={2200} translateY={-20} baseScale={0.7} reverse={false} opacityBase={1} />
    </View>
  );
};

import { DeviceMotion } from 'expo-sensors';

export const LiquidAnimation = ({ percentage }: { percentage: number }) => {
  const rotation = useSharedValue(0);
  const deviceTilt = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  useEffect(() => {
    let subscription: any;
    const startSensors = async () => {
      const { status } = await DeviceMotion.requestPermissionsAsync();
      if (status === 'granted') {
        DeviceMotion.setUpdateInterval(30);
        subscription = DeviceMotion.addListener((motionData) => {
          if (motionData.rotation) {
            let gamma = motionData.rotation.gamma * (180 / Math.PI); 
            if (gamma > 45) gamma = 45;
            if (gamma < -45) gamma = -45;
            deviceTilt.value = withTiming(gamma, { duration: 150 }); 
          }
        });
      }
    };
    startSensors();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [deviceTilt]);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotation.value + 45}deg` }],
  }));

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${deviceTilt.value}deg` }],
  }));

  const containerHeight = 150; 
  const size = 600; // Onda gigante para cobrir bordas girando
  const waterLevelTranslate = useSharedValue(containerHeight); // Inicia vazio (empurrado para baixo)

  useEffect(() => {
    const clampedPct = Math.min(Math.max(percentage, 0), 100);
    // 0% -> TranslationY = containerHeight (totalmente fora)
    // 100% -> TranslationY = 0 (Totalmente até o topo)
    waterLevelTranslate.value = withTiming(
      interpolate(clampedPct, [0, 100], [containerHeight, 0]), 
      { duration: 800, easing: Easing.out(Easing.ease) }
    );
  }, [percentage, waterLevelTranslate]);

  const heightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: waterLevelTranslate.value }]
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* Wrapper do Giroscópio (pivô central inferior) */}
      <Animated.View style={[StyleSheet.absoluteFill, tiltStyle, { alignItems: 'center', justifyContent: 'flex-end' }]}>
        
        {/* Nível do Líquido que sobe e desce */}
        <Animated.View style={[
            { position: 'absolute', bottom: 0, width: '100%', height: containerHeight, alignItems: 'center' },
            heightStyle
        ]}>
            {/* Back wave */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: -size / 2, // Centro da onda alinhado com o topo do contêiner de preenchimento
                  width: size,
                  height: size,
                  borderRadius: size * 0.42,
                  backgroundColor: 'rgba(59, 130, 246, 0.3)',
                },
                animatedStyle2,
              ]}
            />

            {/* Front wave */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: -size / 2 + 10,
                  width: size,
                  height: size,
                  borderRadius: size * 0.4,
                  backgroundColor: '#93C5FD',
                },
                animatedStyle1,
              ]}
            />

            {/* Fundo de Água Sólido */}
            <View
              style={{
                position: 'absolute',
                top: 0, 
                width: size,
                height: size, 
                backgroundColor: '#93C5FD',
              }}
            />
        </Animated.View>

      </Animated.View>
    </View>
  );
};
