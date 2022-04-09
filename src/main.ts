import 'toastify-js/src/toastify.css'
import './main.less'

import { debounce, throttle } from 'lodash-es'
import MatterAttractors from 'matter-attractors'
import Matter, { Bodies, Body, Common, Engine, Events, IMousePoint, Mouse, Render as MatterRender, Runner, SAT, Vector, World } from 'matter-js'
import nipple from 'nipplejs'

import { bgSound } from './audio'
import { generateFromString } from './avatar'
import { Render } from './render'
import { getUid, IS_MOBILE, SMALL_COUNTS, toast, ToastType } from './utils'
import { awareness } from './y'
Matter.use(MatterAttractors)

interface Text {
  content: string,
  color: string,
  size: number,
  family: string,
}

type Id = number

interface PlayerObj {
  body: Body
  id: Id
}
interface StateChanged {
  added: Id[]
  removed: Id[]
  updated: Id[]
}

const init = () => {
  bgSound.play()

  if (IS_MOBILE) {
    nipple.create({
      color: 'white'
    })
  }
}

const debouncedScale = debounce((body: Body, x: number, y: number) => {
  Body.scale(body, x, y)
}, 1000)

const bodyScale = (body: Body, scaleDelta: number) => {
  const { sprite } = body.render
  sprite.xScale += scaleDelta
  sprite.yScale += scaleDelta
  debouncedScale(body, sprite.xScale, sprite.yScale)
}

const untouchFilter = {
  group: -1,
  category: 2,
  mask: 0
}
const playerObjs: PlayerObj[] = []
let uid = getUid()
let scoreText: Body
let score = 0
let showScore = false

let smallCounts = 0

window.onbeforeunload = function () {
  awareness.setLocalState(null)
}

window.addEventListener('unload', () => {
  awareness.setLocalState(null)
})

const addUI = (render: MatterRender, world: World) => {
  scoreText = Bodies.rectangle(render.options.width / 2, render.options.height / 2, 100, 100, {
    collisionFilter: untouchFilter,
    render: {
      fillStyle: 'transparent',
      // @ts-ignore
      text: {
        content: ' Run !',
        color: 'rgba(255, 255, 255, 0.1)',
        size: 128
      }
    }
  })

  World.add(world, scoreText)
}

const addBGText = (render: MatterRender, world: World) => {
  const { width, height } = render.options
  const text = Bodies.rectangle(width / 2, 64, 100, 100, {
    collisionFilter: untouchFilter,
    render: {
      fillStyle: 'transparent',
      // @ts-ignore
      text: {
        content: 'BGM: Esse by Xylo-Ziko',
        color: 'rgba(255, 255, 255, 0.05)',
        size: 24
      }
    }
  })

  const text1 = Bodies.rectangle(width / 2, height - 64, 100, 100, {
    collisionFilter: untouchFilter,
    render: {
      fillStyle: 'transparent',
      // @ts-ignore
      text: {
        content: 'Made by NCUHOME',
        color: 'rgba(255, 255, 255, 0.05)',
        size: 24
      }
    }
  })

  World.add(world, [text, text1])
}

const createBall = (world: World, x: number, y: number, id: string, opacity = 1.0, radius = 40) => {
  const throttleRecover = throttle((body: Body) => {
    bodyScale(body, 0.01)
  }, 200)
  return Bodies.circle(x, y, radius, {
    render: {
      // @ts-ignore
      sprite: {
        texture: `data:image/svg+xml;utf8,${generateFromString(id)}`
      },
      opacity
    },
    plugin: {
      attractors: [
        (bodyA: Body, bodyB: Body) => {
          if (world) {
            if (SAT.collides(bodyA, bodyB).collided) {
              if (bodyA.render.sprite.xScale > 0.2) {
                bodyScale(bodyA, -0.001)
              }
              if (bodyB.render.sprite.xScale < 3) {
                bodyScale(bodyB, 0.01)
              }
              return null
            } else {
              if (bodyA.render.sprite.xScale < 1) {
                throttleRecover(bodyA)
              }
            }
          }
          const scale = bodyB.render.sprite.xScale
          const extraFactor = (1 + Math.log(score + 1) / 10)
          return {
            x: (bodyA.position.x - bodyB.position.x) * (1e-7) * scale * extraFactor,
            y: (bodyA.position.y - bodyB.position.y) * (1e-7) * scale * extraFactor
          }

          // Body.applyForce(bodyA, bodyA.position, Matter.Vector.neg(force))
          // Body.applyForce(bodyB, bodyB.position, force)
        }
      ]
    }
  })
}

