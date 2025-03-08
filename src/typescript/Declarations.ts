import { Position as DeckPosition } from "deck.gl"

export type PathfindingAlgoType = (params: PathfindingParameters) => PathfindingResults

export type TemporalPosition = { pos: DeckPosition, timeStamp: number }

export type TemporalPath = { from: TemporalPosition, to: TemporalPosition }

export type StartEndPoint = { node: GraphNode, isStart: boolean }

export class GraphNode {
    public readonly ID: number
    public readonly position: DeckPosition

    constructor(nodeID: number, position: DeckPosition) {
        this.ID = nodeID
        this.position = position
    }
}

export class GraphData {
    public allGraphNodes: Map<number, GraphNode> = new Map()
    public adjacencyList: Map<number, Set<number>> = new Map()
}

export type PathfindingParameters = {
    startNode: GraphNode
    endNode: GraphNode
    graphData: GraphData
}

export class PathfindingResults {
    public readonly allTemporalPaths: TemporalPath[]
    public finalPath: DeckPosition[] | null

    constructor(allTemporalPaths: TemporalPath[], finalPath: DeckPosition[] | null) {
        this.allTemporalPaths = allTemporalPaths
        this.finalPath = finalPath
    }
}