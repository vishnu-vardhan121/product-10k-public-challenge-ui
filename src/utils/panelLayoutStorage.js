/**
 * Utility functions for persisting resizable panel layouts
 */

const LAYOUT_STORAGE_KEY = 'public_challenge_panel_layouts';

/**
 * Get stored layout for a specific panel group
 * @param {string} groupId - Unique identifier for the panel group (e.g., 'coding-problems')
 * @returns {Object|null} - Layout object or null if not found
 */
export const getStoredLayout = (groupId) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    const layouts = stored ? JSON.parse(stored) : {};
    return layouts[groupId] || null;
  } catch (error) {
    console.error('Failed to read panel layout from storage:', error);
    return null;
  }
};

/**
 * Store layout for a panel group
 * @param {string} groupId - Unique identifier for the panel group
 * @param {Object} layout - Layout object from PanelGroup
 */
export const storeLayout = (groupId, layout) => {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    const layouts = stored ? JSON.parse(stored) : {};
    layouts[groupId] = layout;
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
  } catch (error) {
    console.error('Failed to store panel layout:', error);
  }
};

/**
 * Create a storage adapter for react-resizable-panels
 * @param {string} groupId - Unique identifier for the panel group
 * @returns {Object} - Storage adapter with getItem and setItem methods
 */
export const createPanelStorage = (groupId) => {
  return {
    getItem: () => {
      const layout = getStoredLayout(groupId);
      return layout ? JSON.stringify(layout) : null;
    },
    setItem: (key, value) => {
      try {
        const layout = JSON.parse(value);
        storeLayout(groupId, layout);
      } catch (error) {
        console.error('Failed to parse layout value:', error);
      }
    },
  };
};