const addSmallBalls = async (render: MatterRender, world: World, count: number) => {
  const { width, height } = render.options
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const max = width > height ? width : height
  const randOutScreen = () => Math.random() > 0.5 ? Common.random(-max * 1.5, max) : Common.random(max, max * 1.5)
  for (let i = 0; i < count; i += 1) {
    const size = Common.random(4, 10)
    const body = Bodies.circle(
      randOutScreen(),
      randOutScreen(),
      size,
      {
        render: {
          // @ts-ignore
          sprite: {
            texture: `data:image/svg+xml;utf8,${generateFromString(getUid(), { size: size * 3 })}`
          },
          opacity: 0.9
        }
      }
    )
    World.add(world, body)
    await sleep(50)
    smallCounts++
  }
}

const createStars = (render: Render, world: World) => {
  // The amount of symbol we want to place;
  const count = 50

  const stars: Body[] = []

  const viewBounds = render.options

  // Place the instances of the symbol:
  for (let i = 0; i < count; i++) {
    const star = Bodies.circle(Common.random(viewBounds.width), Common.random(viewBounds.height), 10, {
      isStatic: true,
      render: {
        fillStyle: '#fff'
      },
      collisionFilter: untouchFilter
    })
    Body.scale(star, i / count + 0.1, i / count + 0.1)
    World.add(world, star)
    stars.push(star)
  }

  function keepInView(item: Body, player: Body) {
    const position = item.position
    const playerPos = player.position
    const halfWidth = viewBounds.width / 2
    const halfHeight = viewBounds.height / 2

    const xBound = playerPos.x + halfWidth
    const yBound = playerPos.y + halfHeight

    if (position.x > xBound) {
      position.x = playerPos.x - halfWidth
    }

    if (position.x < -xBound) {
      position.x = playerPos.x + halfWidth
    }

    if (position.y > yBound - 5) {
      position.y = playerPos.y - halfHeight
    }

    if (position.y < -yBound + 5) {
      position.y = playerPos.y + halfHeight
    }

    console.log(position.x, playerPos.x)
  }

  return function (point: IMousePoint, player: Body) {
    // Run through the active layer's children list and change
    // the position of the placed symbols:
    // const layer = project.activeLayer
    for (let i = 0; i < count; i++) {
      const item = stars[i]
      const size = render.options

      const vector = Vector.create(point.x, point.y)
      // const size = item.bounds.size
      // const length = vector.length / 10 * size.width / 10
      const offsetX = vector.x - size.width / 2
      const offsetY = vector.y - size.height / 2
      item.position.x += -offsetX / 100
      item.position.y += -offsetY / 100
      keepInView(item, player)
    }
  }
}

