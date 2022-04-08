import { Howl } from 'howler'

// From https://freemusicarchive.org/music/Xylo-Ziko/esse/esse
const Esse = 'https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/amqcSqgXKwXiN6rhATeY1LSqXOBZHBW3h7uorr7J.mp3'

export const bgSound = new Howl({
  src: [Esse],
  html5: true,
  loop: true
})

export const startBgMusic = () => {
  bgSound.play()
}
