import MatterAttractors from 'matter-attractors'
import Matter, { Bodies, Body, Common, Composite, Engine, Events, Mouse, Render, Runner, World } from 'matter-js'
import { nanoid } from 'nanoid'

import { generateFromString } from './avatar'
import { SMALL_COUNTS } from './utils'
import { awareness } from './y'

console.log('ID', awareness.clientID)

Matter.use(MatterAttractors)

const uid = nanoid(16)

window.onbeforeunload = function () {
  awareness.destroy()
}

window.addEventListener('unload', () => {
  awareness.destroy()
})

type Id = number
type Uid = string

interface PlayerObj {
  body: Body
  id: Id
}
interface Position {
  x: number
  y: number
}

interface Player {
  id: Id
  pos: Position
  uid: Uid
}

const playerObjs: PlayerObj[] = []
let lastOtherIds: Id[] = []

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

  Composite.add(world, [
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

  const syncStates = () => {
    const map = awareness.getStates()

    const otherPlayers = Array.from(map.values()).filter(state => state.id !== awareness.clientID) as Player[]
    const otherIds = otherPlayers.map(player => player.id)

    const shouldAdd = otherIds.filter(id => !lastOtherIds.includes(id))
    const shouldRemove = lastOtherIds.filter(id => !otherIds.includes(id))

    // Remove missing players
    if (shouldRemove.length > 0) {
      shouldRemove.forEach(id => {
        const playerObjIdx = playerObjs.findIndex(playerObj => playerObj.id === id)
        if (playerObjIdx !== -1) {
          const playerObj = playerObjs[playerObjIdx]
          World.remove(world, playerObj.body)
          playerObjs.splice(playerObjIdx, 1)
          console.log('removed', playerObj.id)
        }
      })
    }

    // Add new players
    if (shouldAdd.length > 0) {
      shouldAdd.forEach(id => {
        const otherPlayer = map.get(id)
        if (otherPlayer?.pos?.x) {
          const newBody = createBall(otherPlayer.pos.x, otherPlayer.pos.y, otherPlayer.uid, 0.7)
          playerObjs.push({
            id: otherPlayer.id,
            body: newBody
          })
          World.add(world, newBody)
          console.log('added', otherPlayer.id)
        }
      })
    }

    // Sync positions
    playerObjs.forEach(playerObj => {
      const otherPlayer = map.get(playerObj.id)
      playerObj.body.position.x = otherPlayer.pos.x
      playerObj.body.position.y = otherPlayer.pos.y
    })

    lastOtherIds = otherIds
  }

  awareness.on('change', () => {
    syncStates()
  })

  Events.on(engine, 'afterUpdate', () => {
    if (!mouse.position.x) {
      return
    }

    awareness.setLocalState({
      id: awareness.clientID,
      uid,
      pos: {
        x: ball.position.x,
        y: ball.position.y
      }
    })

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
