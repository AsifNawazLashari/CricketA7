import React, { useEffect, useRef, ReactNode } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Dimensions, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: number;
}

const { height: SCREEN_H } = Dimensions.get('window');

export function BottomSheet({ visible, onClose, title, children, maxHeight = SCREEN_H * 0.88 }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(maxHeight)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: maxHeight,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[s.sheet, { maxHeight, transform: [{ translateY }] }]}>
              {/* Handle */}
              <View style={s.handle} />
              {/* Header */}
              {title && (
                <View style={s.header}>
                  <Text style={s.title}>{title}</Text>
                  <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                    <Text style={s.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Body */}
              <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(7,17,31,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(0,180,255,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 20 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,180,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,180,255,0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cyan,
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: Colors.muted,
    fontSize: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
});
