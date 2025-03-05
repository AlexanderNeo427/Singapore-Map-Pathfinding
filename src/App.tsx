import { FeatureCollection } from 'geojson';
import sg_geodata from './assets/sg_geodata.json'
import React, { useEffect, useRef, useState } from 'react'
import DeckGL, { Position as DeckPosition, ScatterplotLayer, LineLayer } from 'deck.gl'
import {
   FrameData, breadthFirstSearch, createGraphData, FromToPair, GraphData,
   GraphNode,
   depthFirstSearch
} from './graph_algorithms/Declarations';

const App: React.FC = () => {
   // const m_map = useMap()
   // const m_overlay = useMemo(() => new GoogleMapsOverlay({} as GoogleMapsOverlayProps), [])
   //
   // useEffect(() => {
   //    m_overlay.setMap(m_map)
   //    return () => m_overlay.setMap(null)
   // }, [m_map, m_overlay])

   const m_graphData = useRef<GraphData>(new GraphData())
   const [m_map, setMap] = useState<FromToPair[]>([])
   const [m_paths, setPaths] = useState<FromToPair[]>([])

   useEffect(() => {
      m_graphData.current = createGraphData(sg_geodata as FeatureCollection)
      // setMap(m_graphData.current.fromToPairs)

      const mapFromToPairs: FromToPair[] = []
      m_graphData.current.allGraphNodes.forEach((node, id) => {
         const allNeighbourID = m_graphData.current.adjacencyList.get(id) as Set<number>
         allNeighbourID.forEach(neighbourID => {
            const neighbourNode = m_graphData.current.allGraphNodes.get(neighbourID)
            mapFromToPairs.push({
               from: node.position,
               to: neighbourNode?.position as DeckPosition
            })
         })
      })
      setMap(mapFromToPairs)

      // const allFrames: FrameData[] = breadthFirstSearch(m_graphData.current)
      const allFrames: FrameData[] = depthFirstSearch(m_graphData.current)
      const loop = () => {
         const allGraphNodes: Map<number, GraphNode> = m_graphData.current.allGraphNodes
         setPaths(oldPaths => {
            const frameData = allFrames.shift() as FrameData
            const fromPos = allGraphNodes.get(frameData.fromID)?.position as DeckPosition
            const toPos = allGraphNodes.get(frameData.toID)?.position as DeckPosition
            return [...oldPaths, { from: fromPos, to: toPos }]
         })
         setTimeout(loop, 50)
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

   const scatterLayer = new ScatterplotLayer<FromToPair>({
      id: 'Scatterplot Layer',
      data: m_paths,
      getPosition: d => d.to,
      getRadius: 8,
      getFillColor: _ => [150, 100, 30]
   })

   // const tripsLayer = new TripsLayer<FromPair[]>({
   //    id: 'Trips Layer',
   //    data: m_paths,
   //    getPath: d => {
   //       return d.map(p => p.from)
   //    },
   //    getTimestamps: d => {
   //       return d.map(_ => 999 - 1554772579000)
   //    },
   //    getColor: [253, 128, 93],
   //    currentTime: 500,
   //    trailLength: 600,
   //    capRounded: true,
   //    jointRounded: true,
   //    widthMinPixels: 8
   // })

   // type DataType = {
   //    waypoints: {
   //       coordinates: [longitude: number, latitude: number];
   //       timestamp: number;
   //    }[]
   // };
   //
   // const tripsLayer = new TripsLayer<DataType>({
   //    id: 'TripsLayer',
   //    data: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf.trips.json',
   //    getPath: (d: DataType) => {
   //       console.log(d)
   //       return d.waypoints.map(p => p.coordinates)
   //    },
   //    getTimestamps: (d: DataType) => d.waypoints.map(p => p.timestamp - 1554772579000),
   //    getColor: [253, 128, 93],
   //    currentTime: 500,
   //    trailLength: 600,
   //    capRounded: true,
   //    jointRounded: true,
   //    widthMinPixels: 8
   // });

   return (
      <div style={{
         display: 'flex', justifyContent: 'center',
         alignItems: 'center', width: '100%', height: '80%',
      }}>
         {/* <APIProvider apiKey={`${import.meta.env.GOOGLE_MAPS_API_KEY}`}>
            <Map
               defaultCenter={{ lng: 103.8639095677252, lat: 1.3538345746338294 }}
               defaultZoom={17}
               mapId={`${import.meta.env.VITE_MAP_ID}`}
            >
               <DeckGLOverlay layers={[lineLayer]} />
            </Map>
         </APIProvider> */}
         <DeckGL
            initialViewState={{
               longitude: 103.8639095677252, latitude: 1.3538345746338294, zoom: 14
            }}
            controller
            layers={[mapLayer, pathLayer]} />
      </div>
   )
}

export default App


