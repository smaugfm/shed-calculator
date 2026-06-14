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

let membraneTexture: THREE.CanvasTexture | null = null

export function getMembraneTexture(): THREE.CanvasTexture {
  if (membraneTexture) return membraneTexture
  membraneTexture = makeTexture((ctx, size) => {
    ctx.translate(size, 0)
    ctx.scale(-1, 1) // mirror so branding reads correctly on the outward face
    ctx.fillStyle = '#c9ced2'
    ctx.fillRect(0, 0, size, size)
    ctx.globalAlpha = 0.07
    for (let i = 0; i < 14000; i++) {
      ctx.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#8d959b'
      const x = Math.random() * size
      const y = Math.random() * size
      const a = Math.random() * Math.PI
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#7f878d'
    ctx.font = 'bold 26px sans-serif'
    for (let row = 0; row < 4; row++) {
      ctx.fillText('SHED·WRAP  BREATHABLE', 12, 70 + row * 130)
    }
  })
  return membraneTexture
}

let shingleTexture: THREE.CanvasTexture | null = null

export function getShingleTexture(): THREE.CanvasTexture {
  if (shingleTexture) return shingleTexture
  shingleTexture = makeTexture((ctx, size) => {
    ctx.fillStyle = '#33363b'
    ctx.fillRect(0, 0, size, size)
    const courses = 8
    const ch = size / courses
    const tab = size / 8
    for (let r = 0; r < courses; r++) {
      const y = r * ch
      const offset = (r % 2) * (tab / 2)
      const shade = 0.85 + Math.random() * 0.3
      ctx.fillStyle = `rgb(${Math.round(60 * shade)}, ${Math.round(64 * shade)}, ${Math.round(70 * shade)})`
      ctx.fillRect(0, y, size, ch - 3)
      ctx.strokeStyle = 'rgba(15,16,18,0.9)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, y + ch - 1.5)
      ctx.lineTo(size, y + ch - 1.5)
      ctx.stroke()
      for (let t = -1; t <= 8; t++) {
        const x = t * tab + offset
        ctx.beginPath()
        ctx.moveTo(x, y + ch * 0.45)
        ctx.lineTo(x, y + ch - 1.5)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 0.12
    for (let i = 0; i < 12000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#9aa0a6'
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
    }
  })
  return shingleTexture
}

let metalShingleTexture: THREE.CanvasTexture | null = null

export function getMetalShingleTexture(): THREE.CanvasTexture {
  if (metalShingleTexture) return metalShingleTexture
  metalShingleTexture = makeTexture((ctx, size) => {
    ctx.fillStyle = '#7e878e'
    ctx.fillRect(0, 0, size, size)
    const courses = 6
    const ch = size / courses
    const tiles = 5
    const tw = size / tiles
    for (let r = 0; r < courses; r++) {
      const y = r * ch
      const offset = (r % 2) * (tw / 2)
      for (let t = -1; t <= tiles; t++) {
        const x = t * tw + offset
        const g = ctx.createLinearGradient(0, y, 0, y + ch)
        g.addColorStop(0, '#b3bbc1')
        g.addColorStop(0.5, '#8c949b')
        g.addColorStop(1, '#6d757b')
        ctx.fillStyle = g
        ctx.fillRect(x + 1.5, y + 1.5, tw - 3, ch - 3)
      }
      ctx.strokeStyle = 'rgba(35,40,44,0.85)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(0, y + ch - 1)
      ctx.lineTo(size, y + ch - 1)
      ctx.stroke()
      for (let t = -1; t <= tiles; t++) {
        const x = t * tw + offset
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + ch)
        ctx.stroke()
      }
    }
  })
  return metalShingleTexture
}

let insulationTexture: THREE.CanvasTexture | null = null

export function getInsulationTexture(): THREE.CanvasTexture {
  if (insulationTexture) return insulationTexture
  insulationTexture = makeTexture((ctx, size) => {
    ctx.fillStyle = '#e8d98a'
    ctx.fillRect(0, 0, size, size)
    // Dense fibrous strands, mostly horizontal, in pale wool tones.
    const fibreColors = ['#f1e7ab', '#dcc874', '#eadd8f', '#cdb863', '#f6efc4']
    for (let i = 0; i < 16000; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const a = (Math.random() - 0.5) * 0.6
      const len = 10 + Math.random() * 26
      ctx.globalAlpha = 0.12 + Math.random() * 0.18
      ctx.strokeStyle = fibreColors[(Math.random() * fibreColors.length) | 0]
      ctx.lineWidth = 0.6 + Math.random() * 1.2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      ctx.stroke()
    }
    // Soft mottled clumps for the fluffy depth.
    ctx.globalAlpha = 0.06
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#fffbe0' : '#b8a259'
      const r = 6 + Math.random() * 18
      ctx.beginPath()
      ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
  return insulationTexture
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
