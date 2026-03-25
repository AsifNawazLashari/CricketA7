import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Radius } from '../constants/theme';

type ToastType = 'info' | 'success' | 'error';

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={[styles.toast, t.type === 'success' && styles.success, t.type === 'error' && styles.error]}>
            <Text style={styles.text}>{t.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: 'rgba(7,17,31,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,180,255,0.3)',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  success: {
    borderColor: 'rgba(0,255,136,0.4)',
    backgroundColor: 'rgba(0,40,20,0.95)',
  },
  error: {
    borderColor: 'rgba(255,71,87,0.4)',
    backgroundColor: 'rgba(40,0,0,0.95)',
  },
  text: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
