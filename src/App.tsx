import { FeatureCollection } from 'geojson';
import OverlayGUI from './components/OverlayGUI'
import roadData from './assets/roadData.json'
import React, { useEffect, useRef, useState } from 'react'
import {
   breadthFirstSearch, buildGraph, convertDeckPositionsToTemporalPath
} from './typescript/Algorithms'
import {
   GraphData, GraphNode, PathfindingAlgoType, PathfindingResults, StartEndPoint, TemporalPath
} from './typescript/Declarations';
import DeckGL, {
   PickingInfo, Position as DeckPosition,
   ScatterplotLayer, TripsLayer, GeoJsonLayer
} from 'deck.gl'

const App: React.FC = () => {
   const m_pathfinder = useRef<PathfindingAlgoType>(breadthFirstSearch)

   const m_graphData = useRef<GraphData>(new GraphData())
   const m_startNode = useRef<GraphNode | null>(null)
   const m_endNode = useRef<GraphNode | null>(null)
   const [m_isPickingStart, setIsPickingStart] = useState<boolean>(true)

   const m_animHandle = useRef<number>(-1)
   const m_frameTime = useRef<number>(0) // Read from this for the frame time
   const [m_timeElapsed, setTimeElapsed] = useState<number>(0)
   const [m_trips, setTrips] = useState<TemporalPath[]>([])

   const [m_finalPathTimer, setFinalPathTimer] = useState<number>(0)
   const [m_finalPath, setFinalPath] = useState<TemporalPath[]>([])

   useEffect(() => {
      m_graphData.current = buildGraph(roadData as FeatureCollection)

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
         setFinalPathTimer(oldTime => oldTime + m_frameTime.current)
         m_animHandle.current = requestAnimationFrame(loop)
      }
      m_animHandle.current = requestAnimationFrame(loop)

      return () => {
         cancelAnimationFrame(m_animHandle.current)
         cancelAnimationFrame(frameTimerUpdatorHandle)
      }
   }, [])

   // useEffect(() => {
   //    if (!m_finalPath || m_finalPath === null) { return }
   //
   // }, [m_finalPath])

   const pathfindingLayer = new TripsLayer<TemporalPath>({
      id: 'Pathfinding Layer', data: m_trips,
      getPath: d => [d.from.pos, d.to.pos],
      getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
      getWidth: 2, pickable: true, getColor: [255, 200, 0], capRounded: true,
      currentTime: m_timeElapsed, trailLength: Infinity,
   });

   // const buildingLayer = new GeoJsonLayer({
   //    id: 'Building Layer',
   //    data: buildingData,
   //    extruded: true,
   //    wireframe: false,
   //    opacity: 0.5,
   //    getPolygon: f => (f.geometry as Polygon).coordinates,
   //    getElevation: _ => 120,
   //    getFillColor: _ => [200, 180, 120],
   // })

   // const buildingLayer = new GeoJsonLayer({
   //    id: 'Building Layer', data: (buildingData as FeatureCollection),
   //    lineWidthMinPixels: 5, extruded: true,
   //    filled: true, stroked: false, opacity: 0.3,
   //    getElevation: _ => 130, getLineColor: _ => [255, 255, 255],
   // })

   // const finalPathLayer = new LineLayer<DeckPosition>({
   //    id: 'Final Path Layer', 
   //    data: m_finalPath,
   //
   // })

   const roadLayer = new GeoJsonLayer({
      id: 'Road Layer', data: (roadData as FeatureCollection),
      filled: true, stroked: false, opacity: 0.9, lineWidthMinPixels: 5,
      getLineColor: [70, 70, 70],
   })

   const START_END_POINT_SIZE = 6
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
      radiusMinPixels: START_END_POINT_SIZE,
      radiusMaxPixels: START_END_POINT_SIZE,
      getRadius: START_END_POINT_SIZE,
      stroked: true, getPosition: d => d.node.position,
      getLineWidth: 3, lineWidthMinPixels: 2, lineWidthMaxPixels: 3,
   })

   const finalPathLayer = new TripsLayer<TemporalPath>({
      id: 'Final Path Layer', data: m_finalPath,
      getPath: d => [d.from.pos, d.to.pos],
      getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
      getWidth: 3, pickable: true, getColor: [243, 5, 250], capRounded: true,
      currentTime: m_timeElapsed, trailLength: Infinity,
   })

   const mapClickHandler = (clickCoord: [number, number], isPickingStart: boolean): void => {
      let nodeClosestToClick: (GraphNode | null) = null
      let minDist: number = 9999999

      m_graphData.current.allGraphNodes.forEach(node => {
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

      const finalTemporalPath: TemporalPath[] = convertDeckPositionsToTemporalPath(
         results.finalPath, results.totalDuration
      )
      setFinalPath(finalTemporalPath)

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
               layers={[roadLayer, pathfindingLayer, finalPathLayer, startEndPointLayer]}
               onClick={(info: PickingInfo) => {
                  if (!info.coordinate) { return }
                  const x = info.coordinate[0] as number
                  const y = info.coordinate[1] as number
                  mapClickHandler([x, y], m_isPickingStart)
               }}
            />
            <OverlayGUI runClickHandler={runClickHandler} />
         </div>
      </div>
   )
}

export default App


