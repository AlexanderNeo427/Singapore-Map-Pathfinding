// import singaporeBuildings from '../assets/buildingData.json' // Smaller test data
// import singaporeBuildings from './assets/sg_building_with_heights.json'

// import singaporeRoads from '../assets/roadData.json' // Smaller test data
import singaporeRoads from '../assets/singapore_roads.json'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import Pathfinders from '../typescript/PathfindingAlgorithms'
import useTimeElapsedManager from '../hooks/useTimeElapsed'
import { Map as Basemap } from '@vis.gl/react-maplibre'
import binGraphDataURL from '../assets/graph_data.bin'
import GraphHelpers from '../typescript/GraphHelpers'
import { SG_BOUNDS } from '../typescript/Globals'
import DeckGL, {
  ScatterplotLayer,
  MapController,
  MapViewState,
  PickingInfo,
  TripsLayer,
} from 'deck.gl'
import Utils from '../typescript/Utils'
import {
  PathfindingResults,
  PATHFINDER_TYPE,
  StartEndPoint,
  TemporalLine,
  Pathfinder,
  GraphNode,
  GraphData,
} from '../typescript/Declarations'
import { FeatureCollection } from 'geojson'

export interface MapRendererRef {
  runPathfinding: () => Promise<void>
}

interface MapRendererProps {
  pathfinderType: PATHFINDER_TYPE
}

export const PathfindingAlgoMap = new Map<PATHFINDER_TYPE, Pathfinder>([
  [PATHFINDER_TYPE.BFS, Pathfinders.breadthFirstSearch],
  [PATHFINDER_TYPE.DFS, Pathfinders.depthFirstSearch],
  [PATHFINDER_TYPE.DIJKSTRA, Pathfinders.dijkstra],
  [PATHFINDER_TYPE.AStar, Pathfinders.AStar],
])

