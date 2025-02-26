import * as THREE from "three";
import { SceneID } from "../SceneManager";

export default abstract class SceneBase extends THREE.Scene {
    constructor() {
        super()
    }

    abstract getCamera(): THREE.Camera
    abstract getSceneID(): SceneID

    abstract onCreate(): void
    abstract onEnter(): void
    abstract onTick(dt: number): void
    abstract onExit(): void
    abstract onDestroy(): void
}