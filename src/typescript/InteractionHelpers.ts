import { Dispatch, SetStateAction } from "react"
import GraphHelpers from "./GraphHelpers"
import {
    Pathfinder,
    PathfindingResults,
    TemporalLine,
    GraphData,
    GraphNode,
} from "./Declarations"

const InteractionHelpers = {
    // ==============================================
    // ========== 'MAP' CLICK HANDLER ===============
    // ==============================================
    // mapClickHandler: (
    //     clickCoord: [number, number],
    //     graphData: GraphData,
    // ): (GraphNode | null) => {
    //     let nodeClosestToClick: (GraphNode | null) = null
    //     let minDist: number = 9999999

    //     graphData.allGraphNodes.forEach(node => {
    //         const dx = clickCoord[0] - node.position[0]
    //         const dy = clickCoord[1] - node.position[1]
    //         const distToCoord: number = Math.sqrt(dx * dx + dy * dy)
    //         if (distToCoord < minDist) {
    //             minDist = distToCoord
    //             nodeClosestToClick = node
    //         }
    //     })
    //     if (!nodeClosestToClick || nodeClosestToClick === null) {
    //         return null
    //     }
    //     if (minDist > 0.0004) { // Tolerance
    //         return null
    //     }
    //     return nodeClosestToClick
    // },
    // ==============================================
    // =========== 'RUN' CLICK HANDLER ==============
    // ==============================================
    // runClickHandler: (
    //     pathfinder: PathfindingAlgoType,
    //     graphData: GraphData,
    //     startNode: (GraphNode | null),
    //     endNode: (GraphNode | null),

    //     tripsSetter: Dispatch<SetStateAction<TemporalLine[]>>,
    //     finalPathSetter: Dispatch<SetStateAction<TemporalLine[]>>,
    //     timeElapsedResetter: () => void
    // ): void => {
    //     if (!startNode || !endNode) {
    //         return
    //     }

    //     const results: PathfindingResults = pathfinder({
    //         startNode: startNode,
    //         endNode: endNode,
    //         graphData: graphData,
    //     })
    //     if (results.finalPath === null) {
    //         return
    //     }

    //     tripsSetter(results.allTemporalPaths)

    //     const finalTemporalPath: TemporalLine[] =
    //         GraphHelpers.convertDeckPositionsToTemporalPath(
    //             results.finalPath,
    //             results.totalDuration
    //         )
    //     finalPathSetter(finalTemporalPath)
    //     timeElapsedResetter()
    // }
}

export default InteractionHelpers