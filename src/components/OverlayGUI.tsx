import React, { useState } from 'react'
import Select, { StylesConfig, SingleValue } from 'react-select'
import { PATHFINDING_ALGO } from '../typescript/Declarations'

type OptionType = {
   value: PATHFINDING_ALGO;
   label: string;
}

export interface OverlayProps {
   algoSetter: (algo: PATHFINDING_ALGO) => void
   runClickHandler: () => void
}

const OverlayGUI: React.FC<OverlayProps> = props => {
   const [m_isAnimating, setIsAnimating] = useState<boolean>(false)
   const [m_animationSpeed, setAnimationSpeed] = useState<number>(1)

   const selectStyles: StylesConfig<OptionType> = {
      option: (provided, state) => ({
         ...provided,
         backgroundColor: state.isFocused ? '#4a5568' : '#fff',
         color: state.isFocused ? '#fff' : '#000',
      }),
      control: (provided) => ({
         ...provided,
         width: '240px',
      })
   }

   return (
      <div className='absolute w-full h-full pointer-events-none'>
         <div className='
            flex justify-start items-start rounded-2xl w-80 p-6
            pointer-events-auto bg-white/85 backdrop-blur-sm ml-10 mt-8
            shadow-lg border border-gray-200'
         >
            <div className='w-full flex flex-col gap-4'>
               <h2 className='text-xl font-semibold text-gray-800 mb-2'>
                  Pathfinding Controls
               </h2>

               <div className='flex flex-col gap-2'>
                  <label className='text-sm text-gray-600 font-medium'>
                     Algorithm
                  </label>
                  <Select<OptionType>
                     options={[
                        { value: PATHFINDING_ALGO.BFS, label: "Breadth-First Search" },
                        { value: PATHFINDING_ALGO.DIJKSTRA, label: "Dijkstra's Algorithm" },
                        { value: PATHFINDING_ALGO.AStar, label: "A* Algorithm" },
                        { value: PATHFINDING_ALGO.DFS, label: "Depth-First Search" }
                     ]}
                     defaultValue={{ value: PATHFINDING_ALGO.BFS, label: "Breadth First Search" }}
                     onChange={(option: SingleValue<OptionType>) => {
                        props.algoSetter(option?.value || PATHFINDING_ALGO.BFS)
                     }}
                     styles={selectStyles}
                  />
               </div>

               <div className='flex flex-col gap-2'>
                  <label className='text-sm text-gray-600 font-medium'>
                     Animation Speed
                  </label>
                  <input
                     type="range"
                     min="0.1"
                     max="2"
                     step="0.1"
                     value={m_animationSpeed}
                     onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className='flex justify-between text-xs text-gray-500'>
                     <span>Slower</span>
                     <span>Faster</span>
                  </div>
               </div>

               <div className='flex gap-3'>
                  <button
                     className='flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg
                        font-medium hover:bg-blue-600 transition-colors'
                     onClick={() => setIsAnimating(isAnimating => !isAnimating)}
                  >
                     {m_isAnimating ? 'Stop' : 'Start'} Animation
                  </button>

                  <button
                     className='flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg
                        font-medium hover:bg-gray-200 transition-colors border border-gray-300'
                     onClick={props.runClickHandler}
                  >
                     Reset
                  </button>
               </div>
            </div>
         </div>
      </div>
   )
}

export default OverlayGUI