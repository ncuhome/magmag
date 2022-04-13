import { debounce, throttle } from 'lodash-es'
import MatterAttractors from 'matter-attractors'
import Matter, { Bodies, Body, Common, Engine, Events, Mouse, Render as MatterRender, Runner, SAT, Vector, World } from 'matter-js'
import nipple, { JoystickManager } from 'nipplejs'

import { bgSound } from './audio'
import { generateFromString } from './avatar'
import { Render } from './render'
import { getUid, IS_MOBILE, sleep, SMALL_COUNTS, toast, ToastType, UNTOUCHABLE_FILTER } from './utils'
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

interface PlayerState {
  id: Id,
  uid: string,
  pos: {
    x: number,
    y: number
  },
  scale: number,
  angle: number
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

export class Magmag {
  score = 0
  uid = getUid()
  running = false

  private joystick: JoystickManager
  private engine: Engine
  private world: World
  private render: MatterRender
  private runner: Runner
  private mouse: Mouse

  private created = false
  private player: Body
  private scoreText: Body

  private showScore = false
  private smallCounts = 0

  private attracting = true
  private width = window.innerWidth
  private height = window.innerHeight

  private playerObjs: PlayerObj[] = []

  constructor() {
    this.engine = Engine.create()
    this.engine.gravity.scale = 0

    this.world = this.engine.world

    this.render = (Render as typeof MatterRender).create({
      element: document.body,
      engine: this.engine,
      options: {
        width: this.width,
        height: this.height,
        wireframes: false
      }
    })

    this.runner = Runner.create()

    this.mouse = Mouse.create(this.render.canvas)
    this.render.mouse = this.mouse
  }

  start() {
    bgSound.play()

    Render.run(this.render)
    Runner.run(this.runner, this.engine)

    if (!this.created) {
      this.addBodies()
      this.listen()

      this.created = true
    }
    if (IS_MOBILE) {
      this.joystick = nipple.create({
        color: 'white'
      })
    }
    this.running = true
  }

  stop() {
    bgSound.pause()
    Render.stop(this.render)
    Runner.stop(this.runner)
    this.running = false
    if (IS_MOBILE) {
      this.joystick.destroy()
    }
  }

  private listen() {
    window.onbeforeunload = function () {
      awareness.setLocalState(null)
    }

    window.addEventListener('unload', () => {
      awareness.setLocalState(null)
    })

    window.addEventListener('resize', () => {
      this.resize()
    })

    awareness.on('change', this.syncStates)

    this.listenOnUpdate()

    this.listenEvents()
  }

  private resize = throttle(() => {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.render.bounds.max.x = this.width
    this.render.bounds.max.y = this.height
    this.render.options.width = this.width
    this.render.options.height = this.height
    this.render.canvas.width = this.width
    this.render.canvas.height = this.height
  }, 300)

  private listenEvents() {
    window.addEventListener('keypress', e => {
      if (e.code === 'Space') {
        this.attracting = !this.attracting
      }
    })
  }

  private listenOnUpdate() {
    let step = 1
    Events.on(this.engine, 'afterUpdate', (e) => {
      // @ts-ignore
      const text = this.scoreText.render.text as Text
      if (this.showScore) {
        const nextScore = Math.floor(e.timestamp / 1000)
        if (nextScore !== this.score && nextScore > 0 && nextScore % 10 === 0) {
          text.size += 0.1
          if (this.smallCounts <= SMALL_COUNTS) {
            this.addSmallBalls(5)
          }
        }
        text.content = `${nextScore}`
        this.score = nextScore
      } else {
        text.color = 'rgba(255, 255, 255, 0.5)'
        text.size += step++
        step += 0.1
        if (text.size > 1024) {
          this.showScore = true
          text.size = 128
          text.color = 'rgba(255, 255, 255, 0.2)'
          text.content = ''
        }
      }
      // moveStars(mouse.position, ball)

      // sync local state to remote
      awareness.setLocalState({
        id: awareness.clientID,
        uid: this.uid,
        pos: {
          x: this.player.position.x,
          y: this.player.position.y
        },
        scale: this.player.render.sprite.xScale,
        angle: this.player.angle
      })

      // sync other players states
      this.playerObjs.forEach(playerObj => {
        const otherPlayer = awareness.getStates().get(playerObj.id)
        if (otherPlayer?.pos?.x) {
          playerObj.body.position.x = otherPlayer.pos.x
          playerObj.body.position.y = otherPlayer.pos.y
          playerObj.body.render.sprite.xScale = otherPlayer.scale
          playerObj.body.render.sprite.yScale = otherPlayer.scale
          playerObj.body.angle = otherPlayer.angle
        }
      })

      if (!this.mouse.position.x) {
        return
      }

      // mouse move
      const scale = this.player.render.sprite.xScale
      Body.translate(this.player, {
        x: (this.mouse.position.x - this.player.position.x) * 0.05 * scale,
        y: (this.mouse.position.y - this.player.position.y) * 0.05 * scale
      })

      // player facing angle
      const v = Vector.create(this.mouse.position.x - this.player.position.x, this.mouse.position.y - this.player.position.y)
      const rad = Math.atan2(v.y, v.x)
      this.player.angle = rad
    })
  }

