import { PROTOBUF_PARAMS } from '../../src/typescript/Globals'
import { GraphData } from '../../src/typescript/Declarations'
import GraphHelpers from '../../src/typescript/GraphHelpers'
import { FeatureCollection } from 'geojson'
import protobuf from 'protobufjs'
import path from 'path'
import fs from 'fs'

const extractPackedGraph = async (graphData: GraphData): Promise<GraphData> => {
    let nextAvailableID = 0
    const packedIdMap = new Map<number, number>()

    const packedGraphData = new GraphData()
    packedGraphData.allGraphNodes = new Map()
    packedGraphData.adjacencyList = new Map()

    graphData.allGraphNodes.forEach((node, id) => {
        if (!packedIdMap.has(id)) {
            packedIdMap.set(id, nextAvailableID)
            nextAvailableID++
        }

        const packedID = packedIdMap.get(id) as number
        packedGraphData.allGraphNodes.set(packedID, node)
    })

    graphData.adjacencyList.forEach((allNeighbourIDs, id) => {
        const packedID = packedIdMap.get(id) as number
        const packedNeighbourIDs = Array.from(allNeighbourIDs).map(neighbourID => (
            packedIdMap.get(neighbourID) as number
        ))
        packedGraphData.adjacencyList.set(packedID, new Set(packedNeighbourIDs))
    })
    return packedGraphData
}

const preprocess = async (geoJson: FeatureCollection): Promise<void> => {
    const graphData = await extractPackedGraph(GraphHelpers.buildGraph(geoJson))

    const protoFilePath = path.resolve(__dirname, '../../src/typescript/pathfinding.proto')
    const root = await protobuf.load(protoFilePath)
    const nodeType = root.lookupType(PROTOBUF_PARAMS.NODE_TYPE)
    const edgeType = root.lookupType(PROTOBUF_PARAMS.EDGE_TYPE)
    const graphType = root.lookupType(PROTOBUF_PARAMS.GRAPH_TYPE)

    console.log("....preparing to create pbNodes...")
    const pbNodes = Array.from(graphData.allGraphNodes).map(([id, node]) => {
        return nodeType.create({
            id: id,
            x: node.position[0],
            y: node.position[1],
        })
    })
    console.log("pbNodes created successfully!")

    console.log("....preparing to create pbEdges...")
    const pbEdges = (
        (): protobuf.Message[] => {
            const arr: protobuf.Message[] = []
            graphData.adjacencyList.forEach((allNeighbourIDs, nodeID) => {
                allNeighbourIDs.forEach(neighbourID => {
                    const edge = edgeType.create({
                        fromID: nodeID,
                        toID: neighbourID
                    })
                    arr.push(edge)
                })
            })
            return arr
        }
    )()
    console.log("pbEdges created successfully!")

    console.log(".....preparing to create pbGraph...")
    const pbGraph = graphType.create({
        nodes: pbNodes,
        edges: pbEdges
    })
    console.log("pbGraph created successfully!")

    const binaryData = graphType.encode(pbGraph).finish()
    const outputPath = path.resolve(__dirname, PROTOBUF_PARAMS.OUTPUT_NAME)
    fs.writeFileSync(outputPath, binaryData)

    console.log("Successfully written data to: ", outputPath)
}

// For debugging
// const deserialize = async (): Promise<void> => { 
//     const protoPath = path.resolve(__dirname, PROTOBUF_PARAMS.NAME)
//     const root = await protobuf.load(protoPath)
//     const graphType = root.lookupType(PROTOBUF_PARAMS.GRAPH_TYPE)

//     const inputPath = path.resolve(__dirname, PROTOBUF_PARAMS.OUTPUT_NAME)
//     const binaryData = fs.readFileSync(inputPath)

//     const deserializedGraph = graphType.decode(binaryData)
//     console.log("Deserialized Graph: ", deserializedGraph)
// }

try {
    const dataPath = path.resolve(__dirname, "sg_roads_small.geojson")
    const rawSgData = fs.readFileSync(dataPath, 'utf-8')
    const singaporeGeoJSON = JSON.parse(rawSgData)
    await preprocess(singaporeGeoJSON as FeatureCollection)
    // await deserialize()
} catch (err) {
    console.error((err as Error).message)
}