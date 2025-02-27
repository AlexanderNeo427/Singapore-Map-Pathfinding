import React from 'react'
import DeckGL from '@deck.gl/react'
import { PickingInfo, MapViewState, Position as DeckPosition } from 'deck.gl'
import { LineLayer } from 'deck.gl'
import { Feature, FeatureCollection, LineString, Position as GeoPosition } from 'geojson';
import sg_geodata from './assets/sg_geodata.json'

const App: React.FC = () => {
   const mapViewState = {
      longitude: 103.8599,
      latitude: 1.348,
      zoom: 15,
   } as MapViewState

   type FromToPair = {
      from: DeckPosition
      to: DeckPosition
   };

   // const getCenter = (allFromToPairs: FromToPair[]): [number, number] => {
   //    let minX: number = Infinity
   //    let minY: number = Infinity 
   //    let maxX: number = -Infinity
   //    let maxY: number = -Infinity

   //    allFromToPairs.forEach(pair => {
   //       minX = Math.min(pair.from[0])
   //       minY = Math.min(pair.from[0])

   //    })

   //    return [0, 0]
   // }

   const getCoords = (allFeatures: FeatureCollection): FromToPair[] => {
      const allFromToPairs: FromToPair[] = []
      allFeatures.features.forEach((feature: Feature) => {
         if (feature.geometry.type != 'LineString') {
            return
         }
         const coords: GeoPosition[] = (feature.geometry as LineString).coordinates
         for (let i = 0; i < (coords.length - 1); i++) {
            const obj = {
               from: [coords[i][0], coords[i][1]],
               to: [coords[i + 1][0], coords[i + 1][1]],
            } as FromToPair
            allFromToPairs.push(obj)
         }
      })
      return allFromToPairs
   }

   const layer = new LineLayer<FromToPair>({
      id: 'LineLayer',
      data: getCoords(sg_geodata as FeatureCollection),
      getSourcePosition: d => d.from,
      getTargetPosition: d => d.to,
      getWidth: 12,
      pickable: true
   });

   return (
      <div style={{
         display: 'flex',
         justifyContent: 'center',
         alignItems: 'center',

         width: '100%', height: '80%',
      }}>
         <DeckGL
            initialViewState={mapViewState}
            controller
            layers={[layer]}
            onClick={(info: PickingInfo) => console.log("Clicked: ", info.coordinate)}
         />
      </div>
   )
}

export default App

// const canvasRef = React.useRef<HTMLCanvasElement>(null)
// React.useEffect(() => {
//    if (!canvasRef.current) {
//       return
//    }
//    const renderer = new WebGLRenderer({ canvas: canvasRef.current, antialias: true })
//    renderer.setSize(window.innerWidth, window.innerHeight)
//    renderer.setPixelRatio(window.devicePixelRatio)
//    window.addEventListener('resize', () => {
//       renderer.setSize(window.innerWidth, window.innerHeight)
//    })
//
//    const sceneManager = new SceneManager(renderer)
//
//    sceneManager.onStartup()
//    sceneManager.registerScene(new ScenePathfinding(renderer))
//
//    let animHandle: number = 0
//    let prevTimeElapsed: number = 0
//    const loop = (timeElapsed: number) => {
//       const deltaTime = timeElapsed - prevTimeElapsed
//       sceneManager.onUpdateAndRender(deltaTime)
//
//       prevTimeElapsed = timeElapsed
//       animHandle = requestAnimationFrame(loop)
//    }
//    loop(0)
//
//    return () => {
//       cancelAnimationFrame(animHandle)
//       sceneManager.cleanup()
//    }
// }, [])
// const initialViewState