  private syncStates = (state: StateChanged) => {
    if (!this.running) return
    const map = awareness.getStates()

    if (map.size > 1) {
      const othersLen = map.size - 1
      if (othersLen > this.playerObjs.length) {
        const toAdd = (Array.from(map.values()) as PlayerState[])
          .filter(state => state.id && state.id !== awareness.clientID)
          .map(state => state.id)
        if (toAdd.length > 0) {
          state.added.push(...toAdd)
          state.added = Array.from(new Set(state.added))
        }
      }
      if (othersLen < this.playerObjs.length) {
        const othersId = (Array.from(map.values()) as PlayerState[])
          .filter(state => state.id && state.id !== awareness.clientID)
          .map(state => state.id)
        if (othersId.length > 0) {
          const currentIds = this.playerObjs.map(playerObj => playerObj.id)
          const toRemove = currentIds.filter(id => !othersId.includes(id))
          state.removed.push(...toRemove)
          state.removed = Array.from(new Set(state.removed))
        }
      }
    }

    state.added.forEach(id => {
      const otherPlayer = map.get(id)
      if (otherPlayer?.pos?.x) {
        const newBody = this.createBall(otherPlayer.pos.x, otherPlayer.pos.y, otherPlayer.uid, 0.6)
        this.playerObjs.push({
          id: otherPlayer.id,
          body: newBody
        })
        World.add(this.world, newBody)
        console.log('added', otherPlayer.id)
        toast(`${otherPlayer.id} 已加入时间线`, ToastType.JOIN)
      }
    })

    state.removed.forEach(id => {
      const playerObjIdx = this.playerObjs.findIndex(playerObj => playerObj.id === id)
      if (playerObjIdx !== -1) {
        const playerObj = this.playerObjs[playerObjIdx]
        World.remove(this.world, playerObj.body)
        this.playerObjs.splice(playerObjIdx, 1)
        console.log('removed', playerObj.id)
        toast(`${playerObj.id} 已离开时间线`, ToastType.QUIT)
      }
    })
  }

  private addBodies = () => {
    this.addBGText()

    this.addUI()

    this.addPlayer()

    this.addSmallBalls(10)
  }

  private addPlayer = () => {
    this.player = this.createBall(this.width / 2, this.height / 2, this.uid)

    World.add(this.world, [
      this.player
    ])
  }

  private addUI = () => {
    this.scoreText = Bodies.rectangle(this.width / 2, this.height / 2, 100, 100, {
      collisionFilter: UNTOUCHABLE_FILTER,
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

    World.add(this.world, this.scoreText)
  }

  private addBGText = () => {
    const top = Bodies.rectangle(this.width / 2, 64, 100, 100, {
      collisionFilter: UNTOUCHABLE_FILTER,
      render: {
        fillStyle: 'transparent',
        // @ts-ignore
        text: {
          content: 'BGM: Esse by Xylo-Ziko',
          color: 'rgba(255, 255, 255, 0.1)',
          size: 24
        }
      }
    })

    const bottom = Bodies.rectangle(this.width / 2, this.height - 64, 100, 100, {
      collisionFilter: UNTOUCHABLE_FILTER,
      render: {
        fillStyle: 'transparent',
        // @ts-ignore
        text: {
          content: 'Made by NCUHOME',
          color: 'rgba(255, 255, 255, 0.1)',
          size: 24
        }
      }
    })

    World.add(this.world, [top, bottom])
  }

  private createBall = (x: number, y: number, id: string, opacity = 1.0, radius = 40) => {
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
            if (this.world) {
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
            if (!this.attracting) return null
            const scale = bodyB.render.sprite.xScale
            const extraFactor = (1 + Math.log(this.score + 1) / 10)
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

  private addSmallBalls = async (count: number) => {
    const max = this.width > this.height ? this.width : this.height
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
      World.add(this.world, body)
      await sleep(50)
      this.smallCounts++
    }
  }
}
