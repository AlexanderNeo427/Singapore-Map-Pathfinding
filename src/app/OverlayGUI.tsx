import Select, { StylesConfig, SingleValue } from 'react-select'
import { PATHFINDER_TYPE } from '../typescript/Declarations'
import React, { Dispatch, SetStateAction } from 'react'

type OptionType = {
  value: PATHFINDER_TYPE
  label: string
}

const ALL_OPTIONS = [
  {
    value: PATHFINDER_TYPE.BFS,
    label: 'Breadth-First Search',
  },
  {
    value: PATHFINDER_TYPE.DIJKSTRA,
    label: "Dijkstra's Algorithm",
  },
  {
    value: PATHFINDER_TYPE.AStar,
    label: 'A* Algorithm',
  },
  {
    value: PATHFINDER_TYPE.DFS,
    label: 'Depth-First Search',
  },
] as OptionType[]
const DEFAULT_OPTION = ALL_OPTIONS[0] as OptionType

export interface OverlayProps {
  algoSetter: Dispatch<SetStateAction<PATHFINDER_TYPE>>
  runClickHandler: () => void
}

const OverlayGUI: React.FC<OverlayProps> = (props) => {
  // const [isAnimating, setIsAnimating] = useState<boolean>(false)
  // const [animationSpeed, setAnimationSpeed] = useState<number>(1)

  const selectStyles: StylesConfig<OptionType> = {
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#4a5568' : '#fff',
      color: state.isFocused ? '#fff' : '#000',
    }),
    control: (provided) => ({
      ...provided,
      width: '240px',
    }),
  }

  return (
    <div className="absolute w-full h-full pointer-events-none">
      <div
        className="
            flex justify-start items-start rounded-2xl w-80 p-6
            pointer-events-auto bg-white/85 backdrop-blur-sm ml-5 mt-3
            shadow-lg border border-gray-200"
      >
        <div className="w-full flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Pathfinding Controls
          </h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              Algorithm
            </label>
            <Select<OptionType>
              options={ALL_OPTIONS}
              defaultValue={DEFAULT_OPTION}
              onChange={(option: SingleValue<OptionType>) => {
                props.algoSetter(
                  option?.value || PATHFINDER_TYPE.BFS
                )
              }}
              styles={selectStyles}
            />
          </div>

          <button
            className="
              flex-1 bg-blue-700 text-white-700 py-2 px-4 
              rounded-lg font-medium hover:bg-blue-500 
              transition-colors border border-gray-300
            "
            onClick={props.runClickHandler}
          >Run</button>
        </div>
      </div>
    </div>
  )
}

export default OverlayGUI
