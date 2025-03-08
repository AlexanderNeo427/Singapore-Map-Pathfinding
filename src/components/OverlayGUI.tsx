import React from 'react'

export interface OverlayProps {
   runClickHandler: () => void
}

const OverlayGUI: React.FC<OverlayProps> = props => {
   return (
      <div className='absolute w-full h-full pointer-events-none'>
         <div className='
         flex flex-col justify-start items-start relative rounded-2xl w-72 h-80
         bg-gray-300 ml-10 mt-8 pointer-events-auto shadow-md shadow-gray-500'
         >
            <button className='
            text-xl bg-slate-500 m-4 py-3 px-4 rounded-xl font-semibold
            hover:bg-slate-700 hover:cursor-pointer'
               onClick={props.runClickHandler}>Le Buton</button>
         </div>
      </div>
   )
}

export default OverlayGUI