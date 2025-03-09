const SDL = require('@kmamal/sdl')
const { createCanvas } = require('@napi-rs/canvas')

const window = SDL.video.createWindow()
const { pixelWidth: width, pixelHeight: height } = window
const canvas = createCanvas(width, height)
const ctx = canvas.getContext('2d')

const { Quadtree } = require('../src/for-points')
const { rand } = require('@kmamal/util/random/rand')
const { throttle } = require('@kmamal/util/function/async/throttle')

const M = require('@kmamal/numbers/js')
const V = require('@kmamal/linear-algebra/vec2').defineFor(M)

const fnDist = (a, b) => V.normSquared(V.sub(a, b))

const N = 100
const K = 8

const quadtree = new Quadtree([
	{ from: 0, to: width },
	{ from: 0, to: height },
], K)

const points = []
for (let i = 0; i < N; i++) {
	const point = [
		rand(width),
		rand(height),
	]
	quadtree.insert(point)
	points.push(point)
}

let mouse = null

const render = throttle(() => {
	ctx.fillStyle = 'black'
	ctx.fillRect(0, 0, width, height)

	ctx.strokeStyle = 'white'
	ctx.lineWidth = 1
	const drawNode = (x0, x1, y0, y1, node, depth) => {
		if (depth === K) { return }

		ctx.strokeRect(
			Math.round(x0) + 0.5,
			Math.round(y0) + 0.5,
			Math.round(x1) - Math.round(x0),
			Math.round(y1) - Math.round(y0),
		)

		if (node === null) { return }

		const xm = x0 / 2 + x1 / 2
		const ym = y0 / 2 + y1 / 2

		drawNode(x0, xm, y0, ym, node[0], depth + 1)
		drawNode(xm, x1, y0, ym, node[1], depth + 1)
		drawNode(x0, xm, ym, y1, node[2], depth + 1)
		drawNode(xm, x1, ym, y1, node[3], depth + 1)
	}

	drawNode(0, width, 0, height, quadtree._tree[0], 0)

	if (mouse) {
		const nearest = quadtree.nearestNeighbor(mouse, fnDist)

		ctx.strokeStyle = 'blue'
		ctx.lineWidth = 3
		ctx.beginPath()
		ctx.moveTo(...mouse)
		ctx.lineTo(...nearest.point)
		ctx.stroke()

		ctx.fillStyle = 'green'
		ctx.fillRect(mouse[0] - 3, mouse[1] - 3, 6, 6)
	}

	ctx.fillStyle = 'red'
	for (const [ x, y ] of points) {
		ctx.fillRect(x - 3, y - 3, 6, 6)
	}

	const buffer = Buffer.from(ctx.getImageData(0, 0, width, height).data)
	window.render(width, height, width * 4, 'rgba32', buffer)
}, 0)

window.on('expose', render)

window.on('mouseMove', ({ x, y }) => {
	mouse = [ x, y ]
	render()
})
window.on('leave', () => {
	mouse = null
	render()
})
