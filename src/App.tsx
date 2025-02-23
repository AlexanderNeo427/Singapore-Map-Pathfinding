import React from 'react'
import { WebGLRenderer } from 'three'
import SceneManager from './interactive/SceneManager'
import ScenePathfinding from './interactive/scenes/ScenePathfinding'

const App: React.FC = () => {
   const canvasRef = React.useRef<HTMLCanvasElement>(null)

   React.useEffect(() => {
      if (!canvasRef.current) {
         return
      }
      const renderer = new WebGLRenderer({ canvas: canvasRef.current, antialias: true })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      window.addEventListener('resize', () => {
         renderer.setSize(window.innerWidth, window.innerHeight)
      })

      const sceneManager = new SceneManager(renderer)
      sceneManager.registerScene(new ScenePathfinding(renderer))

      let animHandle: number = 0
      let prevTimeElapsed: number = 0
      const loop = (timeElapsed: number) => {
         const deltaTime = timeElapsed - prevTimeElapsed
         sceneManager.onUpdateAndRender(deltaTime)

         prevTimeElapsed = timeElapsed
         animHandle = requestAnimationFrame(loop)
      }
      loop(0)

      return () => {
         cancelAnimationFrame(animHandle)
         sceneManager.cleanup()
      }
   }, [])

   return (
      <div style={{
         display: 'flex',
         justifyContent: 'center',
         alignItems: 'center',

         width: '90%',
         height: '80%', 
      }}>
         <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
   )
}

export default App
