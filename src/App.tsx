import { FeatureCollection } from 'geojson';
import OverlayGUI from './components/OverlayGUI'
import sg_geodata from './assets/sg_geodata.json'
import React, { useEffect, useRef, useState } from 'react'
import { breadthFirstSearch, buildGraph, depthFirstSearch } from './typescript/Algorithms'
import {
   GraphData, GraphNode, PathfindingAlgoType, PathfindingResults, StartEndPoint, TemporalPath
} from './typescript/Declarations';
import DeckGL, {
   GeoJsonLayer, PickingInfo, ScatterplotLayer, TripsLayer
} from 'deck.gl'

const App: React.FC = () => {
   const m_pathfinder = useRef<PathfindingAlgoType>(breadthFirstSearch)

   const m_graphData = useRef<GraphData>(new GraphData())
   const m_startNode = useRef<GraphNode | null>(null)
   const m_endNode = useRef<GraphNode | null>(null)
   const [m_isPickingStart, setIsPickingStart] = useState<boolean>(true)

   const m_animHandle = useRef<number>(-1)
   const m_frameTime = useRef<number>(0)
   const [m_timeElapsed, setTimeElapsed] = useState<number>(0)
   const [m_trips, setTrips] = useState<TemporalPath[]>([])

   useEffect(() => {
      m_graphData.current = buildGraph(sg_geodata as FeatureCollection)

      let frameTimerUpdatorHandle: number = 0
      let prevTimeElapsed: number = 0
      const tickFrameTimer = (globalTimeElapsed: number): void => {
         m_frameTime.current = (globalTimeElapsed - prevTimeElapsed)
         prevTimeElapsed = globalTimeElapsed
         frameTimerUpdatorHandle = requestAnimationFrame(tickFrameTimer)
      }
      frameTimerUpdatorHandle = requestAnimationFrame(tickFrameTimer)

      const loop = (): void => {
         setTimeElapsed(oldTime => oldTime + m_frameTime.current)
         m_animHandle.current = requestAnimationFrame(loop)
      }
      m_animHandle.current = requestAnimationFrame(loop)

      return () => {
         cancelAnimationFrame(m_animHandle.current)
         cancelAnimationFrame(frameTimerUpdatorHandle)
      }
   }, [])

   const tripsLayer = new TripsLayer<TemporalPath>({
      id: 'Trips Layer',
      data: m_trips,
      getPath: d => [d.from.pos, d.to.pos],
      getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
      getWidth: 2, pickable: true, getColor: _ => [255, 200, 0], capRounded: true,
      currentTime: m_timeElapsed, trailLength: Infinity
   });

   const geoJsonLayer = new GeoJsonLayer({
      id: 'Singapore GeoJSON', data: (sg_geodata as FeatureCollection),
      filled: true, stroked: false, opacity: 0.9, lineWidthMinPixels: 5,
      getLineColor: _ => [70, 70, 70],
   })

   const startEndPointLayer = new ScatterplotLayer<StartEndPoint>({
      id: 'Start & End Point Layer',
      data: ((): StartEndPoint[] => {
         const points: StartEndPoint[] = []
         if (m_startNode.current) {
            points.push({ node: m_startNode.current, isStart: true })
         }
         if (m_endNode.current) {
            points.push({ node: m_endNode.current, isStart: false })
         }
         return points
      })(),
      getFillColor: d => d.isStart ? [255, 0, 0] : [0, 255, 0],
      getRadius: _ => 18, getPosition: d => d.node.position
   })

   const mapClickHandler = (clickCoord: [number, number], isPickingStart: boolean): void => {
      let nodeClosestToClick: (GraphNode | null) = null
      let minDist: number = 9999999

      m_graphData.current.allGraphNodes.forEach((node, _) => {
         const dx: number = clickCoord[0] - node.position[0]
         const dy: number = clickCoord[1] - node.position[1]
         const distToCoord: number = Math.sqrt(dx * dx + dy * dy)
         if (distToCoord < minDist) {
            minDist = distToCoord
            nodeClosestToClick = node
         }
      })

      if (!nodeClosestToClick || nodeClosestToClick === null) { return }
      if (minDist > 0.0005) { return } // Tolerance

      if (isPickingStart) { m_startNode.current = nodeClosestToClick }
      else { m_endNode.current = nodeClosestToClick }

      setIsPickingStart(val => !val)
   }

   const runClickHandler = (): void => {
      if (!m_startNode.current || !m_endNode.current) { return }

      const results: PathfindingResults = m_pathfinder.current({
         startNode: m_startNode.current,
         endNode: m_endNode.current,
         graphData: m_graphData.current
      })
      console.log("Pathfinding Results: ", results)
      if (results.finalPath === null) { return }

      setTrips(results.allTemporalPaths)
      setTimeElapsed(0)
   }

   return (
      <div className='h-full w-full'>
         <div className='flex flex-col items-center w-full h-full'>
            <DeckGL
               style={{ position: 'absolute', width: '100%', height: '100%' }}
               initialViewState={{
                  longitude: 103.87312657779727, latitude: 1.3506264285088163, zoom: 15
               }}
               controller
               layers={[geoJsonLayer, tripsLayer, startEndPointLayer]}
               onClick={(info: PickingInfo) => {
                  if (!info.coordinate) { return }
                  const x: number = info.coordinate[0]
                  const y: number = info.coordinate[1]
                  mapClickHandler([x, y], m_isPickingStart)
               }}
            />
            <OverlayGUI runClickHandler={runClickHandler} />
         </div>
      </div>
   )
}

export default App


