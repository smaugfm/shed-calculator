import * as THREE from 'three'

let osbTexture: THREE.CanvasTexture | null = null

export function getOsbTexture(): THREE.CanvasTexture {
  if (osbTexture) return osbTexture
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#d8be86'
  ctx.fillRect(0, 0, size, size)

  const flakeColors = ['#c9ab6f', '#d6c08a', '#bfa066', '#e0cd9c', '#b8975c', '#cdb27a']
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const w = 18 + Math.random() * 46
    const h = 6 + Math.random() * 14
    const angle = Math.random() * Math.PI
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.globalAlpha = 0.35 + Math.random() * 0.4
    ctx.fillStyle = flakeColors[(Math.random() * flakeColors.length) | 0]
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
  }

  ctx.globalAlpha = 0.08
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#7a5e30' : '#f0e2bd'
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  osbTexture = texture
  return texture
}

function makeTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  draw(canvas.getContext('2d')!, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

let claddingTexture: THREE.CanvasTexture | null = null

export function getCladdingTexture(): THREE.CanvasTexture {
  if (claddingTexture) return claddingTexture
  claddingTexture = makeTexture((ctx, size) => {
    ctx.fillStyle = '#9c7649'
    ctx.fillRect(0, 0, size, size)
    const boards = 8
    const bw = size / boards
    for (let i = 0; i < boards; i++) {
      const shade = 0.85 + Math.random() * 0.3
      ctx.fillStyle = `rgb(${Math.round(156 * shade)}, ${Math.round(118 * shade)}, ${Math.round(73 * shade)})`
      ctx.fillRect(i * bw, 0, bw - 2, size)
      ctx.strokeStyle = 'rgba(60,40,20,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(i * bw + bw - 1, 0)
      ctx.lineTo(i * bw + bw - 1, size)
      ctx.stroke()
      ctx.globalAlpha = 0.12
      for (let g = 0; g < 40; g++) {
        ctx.strokeStyle = Math.random() > 0.5 ? '#5e3f20' : '#c79a63'
        ctx.beginPath()
        const x = i * bw + Math.random() * bw
        ctx.moveTo(x, 0)
        ctx.bezierCurveTo(x + 4, size * 0.3, x - 4, size * 0.6, x, size)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  })
  return claddingTexture
}

let metalTexture: THREE.CanvasTexture | null = null

export function getMetalTexture(): THREE.CanvasTexture {
  if (metalTexture) return metalTexture
  metalTexture = makeTexture((ctx, size) => {
    const ribs = 16
    const rw = size / ribs
    for (let i = 0; i < ribs; i++) {
      const grad = ctx.createLinearGradient(i * rw, 0, (i + 1) * rw, 0)
      grad.addColorStop(0, '#6f7980')
      grad.addColorStop(0.5, '#c4ccd2')
      grad.addColorStop(1, '#6f7980')
      ctx.fillStyle = grad
      ctx.fillRect(i * rw, 0, rw, size)
    }
  })
  return metalTexture
}
