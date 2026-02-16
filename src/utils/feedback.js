export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return fallback;
}

export function ensureSuccess(result, fallback = "Operation failed.") {
  if (result?.success === false) {
    throw new Error(getErrorMessage(result, fallback));
  }
  return result;
}

export function notifyError(error, fallback) {
  const message = getErrorMessage(error, fallback);
  window.alert(message);
}

export function notifySuccess(message) {
  if (message) window.alert(message);
}
