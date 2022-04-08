import MatterAttractors from 'matter-attractors'
import Matter, { Bodies, Body, Common, Composite, Engine, Events, Mouse, Render, Runner, World } from 'matter-js'
import { nanoid } from 'nanoid'

import { generateFromString } from './avatar'
import { awareness, SMALL_COUNTS } from './utils'

console.log('ID', awareness.clientID)

Matter.use(MatterAttractors)

interface PlayerObj {
  id: number
  body: Body
}

const playerObjs: PlayerObj[] = []

window.onbeforeunload = function () {
  awareness.setLocalState(null)
}

window.addEventListener('unload', () => {
  awareness.setLocalState(null)
})

interface Position {
  x: number
  y: number
}

interface Player {
  id: number
  pos: Position
}

const createBall = (x: number, y: number, id: number, opacity = 1.0, radius = 40) => {
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
  // create engine
  const engine = Engine.create()
  const world = engine.world

  // create renderer
  const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false
      // showVelocity: true
    }
  })

  Render.run(render)

  // create runner
  const runner = Runner.create()
  Runner.run(runner, engine)

  engine.gravity.scale = 0

  const ball = createBall(400, 200, awareness.clientID)

  // add bodies
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

  // add mouse control
  const mouse = Mouse.create(render.canvas)

  const syncStates = () => {
    const states = awareness.getStates().values()
    const otherPlayers = Array.from(states).filter(state => state.id !== awareness.clientID) as Player[]

    const otherIds = otherPlayers.map(player => player.id)

    if (playerObjs.length > 0) {
      playerObjs.forEach(playerObj => {
        const idx = otherIds.indexOf(playerObj.id)
        if (idx >= 0) {
          playerObj.body.position.x = otherPlayers[idx].pos.x
          playerObj.body.position.y = otherPlayers[idx].pos.y
        } else {
          World.remove(world, playerObj.body)
          playerObjs.splice(playerObjs.indexOf(playerObj), 1)
        }
      })
    } else {
      otherPlayers.forEach(otherPlayer => {
        if (otherPlayer?.pos?.x) {
          const newBody = createBall(otherPlayer.pos.x, otherPlayer.pos.y, otherPlayer.id, 0.7)
          playerObjs.push({
            id: otherPlayer.id,
            body: newBody
          })
          World.add(world, newBody)
        }
      })
    }
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
