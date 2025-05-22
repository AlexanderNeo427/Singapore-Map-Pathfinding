import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { PATHFINDING_GLOBALS, SG_BOUNDS } from '../typescript/Globals'
import Pathfinders from '../typescript/PathfindingAlgorithms'
import { Bounce, toast, ToastOptions } from 'react-toastify'
import useTimeElapsedManager from '../hooks/useTimeElapsed'
import { Map as Basemap } from '@vis.gl/react-maplibre'
import binGraphDataURL from '../assets/graph_data.bin'
import GraphHelpers from '../typescript/GraphHelpers'
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
import DeckGL, {
  ScatterplotLayer,
  MapController,
  MapViewState,
  PickingInfo,
  TripsLayer,
} from 'deck.gl'

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

const sharedToastOptions = {
  position: "bottom-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
  transition: Bounce,
} as ToastOptions

const MapRenderer = forwardRef<MapRendererRef, MapRendererProps>((props, ref) => {
  const [graphData, setGraphData] = useState<GraphData>(new GraphData())
  const [startNode, setStartNode] = useState<GraphNode | null>(null)
  const [endNode, setEndNode] = useState<GraphNode | null>(null)

  const [trips, setTrips] = useState<TemporalLine[]>([])
  const [finalPath, setFinalPath] = useState<TemporalLine[]>([])
  const [isPickingStart, setIsPickingStart] = useState<boolean>(true)

  const timeElapsedManager = useTimeElapsedManager()

  useImperativeHandle(ref, () => ({
    runPathfinding: () => runPathfindingAlgo()
  }))

  const runPathfindingAlgo = async (): Promise<void> => {
    setTrips([])
    setFinalPath([])
    timeElapsedManager.resetTimeElapsed()

    const pathfinder = PathfindingAlgoMap.get(props.pathfinderType)
    if (!pathfinder || pathfinder === undefined || pathfinder === null) {
      return
    }

    if (!startNode && !endNode) {
      toast.warning('Click on the map to specify "start" and "end" positions', sharedToastOptions)
      return
    }

    if (startNode && !endNode) {
      toast.warning('Click on the map to specify an "end" position', sharedToastOptions)
      return
    }

    if (!startNode || !endNode) {
      toast.warning('Click on the map to specify "start" and "end" positions', sharedToastOptions)
      return
    }

    const distanceInMeters = Utils.getGeographicNodeDistance(startNode, endNode)
    if (distanceInMeters > PATHFINDING_GLOBALS.MAX_RADIUS_METERS) {
      toast.warning(PATHFINDING_GLOBALS.EXCEED_RADIUS_MSG, sharedToastOptions)
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
      const graphData = await GraphHelpers.buildGraphFromBinary(binGraphDataURL)
      setGraphData(graphData)
    }
    initializeGraphData()
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

  const pathfindingMaxRadiusLayer = new ScatterplotLayer<GraphNode>({
    id: 'Pathfinding Max Radius Layer',
    data: [startNode],
    getFillColor: [50, 60, 70, 80],
    getLineColor: [200, 255, 240, 90],
    getLineWidth: 7,
    stroked: true,
    getRadius: PATHFINDING_GLOBALS.MAX_RADIUS_METERS,
    getPosition: d => d.position
  })

  const finalPathLayer = new TripsLayer<TemporalLine>({
    id: 'Final Path Layer',
    data: finalPath,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 16,
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
    getWidth: 25,
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
    if (minDist > 0.00038) {
      return
    } // Tolerance

    if (isPickingStart) {
      setStartNode(nodeClosestToClick)
    } else {
      if (!startNode) {
        return
      }
      const distanceInMeters = Utils.getGeographicNodeDistance(startNode, nodeClosestToClick)
      if (distanceInMeters > PATHFINDING_GLOBALS.MAX_RADIUS_METERS) {
        toast.error(PATHFINDING_GLOBALS.EXCEED_RADIUS_MSG, sharedToastOptions)
        return
      }
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
        pathfindingMaxRadiusLayer,
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
      <Basemap mapStyle={`
        https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
      `} />
    </DeckGL>
  )
})

export default MapRenderer