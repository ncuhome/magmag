/**
 * Modified from https://github.com/boringdesigners/boring-avatars
 */

export const hashCode = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const character = name.charCodeAt(i)
    hash = ((hash << 5) - hash) + character
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export const getModulus = (num, max) => {
  return num % max
}

export const getDigit = (number, ntn) => {
  return Math.floor((number / Math.pow(10, ntn)) % 10)
}

export const getBoolean = (number, ntn) => {
  return (!((getDigit(number, ntn)) % 2))
}

export const getAngle = (x, y) => {
  return Math.atan2(y, x) * 180 / Math.PI
}

export const getUnit = (number, range, index = 0) => {
  console.log(index)
  const value = number % range

  if (index && ((getDigit(number, index) % 2) === 0)) {
    return -value
  } else return value
}

export const getRandomColor = (number, colors, range) => {
  return colors[(number) % range]
}

export const getContrast = (hexcolor) => {
  // If a leading # is provided, remove it
  if (hexcolor.slice(0, 1) === '#') {
    hexcolor = hexcolor.slice(1)
  }

  // Convert to RGB value
  const r = parseInt(hexcolor.substr(0, 2), 16)
  const g = parseInt(hexcolor.substr(2, 2), 16)
  const b = parseInt(hexcolor.substr(4, 2), 16)

  // Get YIQ ratio
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000

  // Check contrast
  return (yiq >= 128) ? '#000000' : '#FFFFFF'
}

const SIZE = 36

function hexToRgb(hex: string) {
  hex = hex.slice(1)
  const bigint = parseInt(hex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255

  return `rgba(${r},${g},${b})`
}

function generateData(name, colors) {
  const numFromName = hashCode(name)
  const range = colors && colors.length
  const wrapperColor = getRandomColor(numFromName, colors, range)
  const preTranslateX = getUnit(numFromName, 10, 1)
  const wrapperTranslateX = preTranslateX < 5 ? preTranslateX + SIZE / 9 : preTranslateX
  const preTranslateY = getUnit(numFromName, 10, 2)
  const wrapperTranslateY = preTranslateY < 5 ? preTranslateY + SIZE / 9 : preTranslateY

  const data = {
    wrapperColor: wrapperColor,
    faceColor: getContrast(wrapperColor),
    backgroundColor: getRandomColor(numFromName + 13, colors, range),
    wrapperTranslateX: wrapperTranslateX,
    wrapperTranslateY: wrapperTranslateY,
    wrapperRotate: getUnit(numFromName, 360),
    wrapperScale: 1 + getUnit(numFromName, SIZE / 12) / 10,
    isMouthOpen: getBoolean(numFromName, 2),
    isCircle: getBoolean(numFromName, 1),
    eyeSpread: getUnit(numFromName, 5),
    mouthSpread: getUnit(numFromName, 3),
    faceRotate: getUnit(numFromName, 10, 3),
    faceTranslateX:
      wrapperTranslateX > SIZE / 6 ? wrapperTranslateX / 2 : getUnit(numFromName, 8, 1),
    faceTranslateY:
      wrapperTranslateY > SIZE / 6 ? wrapperTranslateY / 2 : getUnit(numFromName, 7, 2)
  }

  return data
}

export const COLORS = ['#F04155', '#FF823A', '#F2F26F', '#FFF7BD', '#95CFB7']

export const generateFromString = (name: string | number, colors = COLORS, size = 100) => {
  const data = generateData(name, colors)
  return `<svg
      viewBox="0 0 ${SIZE} ${SIZE}"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
    >
      <g>
        <rect width="${SIZE}" height="${SIZE}" rx="${SIZE / 2}" fill="${hexToRgb(data.backgroundColor)}" />
        <rect
          x="0"
          y="0"
          width="${SIZE}"
          height="${SIZE}"
          transform="${'translate(' +
    data.wrapperTranslateX +
    ' ' +
    data.wrapperTranslateY +
    ') rotate(' +
    data.wrapperRotate +
    ' ' +
    SIZE / 2 +
    ' ' +
    SIZE / 2 +
    ') scale(' +
    data.wrapperScale +
    ')'
    }"
          fill="${hexToRgb(data.wrapperColor)}"
          rx="${data.isCircle ? SIZE : SIZE / 6}"
        />
        <g
          transform="${'translate(' +
    data.faceTranslateX +
    ' ' +
    data.faceTranslateY +
    ') rotate(' +
    data.faceRotate +
    ' ' +
    SIZE / 2 +
    ' ' +
    SIZE / 2 +
    ')'
    }"
        >
          ${data.isMouthOpen
      ? (
        `<path
              d="M15 ${(19 + data.mouthSpread)} c2 1 4 1 6 0"
              stroke="${hexToRgb(data.faceColor)}"
              fill="none"
              strokeLinecap="round"
            />`
      )
      : (
        `<path
              d="M13, ${(19 + data.mouthSpread)} a1,0.75 0 0,0 10,0"
              fill="${hexToRgb(data.faceColor)}"
            />`
      )}
          <rect
            x="${14 - data.eyeSpread}"
            y="14"
            width="1.5"
            height="2"
            rx="1"
            stroke="none"
            fill="${hexToRgb(data.faceColor)}"
          />
          <rect
            x="${20 + data.eyeSpread}"
            y="14"
            width="1.5"
            height="2"
            rx="1"
            stroke="none"
            fill="${hexToRgb(data.faceColor)}"
          />
        </g>
        </g>
    </svg>
  `
}
