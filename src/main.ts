import 'toastify-js/src/toastify.css'
import './main.less'

import MatterAttractors from 'matter-attractors'
import Matter, { Bodies, Body, Common, Engine, Events, IMousePoint, Mouse, Render as MatterRender, Runner, Vector, World } from 'matter-js'
import { nanoid } from 'nanoid'
import nipple from 'nipplejs'
import screenfull from 'screenfull'

import { bgSound } from './audio'
import { generateFromString } from './avatar'
import { Render } from './render'
import { IS_MOBILE, SMALL_COUNTS, toast, ToastType } from './utils'
import { awareness } from './y'

console.log('ID', awareness.clientID)

Matter.use(MatterAttractors)

const uid = nanoid(16)

window.onbeforeunload = function () {
  awareness.setLocalState(null)
}

window.addEventListener('unload', () => {
  awareness.setLocalState(null)
})

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

  if (!import.meta.env.DEV) {
    screenfull.isEnabled && screenfull.request()
  }

  if (IS_MOBILE) {
    nipple.create({
      color: 'white'
    })
  }
}

const playerObjs: PlayerObj[] = []

const createBall = (x: number, y: number, id: string, opacity = 1.0, radius = 40) => {
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
        (bodyA, bodyB) => {
          // return {
          //   x: (bodyA.position.x - bodyB.position.x) * 1e-6,
          //   y: (bodyA.position.y - bodyB.position.y) * 1e-6
          // }
          const force = {
            x: (bodyA.position.x - bodyB.position.x) * 1e-7,
            y: (bodyA.position.y - bodyB.position.y) * 1e-7
          }

          Body.applyForce(bodyA, bodyA.position, Matter.Vector.neg(force))
          Body.applyForce(bodyB, bodyB.position, force)
        }
      ]
    }
  })
}

const addSmallBalls = async (world: World) => {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  for (let i = 0; i < SMALL_COUNTS; i += 1) {
    const size = Common.random(3, 10)
    const body = Bodies.circle(
      Common.random(1000, 1000),
      Common.random(1000, 1000),
      size,
      {
        render: {
          // @ts-ignore
          sprite: {
            texture: `data:image/svg+xml;utf8,${generateFromString(nanoid(8), { size: size * 3 })}`
          }
        }
      }
    )
    World.add(world, body)
    await sleep(50)
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
      collisionFilter: {
        group: -1,
        category: 2,
        mask: 0
      }
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
  const startBtn = document.querySelector('.start')
  const engine = Engine.create()
  const world = engine.world

  const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false,
      showDebug: import.meta.env.DEV
    }
  })

  window.addEventListener('resize', () => {
    render.bounds.max.x = window.innerWidth
    render.bounds.max.y = window.innerHeight
    render.options.width = window.innerWidth
    render.options.height = window.innerHeight
    render.canvas.width = window.innerWidth
    render.canvas.height = window.innerHeight
  })

  const runner = Runner.create()

  startBtn.addEventListener('click', () => {
    const modalEle = document.querySelector<HTMLDivElement>('.modal')
    Render.run(render)
    Runner.run(runner, engine)

    init()

    modalEle.style.display = 'none'
  })

  engine.gravity.scale = 0

  // const moveStars = createStars(render, world)

  const ball = createBall(0, 0, uid)

  World.add(world, [
    ball
  ])

  addSmallBalls(world)

  const mouse = Mouse.create(render.canvas)

  const syncStates = (state: StateChanged) => {
    const map = awareness.getStates()

    state.added.forEach(id => {
      const otherPlayer = map.get(id)
      if (otherPlayer?.pos?.x) {
        const newBody = createBall(otherPlayer.pos.x, otherPlayer.pos.y, otherPlayer.uid, 0.7)
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

  Events.on(engine, 'afterUpdate', () => {
    // moveStars(mouse.position, ball)

    playerObjs.forEach(playerObj => {
      const otherPlayer = awareness.getStates().get(playerObj.id)
      if (otherPlayer?.pos?.x) {
        playerObj.body.position.x = otherPlayer.pos.x
        playerObj.body.position.y = otherPlayer.pos.y
      }
    })

    awareness.setLocalState({
      id: awareness.clientID,
      uid,
      pos: {
        x: ball.position.x,
        y: ball.position.y
      }
    })

    if (!mouse.position.x) {
      return
    }

    Body.translate(ball, {
      x: (mouse.position.x - ball.position.x) * 0.05,
      y: (mouse.position.y - ball.position.y) * 0.05
    })

    // Render.lookAt(render, ball, {
    //   x: 240,
    //   y: 320
    // })
  })

  render.mouse = mouse

  Render.lookAt(render, ball, {
    x: 240,
    y: 320
  })
}

main()
