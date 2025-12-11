import { useEffect } from 'react';

/**
 * Hook to register keyboard shortcuts
 * @param {string} key - Key combination (e.g., 'Ctrl+S', 'Escape', 'Enter')
 * @param {function} callback - Function to execute when shortcut is pressed
 * @param {array} deps - Dependencies array
 */
export const useKeyboardShortcut = (key, callback, deps = []) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle modifier keys
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      if (key.includes('+')) {
        const parts = key.split('+').map(p => p.trim().toLowerCase());
        
        // Check for Ctrl/Cmd modifier
        if (parts.includes('ctrl') || parts.includes('cmd')) {
          if (!isCtrlOrCmd) return;
          parts.splice(parts.indexOf('ctrl') !== -1 ? parts.indexOf('ctrl') : parts.indexOf('cmd'), 1);
        }

        // Check for Shift modifier
        if (parts.includes('shift')) {
          if (!isShift) return;
          parts.splice(parts.indexOf('shift'), 1);
        }

        // Check for Alt modifier
        if (parts.includes('alt')) {
          if (!isAlt) return;
          parts.splice(parts.indexOf('alt'), 1);
        }

        // Check the actual key
        const actualKey = parts[0];
        if (e.key.toLowerCase() === actualKey.toLowerCase()) {
          e.preventDefault();
          callback(e);
        }
      } else {
        // Simple key without modifiers
        if (e.key.toLowerCase() === key.toLowerCase()) {
          callback(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ...deps]);
};

export default useKeyboardShortcut;