import toast from 'react-hot-toast'

/** Wrapper fin autour de react-hot-toast pour centraliser les messages de l'app. */
export function useToast() {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast(message),
  }
}
