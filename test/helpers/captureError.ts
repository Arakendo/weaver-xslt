export function captureError(action: () => void): unknown {
  try {
    action();
    throw new Error('Expected the action to throw.');
  } catch (error) {
    return error;
  }
}