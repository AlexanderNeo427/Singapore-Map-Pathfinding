import React, { useEffect, useMemo, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { PickingInfo, Position as DeckPosition, ScatterplotLayer } from 'deck.gl'
import { LineLayer } from 'deck.gl'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay, GoogleMapsOverlayProps } from '@deck.gl/google-maps';
import { FeatureCollection, Position as GeoPosition } from 'geojson';
import sg_geodata from './assets/sg_geodata.json'
import { BfsFrameData, breadthFirstSearch, createGraphData, GraphData } from './graph_algorithms/Declarations';

type FromToPair = { from: DeckPosition, to: DeckPosition }

const App: React.FC = () => {
   const m_map = useMap()
   const m_overlay = useMemo(() => new GoogleMapsOverlay({} as GoogleMapsOverlayProps), [])

   useEffect(() => {
      m_overlay.setMap(m_map)
      return () => m_overlay.setMap(null)
   }, [m_map, m_overlay])

   const m_graphData = useRef<GraphData>(new GraphData())
   const [m_paths, setPaths] = useState<FromToPair[]>([])

   useEffect(() => {
      console.log("Stuffs: ", import.meta.env.VITE_MAPS_API_KEY)

      m_graphData.current = createGraphData(sg_geodata as FeatureCollection)
      const allFrames: BfsFrameData[] = breadthFirstSearch(m_graphData.current)

      const loop = () => {
         setPaths(oldPaths => {
            const frameData = allFrames.shift() as BfsFrameData
            const fromPos = m_graphData.current.allGraphNodes.get(frameData.fromID)?.position as DeckPosition
            const toPos = m_graphData.current.allGraphNodes.get(frameData.toID)?.position as DeckPosition
            return [...oldPaths, { from: fromPos, to: toPos }]
         })
         setTimeout(loop, 1000)
      }
      loop()
   }, [])

   const lineLayer = new LineLayer<FromToPair>({
      id: 'Line Layer',
      data: m_paths,
      getSourcePosition: d => d.from,
      getTargetPosition: d => d.to,
      getWidth: 5,
      pickable: true,
      getColor: _ => [200, 100, 150]
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
         display: 'flex',
         justifyContent: 'center',
         alignItems: 'center',
         width: '100%', height: '80%',
      }}>
         <APIProvider apiKey={`${import.meta.env.GOOGLE_MAPS_API_KEY}`}>
            <DeckGL
               initialViewState={{
                  longitude: 103.8639095677252, latitude: 1.3538345746338294, zoom: 17,
               }}
               controller
               layers={[lineLayer]}
               onClick={(info: PickingInfo) => console.log("Clicked: ", info.coordinate)}
            />
         </APIProvider>
      </div>
   )
}

export default App


