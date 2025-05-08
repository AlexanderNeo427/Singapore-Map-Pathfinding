import { useEffect, useRef } from 'react'

const useFrameTime = (): number => {
    const frameTimeRef = useRef<number>(0)

    useEffect(() => {
        let frameTimerHandle: number = 0
        let prevTimeElapsed: number = 0

        const tickFrameTimer = (globalTimeElapsed: number): void => {
            frameTimeRef.current = globalTimeElapsed - prevTimeElapsed
            prevTimeElapsed = globalTimeElapsed
            frameTimerHandle = requestAnimationFrame(tickFrameTimer)
        }
        frameTimerHandle = requestAnimationFrame(tickFrameTimer)

        return () => {
            cancelAnimationFrame(frameTimerHandle)
        }
    }, [])

    return frameTimeRef.current
}

export default useFrameTime