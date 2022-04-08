import 'toastify-js/src/toastify.css'

import MatterAttractors from 'matter-attractors'
import Matter, { Bodies, Body, Common, Engine, Events, Mouse, Render, Runner, World } from 'matter-js'
import { nanoid } from 'nanoid'

import { generateFromString } from './avatar'
import { SMALL_COUNTS, toast, ToastType } from './utils'
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
          return {
            x: (bodyA.position.x - bodyB.position.x) * 1e-7,
            y: (bodyA.position.y - bodyB.position.y) * 1e-7
          }
          // const force = {
          //   x: (bodyA.position.x - bodyB.position.x) * 1e-7,
          //   y: (bodyA.position.y - bodyB.position.y) * 1e-7
          // }

          // Body.applyForce(bodyA, bodyA.position, Matter.Vector.neg(force))
          // Body.applyForce(bodyB, bodyB.position, force)
        }
      ]
    }
  })
}

const main = async () => {
  const engine = Engine.create()
  const world = engine.world

  const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false
    }
  })

  Render.run(render)

  const runner = Runner.create()
  Runner.run(runner, engine)

  engine.gravity.scale = 0

  const ball = createBall(400, 200, uid)

  World.add(world, [
    ball
  ])

  for (let i = 0; i < SMALL_COUNTS; i += 1) {
    const size = Common.random(3, 10)
    const body = Bodies.circle(
      Common.random(400, 200),
      Common.random(400, 200),
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
  }

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
      x: (mouse.position.x - ball.position.x) * 0.25,
      y: (mouse.position.y - ball.position.y) * 0.25
    })
  })

  render.mouse = mouse

  Render.lookAt(render, {
    min: { x: 0, y: 0 },
    max: { x: 800, y: 600 }
  })

  return {
    engine: engine,
    runner: runner,
    render: render,
    canvas: render.canvas,
    stop: function () {
      Render.stop(render)
      Runner.stop(runner)
    }
  }
}

main()
