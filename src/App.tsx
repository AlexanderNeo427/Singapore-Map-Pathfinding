import { FeatureCollection } from 'geojson';
import sg_geodata from './assets/sg_geodata.json'
import React, { useEffect, useRef, useState } from 'react'
import DeckGL, { Position as DeckPosition, GeoJsonLayer, LineLayer, PickingInfo, ScatterplotLayer } from 'deck.gl'
import { createGraphData, FrameData, FromToPair, GraphData, GraphNode, StartEndPoint } from './typescript/Declarations';
import { breadthFirstSearch } from './typescript/Algorithms';
import Navbar from './components/Navbar';

const App: React.FC = () => {
   const m_graphData = useRef<GraphData>(new GraphData())
   const m_animHandle = useRef<number>(-1)
   const m_startNode = useRef<GraphNode | null>(null)
   const m_endNode = useRef<GraphNode | null>(null)
   const [m_paths, setPaths] = useState<FromToPair[]>([])
   const [m_isPickingStart, setIsPickingStart] = useState<boolean>(true)

   useEffect(() => {
      m_graphData.current = createGraphData(sg_geodata as FeatureCollection)
   }, [])

   const pathLayer = new LineLayer<FromToPair>({
      id: 'Path Layer', data: m_paths,
      getSourcePosition: d => d.from, getTargetPosition: d => d.to,
      getWidth: 3, pickable: true, getColor: _ => [255, 200, 0]
   });

   const geoJsonLayer = new GeoJsonLayer({
      id: 'Singapore GeoJSON', data: (sg_geodata as FeatureCollection),
      filled: true, stroked: true, opacity: 0.9, lineWidthMinPixels: 5,
      getLineColor: _ => [70, 70, 70],
   })

   const getStartEndPoints = (): StartEndPoint[] => {
      const points: StartEndPoint[] = []
      if (m_startNode.current) { points.push({ node: m_startNode.current, isStart: true }) }
      if (m_endNode.current) { points.push({ node: m_endNode.current, isStart: false }) }
      return points
   }

   const startEndPointLayer = new ScatterplotLayer<StartEndPoint>({
      id: 'Start & End Point Layer', data: getStartEndPoints(),
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

      if (isPickingStart) {
         m_startNode.current = nodeClosestToClick
      }
      else {
         m_endNode.current = nodeClosestToClick
      }
      setIsPickingStart(oldValue => !oldValue)
   }

   const runClickHandler = (): void => {
      if (!m_startNode.current || !m_endNode.current) { return }
      const allFrames: FrameData[] = breadthFirstSearch(
         m_startNode.current, m_endNode.current, m_graphData.current
      )
      if (allFrames.length === 0) { return }

      setPaths([])
      cancelAnimationFrame(m_animHandle.current)

      const allGraphNodes: Map<number, GraphNode> = m_graphData.current.allGraphNodes
      const loop = (): void => {
         const frameData = allFrames.shift() as FrameData
         if (!frameData || frameData === undefined) { return }

         setPaths(oldPaths => {
            const fromPos = allGraphNodes.get(frameData.fromID)?.position as DeckPosition
            const toPos = allGraphNodes.get(frameData.toID)?.position as DeckPosition
            return [...oldPaths, { from: fromPos, to: toPos }]
         })
         m_animHandle.current = requestAnimationFrame(loop)
      }
      loop()

      // const loop = (): void => {
      //    if (allFrames.length === 0) { return }
      //       
      //    const allGraphNodes: Map<number, GraphNode> = m_graphData.current.allGraphNodes
      //    const frameData = allFrames.shift() as FrameData
      //    if (!frameData || frameData === undefined) { return }
      //      
      //    setPaths(oldPaths => {
      //       const fromPos = allGraphNodes.get(frameData.fromID)?.position as DeckPosition
      //       const toPos = allGraphNodes.get(frameData.toID)?.position as DeckPosition
      //       return [...oldPaths, { from: fromPos, to: toPos }]
      //    })
      //    setTimeout(loop)
      // }
      // loop()
   }

   return (
      <div className='h-full w-full'>
         <div className='flex flex-col items-center w-full h-full'>
            <Navbar runClickHandler={runClickHandler} />
            <DeckGL
               style={{ position: 'relative', width: '100%', height: '100%' }}
               initialViewState={{
                  longitude: 103.87312657779727, latitude: 1.3506264285088163, zoom: 15
               }}
               controller
               layers={[geoJsonLayer, pathLayer, startEndPointLayer]}
               onClick={(info: PickingInfo) => {
                  if (!info.coordinate) { return }
                  const x: number = info.coordinate[0]
                  const y: number = info.coordinate[1]
                  mapClickHandler([x, y], m_isPickingStart)
               }}
            />
         </div>
      </div>
   )
}

export default App


