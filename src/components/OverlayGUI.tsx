import React from 'react'
import Select from 'react-select'
import { PATHFINDING_ALGO } from '../typescript/Declarations'

export interface OverlayProps {
   algoSetter: (algo: PATHFINDING_ALGO) => void
   runClickHandler: () => void
}

const OverlayGUI: React.FC<OverlayProps> = props => {
   return (
      <div className='absolute w-full h-full pointer-events-none'>
         <div className='
         flex justify-start items-start rounded-2xl w-64 h-52 ml-10 mt-8
         pointer-events-auto bg-gray-300  shadow-md shadow-gray-500'
         >
            <div className='m-4 flex flex-col gap-3 justify-start items-start'>
               <button
                  className='
                  text-xl bg-slate-500 py-3 px-10 rounded-xl font-semibold
                hover:bg-slate-700 hover:cursor-pointer'
                  onClick={props.runClickHandler}>Run
               </button>

               <Select
                  options={[
                     { value: PATHFINDING_ALGO.BFS, label: "Breadth First Search" },
                     { value: PATHFINDING_ALGO.DIJKSTRA, label: "Dijkstra's Algorithm" },
                     { value: PATHFINDING_ALGO.AStar, label: "A* Algorithm" },
                  ]}
                  defaultValue={{ value: PATHFINDING_ALGO.BFS, label: "Breadth First Search" }}
                  onChange={algo => {
                     props.algoSetter(algo?.value || PATHFINDING_ALGO.BFS)
                  }}
               />
            </div>
         </div>
      </div>
   )
}

export default OverlayGUI