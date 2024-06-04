import React, { useCallback } from 'react'
import { Fullscreen, FullscreenExit } from 'react-bootstrap-icons'

interface MiniModeToggleButtonProps {
  showRestoreButton: boolean
}

const MiniModeToggleButton: React.FC<MiniModeToggleButtonProps> = ({ showRestoreButton }) => {
  const toggleMiniMode = useCallback(() => {
    window.api.toggleMiniMode().catch((error: unknown) => {
      console.error(error)
    })
  }, [])

  return (
    <button
      className="btn btn-primary m-2"
      style={{ lineHeight: 0, fontSize: '14px' }}
      onClick={toggleMiniMode}
    >
      {showRestoreButton ? (
        <Fullscreen
          title={'Switch to large mode'}
          style={{ strokeWidth: '0.5px', stroke: 'white' }}
        />
      ) : (
        <FullscreenExit
          title={'Switch to mini mode'}
          style={{ strokeWidth: '0.5px', stroke: 'white' }}
        />
      )}
    </button>
  )
}

export default MiniModeToggleButton
