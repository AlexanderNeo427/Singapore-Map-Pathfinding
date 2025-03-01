import React, { useEffect, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { PickingInfo, Position as DeckPosition } from 'deck.gl'
import { LineLayer } from 'deck.gl'
import { Feature, FeatureCollection, LineString, Position as GeoPosition } from 'geojson';
import sg_geodata from './assets/sg_geodata.json'
import { GraphNode, Utils } from './graph_algorithms/Declarations';

type FromToPair = { from: DeckPosition, to: DeckPosition }

const App: React.FC = () => {
   const m_allGraphNodesRef = useRef<Map<number, GraphNode>>(new Map())
   const m_adjacencyListRef = useRef<Map<number, Set<number>>>(new Map())
   const m_queueOfIDs = useRef<number[]>([])
   const m_visitedRef = useRef<Set<number>>(new Set())
   // const m_nodeRef = useRef<GraphNode>(new GraphNode(0, [0, 0])) // Dummy node
   const [m_paths, setPaths] = useState<FromToPair[]>([])

   const createGraphData = (alLFeatures: FeatureCollection)
      : [Map<number, GraphNode>, Map<number, Set<number>>] => {

      const allGraphNodes = new Map<number, GraphNode>()
      const adjacencyList = new Map<number, Set<number>>()

      alLFeatures.features.forEach((feature: Feature) => {
         if (feature.geometry.type !== 'LineString') {
            return
         }
         const allWayCoords: GeoPosition[] = (feature.geometry as LineString).coordinates
         for (let i = 0; i < (allWayCoords.length - 1); i++) {

            // Lazily instantiate new graph node for 'currNodeID'
            // (assuming it doesn't exist yet)
            const currNodeID: number = Utils.getCoordHash(allWayCoords[i])
            if (!allGraphNodes.has(currNodeID)) {
               const newCoords: DeckPosition = Utils.toDeckPosition(allWayCoords[i])
               allGraphNodes.set(
                  currNodeID, new GraphNode(currNodeID, newCoords)
               )

               // Init 'neighbour IDs' set for 'currNodeID'
               adjacencyList.set(currNodeID, new Set())
            }

            // Lazily instantiate new graph node for 'otherNodeID' 
            // (assuming it doesn't exist yet)
            const otherNodeID: number = Utils.getCoordHash(allWayCoords[i + 1])
            if (!allGraphNodes.has(otherNodeID)) {
               const otherCoords: DeckPosition = Utils.toDeckPosition(allWayCoords[i + 1])
               allGraphNodes.set(
                  otherNodeID, new GraphNode(otherNodeID, otherCoords)
               )

               // Init 'neighbour IDs' set for 'otherNodeID'
               adjacencyList.set(otherNodeID, new Set())
            }

            // Bi-directional ways
            adjacencyList.get(currNodeID)?.add(otherNodeID)
            adjacencyList.get(otherNodeID)?.add(currNodeID)
         }
      })
      return [allGraphNodes, adjacencyList]
   }

   useEffect(() => {
      const graphData = createGraphData(sg_geodata as FeatureCollection)
      m_allGraphNodesRef.current = graphData[0]
      m_adjacencyListRef.current = graphData[1]

      const [[firstNodeID, _]] = m_allGraphNodesRef.current.entries()
      m_queueOfIDs.current = [firstNodeID]

      let prevID: number | null = null;

      const breadthFirstSearch = (): void => {
         if (!m_queueOfIDs.current || m_queueOfIDs.current.length === 0) {
            console.log("No neighbours left, exiting...")
            return
         }
         const idToProcess = m_queueOfIDs.current.shift() as number
         m_visitedRef.current.add(idToProcess) // Mark current node as visited

         // Get neighbours
         const neighbourIDs = m_adjacencyListRef.current.get(idToProcess) as Set<number>
         if (neighbourIDs.size === 0) {
            console.log("No neighbours")
            return
         }

         // Add all (unvisited) neighbours to queue
         neighbourIDs.forEach(id => {
            if (!m_visitedRef.current.has(id)) {
               m_queueOfIDs.current.push(id)
            }
         })

         const currNode = m_allGraphNodesRef.current.get(idToProcess)
         const prevNode = prevID ? m_allGraphNodesRef.current.get(prevID) : null
         setPaths(oldPaths => {
            return [...oldPaths, {
               from: prevNode?.position || currNode?.position as DeckPosition,
               to: currNode?.position as DeckPosition
            }]
         })
         
         prevID = idToProcess
         setTimeout(breadthFirstSearch, 100)
      }
      breadthFirstSearch()
   }, [])

   const layer = new LineLayer<FromToPair>({
      id: 'LineLayer',
      data: m_paths,
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
            initialViewState={{
               longitude: 103.873, latitude: 1.348, zoom: 15,
            }}
            controller
            layers={[layer]}
            onClick={(info: PickingInfo) => console.log("Clicked: ", info.coordinate)}
         />
      </div>
   )
}

export default App


