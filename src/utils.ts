import getIsMobile from 'is-mobile'
import { nanoid } from 'nanoid'
import Toastify from 'toastify-js'

export const IS_MOBILE = getIsMobile()

export const SMALL_COUNTS = 66

export const enum ToastType {
  JOIN,
  QUIT
}

export const getUid = () => nanoid(16)

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

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const UNTOUCHABLE_FILTER = {
  group: -1,
  category: 2,
  mask: 0
}
