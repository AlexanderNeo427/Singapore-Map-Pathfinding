import { useEffect, useState } from 'react'

interface TimeElapsedManagerData {
    timeElapsed: number,
    resetTimeElapsed: () => void
}

const useTimeElapsedManager = (): TimeElapsedManagerData => {
    const [timeElapsed, setTimeElapsed] = useState<number>(0)

    useEffect(() => {
        let timerHandle = 0
        let prevTimeElapsed = 0

        const updateTimeElapsed = (globalTimeElapsed: number): void => {
            const frameTime = globalTimeElapsed - prevTimeElapsed
            setTimeElapsed(oldTimeElapsed => {
                return oldTimeElapsed += frameTime
            })
            prevTimeElapsed = globalTimeElapsed
            timerHandle = requestAnimationFrame(updateTimeElapsed)
        }
        timerHandle = requestAnimationFrame(updateTimeElapsed)

        return () => {
            cancelAnimationFrame(timerHandle)
        }
    }, [])

    return {
        timeElapsed: timeElapsed,
        resetTimeElapsed: () => setTimeElapsed(0)
    } as TimeElapsedManagerData
}

export default useTimeElapsedManager