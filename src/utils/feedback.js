import Swal from "sweetalert2";
import { toast } from "react-toastify";

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
  toast.error(message, { autoClose: 3500 });
}

export function notifySuccess(message) {
  if (message) toast.success(message, { autoClose: 2500 });
}

export function notifyInfo(message) {
  if (message) toast.info(message, { autoClose: 2500 });
}

export async function confirmAction({
  title = "Are you sure?",
  text = "This action cannot be undone.",
  confirmButtonText = "Yes",
  cancelButtonText = "Cancel",
  icon = "warning",
} = {}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
    heightAuto: false,
  });
  return !!result.isConfirmed;
}
