import Toastify from 'toastify-js'

export const SMALL_COUNTS = 100

export const enum ToastType {
  JOIN,
  QUIT
}

const toastTypeStyleMap = {
  [ToastType.JOIN]: {
    boxShadow: '0 3px 6px -1px rgba(0, 0, 0, 0.12), 0 10px 36px -4px rgba(255, 130, 58, 0.3)',
    background: '#FF823A'
  },
  [ToastType.QUIT]: {
    boxShadow: '0 3px 6px -1px rgba(0, 0, 0, 0.12), 0 10px 36px -4px rgba(240, 65, 85, 0.3)',
    background: '#F04155'
  }
}

export const toast = (text: string, type: ToastType) => {
  Toastify({
    text,
    duration: 3000,
    gravity: 'top',
    position: 'center',
    style: toastTypeStyleMap[type]
  })
    .showToast()
}
