import * as THREE from 'three'
import { Feature, FeatureCollection, LineString, Position } from 'geojson';
import sgGeoData from '../../assets/sg_geodata.json'
import { Line2, LineGeometry, LineMaterial, OrbitControls } from 'three/examples/jsm/Addons.js';
import SceneBase from './SceneBase';
import { BoundingBox, SceneID } from '../Declarations';
import proj4 from 'proj4';

export default class ScenePathfinding extends SceneBase {
    _camera: THREE.OrthographicCamera
    _camControls: OrbitControls

    constructor(renderer: THREE.WebGLRenderer) {
        super()
        this._camera = new THREE.OrthographicCamera();
        this._camera.near = 1
        this._camera.far = 800
        this._camera.position.set(0, 0, 100)
        this._camera.updateProjectionMatrix()
        this._camControls = this._setupCamControls(this._camera, renderer)
    }

    onCreate(): void {
        // Get bounding box from geoData
        const geoData = sgGeoData as FeatureCollection
        const geoDataBBox: BoundingBox = this._getBoundingBox(geoData)

        // Use prev bounding box to set camera view 
        const botLeft: [number, number] = proj4(
            'EPSG:4326', 'EPSG:3857', [geoDataBBox.min.x, geoDataBBox.min.y]
        )
        const topRight: [number, number] = proj4(
            'EPSG:4326', 'EPSG:3857', [geoDataBBox.max.x, geoDataBBox.max.y]
        )
        this._camera.left = botLeft[0]
        this._camera.right = topRight[0]
        const adjustCameraForAspectRatio = () => {
            const aspectRatio: number = window.innerWidth / window.innerHeight;
            const camViewWidth: number = Math.abs(topRight[0] - botLeft[0])
            const targetViewHeight: number = (camViewWidth / aspectRatio)
            const yCenter: number = Math.abs(topRight[1] - botLeft[1]) * 0.5 + botLeft[1]
            this._camera.top = yCenter + (targetViewHeight * 0.5)
            this._camera.bottom = yCenter - (targetViewHeight * 0.5)
            this._camera.updateProjectionMatrix()
        }
        adjustCameraForAspectRatio()
        window.addEventListener('resize', adjustCameraForAspectRatio)

        // Create road lines
        geoData.features.forEach((feature: Feature) => {
            if (feature.geometry.type !== 'LineString') {
                return
            }
            const coordinates: Position[] = feature.geometry.coordinates
            const points = coordinates.flatMap((coord: Position) => {
                const projectedCoords = proj4('EPSG:4326', 'EPSG:3857', coord);
                return [projectedCoords[0], projectedCoords[1], 0]
            })

            const highwayType: string = feature.properties?.highway || ""

            const line = new Line2(
                new LineGeometry().setPositions(points),
                new LineMaterial({
                    color: this._getRoadColor(highwayType),
                    linewidth: this._getRoadWidth(highwayType),
                    worldUnits: false,
                    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
                })
            )
            this.add(line)
        })
    }

    onEnter(): void { }

    onTick(dt: number): void {
        this._camControls.update()
    }

    onExit(): void { }

    onDestroy(): void { }

    getCamera(): THREE.Camera {
        return this._camera
    }

    getSceneID(): SceneID {
        return SceneID.Pathfinding
    }

    _setupCamControls(camera: THREE.Camera, renderer: THREE.WebGLRenderer): OrbitControls {
        const camControls = new OrbitControls(camera, renderer.domElement)
        camControls.enableRotate = false
        camControls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY
        }
        camControls.panSpeed = 1
        camControls.zoomSpeed = 1.2
        camControls.position0.set(0, 0, 100)
        return camControls
    }

    _getBoundingBox(geoData: FeatureCollection): BoundingBox {
        const min = new THREE.Vector2(Infinity, Infinity)
        const max = new THREE.Vector2(-Infinity, -Infinity)
        geoData.features.forEach((feature: Feature) => {
            const coords: Position[] = (feature.geometry as LineString)?.coordinates
            if (!coords) {
                return
            }
            coords.forEach((pos: Position) => {
                const px: number = pos[0]
                const py: number = pos[1]

                min.x = Math.min(min.x, px)
                min.y = Math.min(min.y, py)
                max.x = Math.max(max.x, px)
                max.y = Math.max(max.y, py)
            })
        })
        return new BoundingBox(min, max)
    }

    _getBBoxCenter(bbox: BoundingBox): THREE.Vector2 {
        const dx: number = bbox.computeLength()
        const dy: number = bbox.computeHeight()
        return new THREE.Vector2(
            bbox.min.x + (dx * 0.5),
            bbox.min.y + (dy * 0.5)
        )
    }

    _getRoadWidth(highwayType: string): number {
        switch (highwayType) {
            case "primary": return 3.5
            case "secondary": return 3.0
            case "tertiary": return 2.4
            case "residential": return 1.8
            case "service": return 1.3
            case "footway": return 0.8
            case "steps": return 0.7
        }
        return 1
    }

    _getRoadColor(highwayType: string): THREE.Color {
        switch (highwayType) {
            case "primary": return new THREE.Color().setRGB(1, 1, 1)
            case "secondary": return new THREE.Color().setRGB(0.9, 0.9, 0.9)
            case "tertiary": return new THREE.Color().setRGB(0.8, 0.8, 0.8)
            case "residential": return new THREE.Color().setRGB(0.7, 0.7, 0.7)
            case "service": return new THREE.Color().setRGB(0.6, 0.6, 0.6)
        }
        return new THREE.Color().setRGB(1, 0.8, 0.6)
    }
}