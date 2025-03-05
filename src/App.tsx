import { FeatureCollection } from 'geojson';
import sg_geodata from './assets/sg_geodata.json'
// import sg_geodata from './assets/temp_geodata.json'
import React, { useEffect, useRef, useState } from 'react'
import DeckGL, { Position as DeckPosition, ScatterplotLayer, LineLayer } from 'deck.gl'
import {
   FrameData, breadthFirstSearch, createGraphData, FromToPair, GraphData,
   GraphNode,
   depthFirstSearch
} from './graph_algorithms/Declarations';

const App: React.FC = () => {
   const m_graphData = useRef<GraphData>(new GraphData())
   const [m_map, setMap] = useState<FromToPair[]>([])
   const [m_paths, setPaths] = useState<FromToPair[]>([])

   useEffect(() => {
      m_graphData.current = createGraphData(sg_geodata as FeatureCollection)

      const mapFromToPairs: FromToPair[] = []
      m_graphData.current.allGraphNodes.forEach((node, id) => {
         const allNeighbourID = m_graphData.current.adjacencyList.get(id) as Set<number>
         allNeighbourID.forEach(neighbourID => {
            const neighbourNode = m_graphData.current.allGraphNodes.get(neighbourID)
            mapFromToPairs.push({
               from: node.position, to: neighbourNode?.position as DeckPosition
            })
         })
      })
      setMap(mapFromToPairs)

      const allFrames: FrameData[] = breadthFirstSearch(m_graphData.current)
      const loop = (): void => {
         if (allFrames.length === 0) { return }

         const allGraphNodes: Map<number, GraphNode> = m_graphData.current.allGraphNodes
         const frameData = allFrames.shift() as FrameData
         if (!frameData || frameData === undefined) { return }

         setPaths(oldPaths => {
            const fromPos = allGraphNodes.get(frameData.fromID)?.position as DeckPosition
            const toPos = allGraphNodes.get(frameData.toID)?.position as DeckPosition
            return [...oldPaths, { from: fromPos, to: toPos }]
         })
         setTimeout(loop, 20)
      }
      loop()
   }, [])

   const pathLayer = new LineLayer<FromToPair>({
      id: 'Path Layer',
      data: m_paths,
      getSourcePosition: d => d.from,
      getTargetPosition: d => d.to,
      getWidth: 2,
      pickable: true,
      getColor: _ => [250, 200, 250]
   });

   const mapLayer = new LineLayer<FromToPair>({
      id: 'Map Layer',
      data: m_map,
      getSourcePosition: d => d.from,
      getTargetPosition: d => d.to,
      getWidth: 8,
      pickable: true,
      getColor: _ => [0, 0, 0]
   });

   // const scatterLayer = new ScatterplotLayer<FromToPair>({
   //    id: 'Scatterplot Layer',
   //    data: m_paths,
   //    getPosition: d => d.to,
   //    getRadius: 8,
   //    getFillColor: _ => [150, 100, 30]
   // })

   return (
      <div style={{
         display: 'flex', justifyContent: 'center',
         alignItems: 'center', width: '100%', height: '80%',
      }}>
         <DeckGL
            initialViewState={{
               longitude: 103.87312657779727, latitude: 1.3506264285088163, zoom: 15
            }}
            controller
            layers={[mapLayer, pathLayer]} 
            onClick={info => console.log(info.coordinate)}
         />
      </div>
   )
}

export default App


