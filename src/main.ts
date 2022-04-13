/* eslint-disable no-empty-pattern */
import 'toastify-js/src/toastify.css'
import './main.less'

import { Component, html, render } from 'htm/preact'

import { generateFromString } from './avatar'
import { Magmag } from './magmag'
import { getUid } from './utils'

const magmag = new Magmag()

class Modal extends Component {
  state = {
    start: false,
    avatar: `data:image/svg+xml;utf8,${generateFromString(magmag.uid)}`
  }

  componentDidMount() {
    window.onpopstate = (e) => {
      const pathname = e.target.location.pathname
      if (pathname === '/') {
        this.toMenu()
      } else if (pathname === '/game') {
        this.toGame(false)
      }
    }
  }

  changeAvatar = () => {
    magmag.uid = getUid()
    this.setState({
      avatar: `data:image/svg+xml;utf8,${generateFromString(magmag.uid)}`
    })
  }

  toGame = (pushState = true) => {
    this.setState({
      start: true
    })
    magmag.start()
    if (pushState) {
      history.pushState(null, null, '/game')
    }
  }

  toMenu = () => {
    this.setState({
      start: false
    })
    magmag.stop()
  }

  render({ }, { avatar, start }) {
    return html`
    <div class="modal" style="display: ${start ? 'none' : 'flex'}">
      <div class="avatar-container">
        <img class="avatar" alt="avatar" src="${avatar}" onClick=${this.changeAvatar}/>
        <p class="footnote">点击图片可换脸</p>
      </div>
      <span class="start" onClick=${this.toGame}>开始游戏</span>
    </div>
    `
  }
}

render(html`<${Modal} page="All" />`, document.querySelector('.root'))
