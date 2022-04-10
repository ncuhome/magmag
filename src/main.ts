import 'toastify-js/src/toastify.css'
import './main.less'

import { generateFromString } from './avatar'
import { Magmag } from './magmag'
import { getUid } from './utils'

// Game instances
const magmag = new Magmag()

const startBtn = document.querySelector<HTMLDivElement>('.start')
const avatarEle = document.querySelector<HTMLImageElement>('.avatar')

avatarEle.src = `data:image/svg+xml;utf8,${generateFromString(magmag.uid)}`

avatarEle.onclick = () => {
  magmag.uid = getUid()
  avatarEle.src = `data:image/svg+xml;utf8,${generateFromString(magmag.uid)}`
}

startBtn.addEventListener('click', () => {
  const modalEle = document.querySelector<HTMLDivElement>('.modal')
  modalEle.style.display = 'none'

  magmag.start()
})
