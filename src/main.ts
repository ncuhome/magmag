import 'toastify-js/src/toastify.css'
import './main.less'

import { generateFromString } from './avatar'
import { Magmag } from './magmag'
import { getUid } from './utils'

// Game instances
const magmag = new Magmag()

const startBtn = document.querySelector<HTMLDivElement>('.start')
const avatarEle = document.querySelector<HTMLImageElement>('.avatar')
const modalEle = document.querySelector<HTMLDivElement>('.modal')

avatarEle.src = `data:image/svg+xml;utf8,${generateFromString(magmag.uid)}`

const start = () => {
  modalEle.style.display = 'none'
  magmag.start()
}

const stop = () => {
  modalEle.style.display = 'flex'
  magmag.stop()
}

window.onpopstate = function (e) {
  const pathname = e.target.location.pathname
  if (pathname === '/') {
    stop()
  } else if (pathname === '/game') {
    start()
  }
}

avatarEle.onclick = () => {
  magmag.uid = getUid()
  avatarEle.src = `data:image/svg+xml;utf8,${generateFromString(magmag.uid)}`
}

startBtn.addEventListener('click', () => {
  start()
  history.pushState(null, null, '/game')
})
