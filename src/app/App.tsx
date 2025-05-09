import { PATHFINDER_TYPE } from '../typescript/Declarations'
import MapRenderer, { MapRendererRef } from './MapRenderer'
import React, { useRef, useState } from 'react'
import OverlayGUI from './OverlayGUI'

const App: React.FC = () => {
  const [pathfinderType, setPathfinderType] = useState<PATHFINDER_TYPE>(PATHFINDER_TYPE.BFS)
  const mapRendererRef = useRef<MapRendererRef>(null)

  return (
    <div className="h-full w-full">
      <div className="flex flex-col items-center w-full h-full">
        <MapRenderer ref={mapRendererRef} pathfinderType={pathfinderType} />
        <OverlayGUI
          runClickHandler={() => mapRendererRef.current?.runPathfinding()}
          algoSetter={setPathfinderType}
        />
      </div>
    </div>
  )
}

export default App
