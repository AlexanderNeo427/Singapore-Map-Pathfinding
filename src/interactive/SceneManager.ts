import SceneBase from './scenes/SceneBase';
import { Camera, WebGLRenderer } from 'three';

export enum SceneID {
    Pathfinding
}

export default class SceneManager {
    _scene: SceneBase | null
    _oldScene: SceneBase | null
    _allScenes: Map<number, SceneBase>
    _renderer: WebGLRenderer

    constructor(renderer: WebGLRenderer) {
        this._scene = null
        this._oldScene = null
        this._allScenes = new Map()
        this._renderer = renderer
    }

    registerScene(newScene: SceneBase): void {
        const idOfNewScene: SceneID = newScene.getSceneID()
        if (this._allScenes.has(idOfNewScene)) {
            console.error("Trying to register a scene that already exists")
            return
        }

        newScene.onCreate()
        this._allScenes.set(idOfNewScene, newScene)
        if (!this._scene) {
            this._scene = newScene
        }
    }

    setScene(sceneID: SceneID): void {
        if (this._oldScene && sceneID == this._oldScene.getSceneID()) {
            return
        }
        if (!this._allScenes.has(sceneID)) {
            console.error("Trying to set a scene that doesn't exist, or isn't registered")
            return
        }
        this._oldScene = this._allScenes.get(sceneID) as SceneBase
    }

    onUpdateAndRender(dt: number): void {
        if (this._scene != this._oldScene) {
            this._oldScene?.onExit()
            this._oldScene = this._scene
            this._scene?.onEnter()
        }
        if (this._scene && this._scene !== undefined) {
            this._scene.onTick(dt)
            this._renderer.render(this._scene, this._scene.getCamera())
        }
    }

    cleanup(): void {
        this._allScenes.forEach((scene, _DISCARD) => scene.onDestroy())
    }
}