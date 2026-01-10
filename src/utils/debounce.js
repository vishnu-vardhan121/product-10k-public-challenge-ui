/**
 * Debounce utility function
 * Delays the execution of a function until after a specified delay
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeoutId);
      func(...args);
    };
    clearTimeout(timeoutId);
    timeoutId = setTimeout(later, delay);
  };
};