const MapRenderer = forwardRef<MapRendererRef, MapRendererProps>((props, ref) => {
  const [graphData, setGraphData] = useState<GraphData>(new GraphData())
  const [startNode, setStartNode] = useState<GraphNode | null>(null)
  const [endNode, setEndNode] = useState<GraphNode | null>(null)

  const [trips, setTrips] = useState<TemporalLine[]>([])
  const [finalPath, setFinalPath] = useState<TemporalLine[]>([])
  const [isPickingStart, setIsPickingStart] = useState<boolean>(true)

  const timeElapsedManager = useTimeElapsedManager()

  // const [buildingsWithLevels, setBuildingsWithLevels] = useState<Feature[]>([])

  useImperativeHandle(ref, () => ({
    runPathfinding: () => runPathfindingAlgo()
  }))

  const runPathfindingAlgo = async (): Promise<void> => {
    const pathfinder = PathfindingAlgoMap.get(props.pathfinderType)
    if (!pathfinder || pathfinder === undefined || pathfinder === null) {
      return
    }

    if (!startNode || !endNode) {
      return
    }

    const results: PathfindingResults = await pathfinder({
      startNode: startNode,
      endNode: endNode,
      graphData: graphData,
    })
    if (results.finalPath === null) {
      return
    }

    setTrips(results.allTemporalPaths)

    const finalTemporalPath: TemporalLine[] =
      GraphHelpers.convertDeckPositionsToTemporalPath(
        results.finalPath,
        results.totalDuration
      )
    setFinalPath(finalTemporalPath)
    timeElapsedManager.resetTimeElapsed()
  }

  const handleViewStateChange = (viewState: MapViewState): void => {
    // console.log("lat: ", viewState.latitude)
    // console.log("lng: ", viewState.longitude)
    viewState.minZoom = 12
    viewState.maxZoom = 16

    viewState.latitude = Utils.constrain(
      viewState.latitude,
      SG_BOUNDS.MIN.LAT,
      SG_BOUNDS.MAX.LAT
    )

    viewState.longitude = Utils.constrain(
      viewState.longitude,
      SG_BOUNDS.MIN.LNG,
      SG_BOUNDS.MAX.LNG
    )
  }

  useEffect(() => {
    const initializeGraphData = async (): Promise<void> => {
      // const graphData = await GraphHelpers.buildGraphFromBinary(binGraphDataURL)
      const graphData = await GraphHelpers.buildGraph(singaporeRoads as FeatureCollection)
      setGraphData(graphData)
    }
    initializeGraphData()
    // setBuildingsWithLevels(_ => {
    //   return (singaporeBuildings as FeatureCollection).features.filter(
    //     feature => {
    //       return (
    //         feature.properties &&
    //         feature.properties['building:levels']
    //       )
    //     }
    //   )
    // })
  }, [])

  const pathfindingLayer = new TripsLayer<TemporalLine>({
    id: 'Pathfinding Layer',
    data: trips,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 6,
    pickable: true,
    capRounded: true,
    currentTime: timeElapsedManager.timeElapsed,
    trailLength: Infinity,
    getColor: [210, 180, 0],
  })

  const MAX_TIME_DIFF_MS = 900
  const pathfindingGlowLayer = new TripsLayer<TemporalLine>({
    id: 'Pathfinding Glow Layer',
    data: trips,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 18,
    pickable: true,
    capRounded: true,
    currentTime: timeElapsedManager.timeElapsed,
    trailLength: MAX_TIME_DIFF_MS,
    getColor: [0, 200, 255, 180], // Include alpha value
  })

  // const roadLayer = new GeoJsonLayer({
  //   id: 'Road Layer',
  //   data: singaporeRoads as FeatureCollection,
  //   filled: true,
  //   stroked: false,
  //   opacity: 0.9,
  //   lineWidthMinPixels: 3,
  //   getLineWidth: 4,
  //   getLineColor: [100, 60, 30, 70],
  // })

  // const buildingLayer = new GeoJsonLayer<Feature>({
  //   id: 'Building Layer', data: (singaporeBuildings as FeatureCollection),
  //   getElevation: d => {
  //     return 100
  //   },
  //   extruded: true,
  //   filled: true, stroked: false, opacity: 0.4,
  //   getLineWidth: 5,
  //   getLineColor: [74, 80, 87],
  // })

  // const buildingPolyLayer = new PolygonLayer<Feature>({
  //   id: 'Building Polygon Layer',
  //   data: buildingsWithLevels,
  //   getFillColor: d => {
  //     if (!d.properties || !d.properties['building:levels']) {
  //       return [0, 0, 0]
  //     }
  //     const noOfLevels = d.properties['building:levels'] as number
  //     const SHORT_COLOR = [20, 20, 30]
  //     const TALL_COLOR = [200, 200, 230]

  //     const t = noOfLevels / 26
  //     const r = Utils.lerp(SHORT_COLOR[0], TALL_COLOR[0], t)
  //     const g = Utils.lerp(SHORT_COLOR[1], TALL_COLOR[1], t)
  //     const b = Utils.lerp(SHORT_COLOR[2], TALL_COLOR[2], t)
  //     return [r, g, b]
  //   },
  //   getPolygon: d => {
  //     if (d.geometry.type === 'Polygon') {
  //       return d.geometry.coordinates
  //     }
  //     return []
  //   },
  //   getElevation: d => {
  //     if (!d.properties || !d.properties['building:levels']) {
  //       return 0
  //     }
  //     const LEVEL_HEIGHT = 5
  //     const noOfLevels = d.properties['building:levels'] as number
  //     return noOfLevels * LEVEL_HEIGHT
  //   },
  //   opacity: 0.8,
  //   extruded: true,
  // })

  const START_END_POINT_SIZE = 7
  const startEndPointLayer = new ScatterplotLayer<StartEndPoint>({
    id: 'Start & End Point Layer',
    data: ((): StartEndPoint[] => {
      const points: StartEndPoint[] = []
      if (startNode) {
        points.push({ node: startNode, isStart: true })
      }
      if (endNode) {
        points.push({ node: endNode, isStart: false })
      }
      return points
    })(),
    getFillColor: d => (d.isStart ? [255, 0, 0] : [0, 255, 0]),
    radiusMinPixels: START_END_POINT_SIZE,
    radiusMaxPixels: START_END_POINT_SIZE,
    getRadius: START_END_POINT_SIZE,
    stroked: true,
    getPosition: d => d.node.position,
    getLineWidth: 3,
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 3,
  })

  const finalPathLayer = new TripsLayer<TemporalLine>({
    id: 'Final Path Layer',
    data: finalPath,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 20,
    pickable: true,
    capRounded: true,
    getColor: [170, 0, 250],
    currentTime: timeElapsedManager.timeElapsed,
    trailLength: Infinity,
  })

  const finalPathGlowLayer = new TripsLayer<TemporalLine>({
    id: 'Final Path Glow Layer',
    data: finalPath,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 30,
    pickable: true,
    capRounded: true,
    getColor: [0, 200, 255, 250],
    currentTime: timeElapsedManager.timeElapsed,
    trailLength: MAX_TIME_DIFF_MS,
  })

  const mapClickHandler = (
    clickCoord: [number, number],
    isPickingStart: boolean,
  ): void => {
    let nodeClosestToClick: GraphNode | null = null
    let minDist: number = 9999999

    graphData.allGraphNodes.forEach(node => {
      const dx = clickCoord[0] - node.position[0]
      const dy = clickCoord[1] - node.position[1]
      const distToCoord: number = Math.sqrt(dx * dx + dy * dy)
      if (distToCoord < minDist) {
        minDist = distToCoord
        nodeClosestToClick = node
      }
    })

    if (!nodeClosestToClick || nodeClosestToClick === null) {
      return
    }
    if (minDist > 0.0003) {
      return
    } // Tolerance

    if (isPickingStart) {
      setStartNode(nodeClosestToClick)
    } else {
      setEndNode(nodeClosestToClick)
    }
    setIsPickingStart(val => !val)
  }

  return (
    <DeckGL
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
      }}
      initialViewState={{
        longitude: 103.87312657779727,
        latitude: 1.3506264285088163,
        zoom: 15,
      }}
      controller={{
        type: MapController,
        scrollZoom: {
          smooth: true,
          speed: 0.035
        }
      }}
      layers={[
        // roadLayer,
        // buildingLayer,
        // buildingPolyLayer,
        pathfindingLayer,
        pathfindingGlowLayer,
        finalPathLayer,
        finalPathGlowLayer,
        startEndPointLayer,
      ]}
      onViewStateChange={vs => handleViewStateChange(vs.viewState as MapViewState)}
      onClick={(info: PickingInfo) => {
        if (!info.coordinate) {
          return
        }
        const x = info.coordinate[0] as number
        const y = info.coordinate[1] as number
        mapClickHandler([x, y], isPickingStart)
      }}
    >
      <Basemap mapStyle={'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'} />
    </DeckGL>
  )
})

export default MapRenderer