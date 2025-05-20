import singaporeRoadData from '../../assets/roadData.json'
import { FeatureCollection } from 'geojson'
import GraphHelpers from '../GraphHelpers'
import protobuf from 'protobufjs'
import path from 'path'
import fs from 'fs'

const PROTO_NAME = "pathfinding.proto"
const NODE_TYPE = "Pathfinding.Node"
const EDGE_TYPE = "Pathfinding.Edge"
const GRAPH_TYPE = "Pathfinding.Graph"
const OUTPUT_NAME = "graph_data.bin"

const preprocess = async (geoJson: FeatureCollection): Promise<void> => {
    const graphData = GraphHelpers.buildGraph(geoJson)
    const protoPath = path.resolve(__dirname, PROTO_NAME)

    const root = await protobuf.load(protoPath)
    const nodeType = root.lookupType(NODE_TYPE)
    const edgeType = root.lookupType(EDGE_TYPE)
    const graphType = root.lookupType(GRAPH_TYPE)

    const pbNodes = Array.from(graphData.allGraphNodes).map(([id, node]) => {
        const payload = {
            id: id.toString(),
            x: node.position[0].toString(),
            y: node.position[1].toString(),
        }
        return nodeType.create(payload)
    })

    const pbEdges = (
        (): protobuf.Message[] => {
            const arr: protobuf.Message[] = []
            graphData.adjacencyList.forEach((allNeighbourIDs, nodeID) => {
                allNeighbourIDs.forEach(neighbourID => {
                    const payload = {
                        fromID: nodeID.toString(),
                        toID: neighbourID.toString()
                    }
                    const edge = edgeType.create(payload)
                    arr.push(edge)
                })
            })
            return arr
        }
    )()

    const pbGraph = graphType.create({
        nodes: pbNodes,
        edges: pbEdges
    })

    const binaryData = graphType.encode(pbGraph).finish()
    const outputPath = path.resolve(__dirname, OUTPUT_NAME)
    fs.writeFileSync(outputPath, binaryData)

    console.log("Successfully written data to: ", outputPath)
}

// const deserialize = async (): Promise<void> => {
//     const protoPath = path.resolve(__dirname, PROTO_NAME)
//     const root = await protobuf.load(protoPath)
//     const graphType = root.lookupType(GRAPH_TYPE)

//     const inputPath = path.resolve(__dirname, OUTPUT_NAME)
//     const binaryData = fs.readFileSync(inputPath)

//     const deserializedGraph = graphType.decode(binaryData)
//     console.log("Deserialized Graph: ", deserializedGraph)
// }

try {
    await preprocess(singaporeRoadData as FeatureCollection)
} catch (err) {
    console.error((err as Error).message)
}