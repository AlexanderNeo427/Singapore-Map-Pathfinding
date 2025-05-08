import singaporeBuildings from './assets/buildingData.json' // Smaller test data
// import singaporeBuildings from './assets/sg_building_with_heights.json'

import singaporeRoads from './assets/roadData.json' // Smaller test data
// import singaporeRoads from './assets/singapore_roads.json'

import Pathfinders from './typescript/PathfindingAlgorithms'
import React, { useEffect, useRef, useState } from 'react'
import { Feature, FeatureCollection } from 'geojson'
import GraphHelpers from './typescript/GraphHelpers'
import OverlayGUI from './components/OverlayGUI'
import Utils from './typescript/Utils'
import {
  PathfindingAlgoType,
  PathfindingResults,
  PATHFINDING_ALGO,
  StartEndPoint,
  TemporalLine,
  GraphData,
  GraphNode,
} from './typescript/Declarations'
import DeckGL, {
  ScatterplotLayer,
  GeoJsonLayer,
  PolygonLayer,
  PickingInfo,
  TripsLayer,
} from 'deck.gl'

const App: React.FC = () => {
  const m_pathfinder = useRef<PathfindingAlgoType>(Pathfinders.dijkstra)

  const m_graphData = useRef<GraphData>(new GraphData())
  const m_startNode = useRef<GraphNode | null>(null)
  const m_endNode = useRef<GraphNode | null>(null)
  const [m_isPickingStart, setIsPickingStart] = useState<boolean>(true)

  const m_animHandle = useRef<number>(-1)
  const m_frameTime = useRef<number>(0) // Read from this for the frame time
  const [m_timeElapsed, setTimeElapsed] = useState<number>(0)
  const [m_trips, setTrips] = useState<TemporalLine[]>([])
  const [m_finalPath, setFinalPath] = useState<TemporalLine[]>([])

  const [m_buildingsWithLevels, setBuildingsWithLevels] = useState<Feature[]>(
    []
  )

  useEffect(() => {
    m_graphData.current = GraphHelpers.buildGraph(singaporeRoads as FeatureCollection)

    setBuildingsWithLevels(_ => {
      return (singaporeBuildings as FeatureCollection).features.filter(
        feature => {
          return (
            feature.properties &&
            feature.properties['building:levels']
          )
        }
      )
    })

    let frameTimerUpdatorHandle: number = 0
    let prevTimeElapsed: number = 0
    const tickFrameTimer = (globalTimeElapsed: number): void => {
      m_frameTime.current = globalTimeElapsed - prevTimeElapsed
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

  const pathfindingLayer = new TripsLayer<TemporalLine>({
    id: 'Pathfinding Layer',
    data: m_trips,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 6,
    pickable: true,
    capRounded: true,
    currentTime: m_timeElapsed,
    trailLength: Infinity,
    getColor: [210, 180, 0],
  })

  const MAX_TIME_DIFF_MS = 900
  const pathfindingGlowLayer = new TripsLayer<TemporalLine>({
    id: 'Pathfinding Glow Layer',
    data: m_trips,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 18,
    pickable: true,
    capRounded: true,
    currentTime: m_timeElapsed,
    trailLength: MAX_TIME_DIFF_MS,
    getColor: [0, 200, 255, 180], // Include alpha value
  })

  const roadLayer = new GeoJsonLayer({
    id: 'Road Layer',
    data: singaporeRoads as FeatureCollection,
    filled: true,
    stroked: false,
    opacity: 0.9,
    lineWidthMinPixels: 3,
    getLineWidth: 4,
    getLineColor: [100, 60, 30, 70],
  })

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

  const buildingPolyLayer = new PolygonLayer<Feature>({
    id: 'Building Polygon Layer',
    data: m_buildingsWithLevels,
    getFillColor: d => {
      if (!d.properties || !d.properties['building:levels']) {
        return [0, 0, 0]
      }
      const noOfLevels = d.properties['building:levels'] as number
      const SHORT_COLOR = [20, 20, 30]
      const TALL_COLOR = [200, 200, 230]

      const t = noOfLevels / 26
      const r = Utils.lerp(SHORT_COLOR[0], TALL_COLOR[0], t)
      const g = Utils.lerp(SHORT_COLOR[1], TALL_COLOR[1], t)
      const b = Utils.lerp(SHORT_COLOR[2], TALL_COLOR[2], t)
      return [r, g, b]
    },
    getPolygon: d => {
      if (d.geometry.type === 'Polygon') {
        return d.geometry.coordinates
      }
      return []
    },
    getElevation: d => {
      if (!d.properties || !d.properties['building:levels']) {
        return 0
      }
      const LEVEL_HEIGHT = 5
      const noOfLevels = d.properties['building:levels'] as number
      return noOfLevels * LEVEL_HEIGHT
    },
    opacity: 0.8,
    extruded: true,
  })

  const START_END_POINT_SIZE = 7
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
    data: m_finalPath,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 20,
    pickable: true,
    capRounded: true,
    getColor: [170, 0, 250],
    currentTime: m_timeElapsed,
    trailLength: Infinity,
  })

  const finalPathGlowLayer = new TripsLayer<TemporalLine>({
    id: 'Final Path Layer',
    data: m_finalPath,
    getPath: d => [d.from.pos, d.to.pos],
    getTimestamps: d => [d.from.timeStamp, d.to.timeStamp],
    getWidth: 30,
    pickable: true,
    capRounded: true,
    getColor: [0, 200, 255, 250],
    currentTime: m_timeElapsed,
    trailLength: MAX_TIME_DIFF_MS,
  })

  const mapClickHandler = (
    clickCoord: [number, number],
    isPickingStart: boolean
  ): void => {
    let nodeClosestToClick: GraphNode | null = null
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

    if (!nodeClosestToClick || nodeClosestToClick === null) {
      return
    }
    if (minDist > 0.0004) {
      return
    } // Tolerance

    if (isPickingStart) {
      m_startNode.current = nodeClosestToClick
    } else {
      m_endNode.current = nodeClosestToClick
    }

    setIsPickingStart(val => !val)
  }

  const runClickHandler = (): void => {
    if (!m_startNode.current || !m_endNode.current) {
      return
    }

    const results: PathfindingResults = m_pathfinder.current({
      startNode: m_startNode.current,
      endNode: m_endNode.current,
      graphData: m_graphData.current,
    })
    // console.log("Pathfinding Results: ", results)
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
    setTimeElapsed(0)
  }

  return (
    <div className="h-full w-full">
      <div className="flex flex-col items-center w-full h-full">
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
          controller
          layers={[
            roadLayer,
            // buildingLayer,
            buildingPolyLayer,
            pathfindingLayer,
            pathfindingGlowLayer,
            finalPathLayer,
            finalPathGlowLayer,
            startEndPointLayer,
          ]}
          onClick={(info: PickingInfo) => {
            if (!info.coordinate) {
              return
            }
            const x = info.coordinate[0] as number
            const y = info.coordinate[1] as number
            mapClickHandler([x, y], m_isPickingStart)
          }}
        ></DeckGL>
        <OverlayGUI
          runClickHandler={runClickHandler}
          algoSetter={algo => {
            switch (algo) {
              case PATHFINDING_ALGO.BFS:
                m_pathfinder.current = Pathfinders.breadthFirstSearch
                break
              case PATHFINDING_ALGO.DIJKSTRA:
                m_pathfinder.current = Pathfinders.dijkstra
                break
              case PATHFINDING_ALGO.AStar:
                m_pathfinder.current = Pathfinders.AStar
                break
              case PATHFINDING_ALGO.DFS:
                m_pathfinder.current = Pathfinders.depthFirstSearch
                break
              default:
                m_pathfinder.current = Pathfinders.breadthFirstSearch
                break
            }
          }}
        />
      </div>
    </div>
  )
}

export default App
