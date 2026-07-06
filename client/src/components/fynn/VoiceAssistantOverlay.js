import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import VoiceService from '../../services/VoiceService';

/**
 * Voice Assistant Overlay
 * State manager for Idle, Listening, Processing, and Speaking states.
 * Fully animated central visualizer orb with ripple rings.
 */
const VoiceAssistantOverlay = ({
  visible,
  onClose,
  onSendVoiceMessage, // function (voiceText, requestId) => Promise<apiResult>
}) => {
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [displayText, setDisplayText] = useState('How can I help you?');
  const [transcribedInput, setTranscribedInput] = useState('');

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim1 = useRef(new Animated.Value(0)).current;
  const rippleAnim2 = useRef(new Animated.Value(0)).current;

  // Active request ID tracking for dialogue turns
  const currentRequestId = useRef('');

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[VoiceAssistantOverlay] App minimized. Cleaning up speech resources.');
        cleanupFlow();
        onClose();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      startListeningFlow();
    } else {
      cleanupFlow();
    }
    return () => cleanupFlow();
  }, [visible]);

  // Handle visualizer pulse animation
  useEffect(() => {
    let animation;
    if (voiceState === 'listening' || voiceState === 'speaking') {
      pulseAnim.setValue(1);
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: voiceState === 'listening' ? 1.25 : 1.15,
            duration: voiceState === 'listening' ? 700 : 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: voiceState === 'listening' ? 700 : 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [voiceState]);

  // Handle Processing state rotation animation
  useEffect(() => {
    let animation;
    if (voiceState === 'processing') {
      rotateAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      rotateAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [voiceState]);

  // Handle Speaking state ripple effect rings
  useEffect(() => {
    let animation;
    if (voiceState === 'speaking' || voiceState === 'listening') {
      const runRipple = () => {
        rippleAnim1.setValue(0);
        rippleAnim2.setValue(0);
        animation = Animated.loop(
          Animated.parallel([
            Animated.timing(rippleAnim1, {
              toValue: 1,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(900),
              Animated.timing(rippleAnim2, {
                toValue: 1,
                duration: 1800,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ])
        );
        animation.start();
      };
      runRipple();
    } else {
      rippleAnim1.setValue(0);
      rippleAnim2.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [voiceState]);

  const generateUUID = () => {
    return 'voice-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const startListeningFlow = () => {
    setTranscribedInput('');
    setDisplayText('Listening...');
    setVoiceState('listening');

    VoiceService.startListening(
      async (text) => {
        if (!text || text.trim() === '') {
          setDisplayText("I didn't catch that. Please try again.");
          setVoiceState('idle');
          return;
        }
        setTranscribedInput(text);
        await processUserVoice(text);
      },
      (error) => {
        console.error('[VoiceAssistantOverlay] STT Error:', error);
        setDisplayText('Error listening. Tap mic to retry.');
        setVoiceState('idle');
      },
      (state) => {
        if (state === 'idle' && voiceState === 'listening') {
          // Stopped listening without triggering result callback
          setVoiceState('idle');
        }
      },
      (partialText, isWaiting) => {
        if (partialText) {
          setTranscribedInput(partialText);
        }
        if (isWaiting) {
          setDisplayText('Waiting for you to finish...');
        } else {
          setDisplayText('Listening...');
        }
      }
    );
  };

  const processUserVoice = async (text) => {
    setVoiceState('processing');
    setDisplayText('Thinking...');

    currentRequestId.current = generateUUID();

    try {
      // Dispatch API request using unique ID
      const result = await onSendVoiceMessage(text, currentRequestId.current);

      if (result && result.response) {
        setDisplayText(result.response);
        
        // Strip emojis (surrogate pairs and dingbats) to prevent TTS from pronouncing them
        const cleanSpeechText = result.response
          .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
          .replace(/[\u2600-\u27BF]/g, '')
          .trim();

        // Play response using TTS
        VoiceService.speak(
          cleanSpeechText,
          () => {
            setVoiceState('speaking');
          },
          () => {
            // Chain the mic back on for continuous long conversations!
            setTimeout(() => {
              startListeningFlow();
            }, 600);
          },
          (ttsErr) => {
            console.error('[VoiceAssistantOverlay] TTS play failed:', ttsErr);
            cleanupFlow();
            onClose();
          }
        );
      } else {
        setDisplayText('No response from Fyno.');
        setVoiceState('idle');
      }
    } catch (err) {
      console.error('[VoiceAssistantOverlay] Processing failed:', err);
      setDisplayText('Failed to reach Fyno. Tap to retry.');
      setVoiceState('idle');
    }
  };

  const cleanupFlow = () => {
    VoiceService.stopListening();
    VoiceService.cancelSpeech();
    setVoiceState('idle');
    setDisplayText('How can I help you?');
    setTranscribedInput('');
  };

  const handleInterrupt = () => {
    cleanupFlow();
    onClose();
  };

  const handleOrbPress = () => {
    if (voiceState === 'speaking') {
      // Tap to interrupt
      handleInterrupt();
    } else if (voiceState === 'idle') {
      startListeningFlow();
    } else if (voiceState === 'listening') {
      VoiceService.finalizeListening();
    }
  };

  const rotationAngle = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rippleScale1 = rippleAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const rippleOpacity1 = rippleAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  const rippleScale2 = rippleAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const rippleOpacity2 = rippleAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  // Dynamic visual styles based on voice state
  let orbBgColor = '#6200EE';
  let orbGlowColor = 'rgba(98, 0, 238, 0.4)';
  let hintText = 'Tap to close';

  if (voiceState === 'listening') {
    orbBgColor = '#00E676';
    orbGlowColor = 'rgba(0, 230, 118, 0.4)';
    hintText = 'Listening... Tap orb to cancel';
  } else if (voiceState === 'processing') {
    orbBgColor = '#FF9100';
    orbGlowColor = 'rgba(255, 145, 0, 0.4)';
    hintText = 'Fyno is thinking...';
  } else if (voiceState === 'speaking') {
    orbBgColor = '#29B6F6';
    orbGlowColor = 'rgba(41, 182, 246, 0.4)';
    hintText = 'Speaking... Tap anywhere to interrupt';
  }

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleInterrupt}
    >
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={handleInterrupt}
      >
        <View style={styles.blurContainer}>
          <Text style={styles.stateLabel}>
            {voiceState.toUpperCase()}
          </Text>

          {/* Visualization Container */}
          <View style={styles.visualizerContainer}>
            {/* Pulsing Concentric Rings */}
            {(voiceState === 'speaking' || voiceState === 'listening') && (
              <>
                <Animated.View
                  style={[
                    styles.rippleRing,
                    {
                      borderColor: orbBgColor,
                      transform: [{ scale: rippleScale1 }],
                      opacity: rippleOpacity1,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.rippleRing,
                    {
                      borderColor: orbBgColor,
                      transform: [{ scale: rippleScale2 }],
                      opacity: rippleOpacity2,
                    },
                  ]}
                />
              </>
            )}

            {/* Main Interactive Orb */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOrbPress}
              style={styles.orbButton}
            >
              <Animated.View
                style={[
                  styles.orb,
                  {
                    backgroundColor: orbBgColor,
                    shadowColor: orbBgColor,
                    transform: [
                      { scale: pulseAnim },
                      { rotate: voiceState === 'processing' ? rotationAngle : '0deg' },
                    ],
                  },
                ]}
              >
                {voiceState === 'processing' && (
                  <View style={styles.spinnerGap} />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Spoken / Transcribed Text Display */}
          <View style={styles.textOutputContainer}>
            {transcribedInput.length > 0 && (
              <Text style={styles.transcribedText} numberOfLines={2}>
                "{transcribedInput}"
              </Text>
            )}
            <Text style={styles.assistantResponseText}>
              {displayText}
            </Text>
          </View>

          {/* Hint Overlay */}
          <Text style={styles.hintText}>{hintText}</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 14, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    width: '90%',
    padding: 30,
    alignItems: 'center',
    borderRadius: 24,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#8E8E93',
    marginBottom: 40,
  },
  visualizerContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  orbButton: {
    zIndex: 10,
  },
  orb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  rippleRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  spinnerGap: {
    position: 'absolute',
    top: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  textOutputContainer: {
    width: '100%',
    alignItems: 'center',
    minHeight: 120,
    paddingHorizontal: 10,
  },
  transcribedText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#AEAEB2',
    textAlign: 'center',
    marginBottom: 12,
  },
  assistantResponseText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
  },
  hintText: {
    fontSize: 12,
    color: '#636366',
    marginTop: 40,
  },
});

export default VoiceAssistantOverlay;
