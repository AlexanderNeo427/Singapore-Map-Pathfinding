import * as THREE from 'three'
import SceneManager from './SceneManager'
import ScenePathfinding from './scenes/ScenePathfinding'

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas') as HTMLCanvasElement,
})
renderer.setSize(window.innerWidth, window.innerHeight)
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
})

const sceneManager = new SceneManager(renderer)
sceneManager.registerScene(new ScenePathfinding(renderer))

let prevTimeElapsed: number = 0
const loop = (timeElapsed: number) => {
    const deltaTime = timeElapsed - prevTimeElapsed
    sceneManager.onUpdateAndRender(deltaTime)

    prevTimeElapsed = timeElapsed
    requestAnimationFrame(loop)
}
loop(0)



