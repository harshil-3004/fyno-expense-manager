import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import Button from './Button';

const ConfirmModal = ({ visible, title, message, onConfirm, onCancel, confirmText = 'Delete', cancelText = 'Cancel', danger = true }) => {
  const { colors, borderRadius, spacing, typography, fontSize } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius['2xl'],
              padding: spacing['2xl'],
              marginHorizontal: spacing['2xl'],
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontFamily: typography.h3.fontFamily,
                fontSize: fontSize.xl,
              },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
                fontFamily: typography.body.fontFamily,
                fontSize: fontSize.md,
                marginTop: spacing.sm,
                lineHeight: 22,
              },
            ]}
          >
            {message}
          </Text>
          <View style={[styles.actions, { marginTop: spacing.xl }]}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button title={cancelText} onPress={onCancel} variant="secondary" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Button
                title={confirmText}
                onPress={onConfirm}
                variant={danger ? 'danger' : 'primary'}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
});

export default ConfirmModal;
