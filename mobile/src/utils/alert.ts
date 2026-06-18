import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    const fullMsg = message ? `${title}\n\n${message}` : title;
    
    if (!buttons || buttons.length === 0) {
      window.alert(fullMsg);
    } else if (buttons.length === 1) {
      window.alert(fullMsg);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      // Multi-button dialogue (e.g. Confirm Delete, Confirm Logout)
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      const actionBtn = buttons.find((b) => b.style !== 'cancel');
      
      const confirmText = cancelBtn 
        ? `${fullMsg}\n\nClick OK to ${actionBtn?.text ?? 'proceed'}, Cancel to ${cancelBtn.text ?? 'cancel'}`
        : fullMsg;
        
      const result = window.confirm(confirmText);
      if (result) {
        if (actionBtn && actionBtn.onPress) {
          actionBtn.onPress();
        }
      } else {
        if (cancelBtn && cancelBtn.onPress) {
          cancelBtn.onPress();
        }
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