const main = async () => {
  const engine = Engine.create()
  engine.gravity.scale = 0

  const world = engine.world

  const render = (Render as typeof MatterRender).create({
    element: document.body,
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false
    }
  })

  const runner = Runner.create()

  Render.run(render)
  Runner.run(runner, engine)

  addBGText(render, world)

  addUI(render, world)

  window.addEventListener('resize', () => {
    render.bounds.max.x = window.innerWidth
    render.bounds.max.y = window.innerHeight
    render.options.width = window.innerWidth
    render.options.height = window.innerHeight
    render.canvas.width = window.innerWidth
    render.canvas.height = window.innerHeight

    // @ts-ignore
    const text = scoreText.render.text as Text
  })
  // const moveStars = createStars(render, world)

  const player = createBall(world, render.options.width / 2, render.options.height / 2, uid)

  World.add(world, [
    player
  ])

  addSmallBalls(render, world, 10)

  const mouse = Mouse.create(render.canvas)

  const syncStates = (state: StateChanged) => {
    const map = awareness.getStates()

    state.added.forEach(id => {
      const otherPlayer = map.get(id)
      if (otherPlayer?.pos?.x) {
        const newBody = createBall(null, otherPlayer.pos.x, otherPlayer.pos.y, otherPlayer.uid, 0.7)
        playerObjs.push({
          id: otherPlayer.id,
          body: newBody
        })
        World.add(world, newBody)
        console.log('added', otherPlayer.id)
        toast(`${otherPlayer.id} 已加入时间线`, ToastType.JOIN)
      }
    })

    state.removed.forEach(id => {
      const playerObjIdx = playerObjs.findIndex(playerObj => playerObj.id === id)
      if (playerObjIdx !== -1) {
        const playerObj = playerObjs[playerObjIdx]
        World.remove(world, playerObj.body)
        playerObjs.splice(playerObjIdx, 1)
        console.log('removed', playerObj.id)
        toast(`${playerObj.id} 已离开时间线`, ToastType.QUIT)
      }
    })
  }

  awareness.on('change', syncStates)

  let step = 1

  Events.on(engine, 'afterUpdate', (e) => {
    // @ts-ignore
    const text = scoreText.render.text as Text
    if (showScore) {
      const nextScore = Math.floor(e.timestamp / 1000)
      if (nextScore !== score && nextScore > 0 && nextScore % 10 === 0) {
        text.size += 0.1
        if (smallCounts <= SMALL_COUNTS) {
          addSmallBalls(render, world, 5)
        }
      }
      text.content = `${nextScore}`
      score = nextScore
    } else {
      text.color = 'rgba(255, 255, 255, 0.5)'
      text.size += step++
      step += 0.1
      if (text.size > 1024) {
        showScore = true
        text.size = 128
        text.color = 'rgba(255, 255, 255, 0.2)'
        text.content = ''
      }
    }
    // moveStars(mouse.position, ball)

    // sync local state to remote
    awareness.setLocalState({
      id: awareness.clientID,
      uid,
      pos: {
        x: player.position.x,
        y: player.position.y
      },
      scale: player.render.sprite.xScale,
      angle: player.angle
    })

    // sync other players states
    playerObjs.forEach(playerObj => {
      const otherPlayer = awareness.getStates().get(playerObj.id)
      if (otherPlayer?.pos?.x) {
        playerObj.body.position.x = otherPlayer.pos.x
        playerObj.body.position.y = otherPlayer.pos.y
        playerObj.body.render.sprite.xScale = otherPlayer.scale
        playerObj.body.render.sprite.yScale = otherPlayer.scale
        playerObj.body.angle = otherPlayer.angle
      }
    })

    if (!mouse.position.x) {
      return
    }

    // mouse move
    const scale = player.render.sprite.xScale
    Body.translate(player, {
      x: (mouse.position.x - player.position.x) * 0.05 * scale,
      y: (mouse.position.y - player.position.y) * 0.05 * scale
    })

    // player facing angle
    const v = Vector.create(mouse.position.x - player.position.x, mouse.position.y - player.position.y)
    const rad = Math.atan2(v.y, v.x)
    player.angle = rad
  })

  render.mouse = mouse
}

const startBtn = document.querySelector<HTMLDivElement>('.start')
const avatarEle = document.querySelector<HTMLImageElement>('.avatar')

avatarEle.src = `data:image/svg+xml;utf8,${generateFromString(uid)}`

avatarEle.onclick = () => {
  uid = getUid()
  avatarEle.src = `data:image/svg+xml;utf8,${generateFromString(uid)}`
}

startBtn.addEventListener('click', () => {
  const modalEle = document.querySelector<HTMLDivElement>('.modal')

  init()

  modalEle.style.display = 'none'

  main()
})
