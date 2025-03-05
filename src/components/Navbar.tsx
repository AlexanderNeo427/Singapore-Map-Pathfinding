import React from 'react'

export interface NavbarProps {
   runClickHandler: () => void
}

const Navbar: React.FC<NavbarProps> = props => {
   return (
      <div className='flex justify-center items-center w-full h-44 bg-gray-600'>
         <button 
            className='bg-white rounded-3xl text-black p-5 \
            hover:cursor-pointer hover:bg-gray-500 transition-colors'
            onClick={props.runClickHandler}>
         Run</button>
      </div>
   )
}

export default Navbar