import React, { useEffect, useState } from 'react'

const Clock: React.FC = () => {
  const [time, setTime] = useState<string | undefined>('XX:XX:XXZ')

  useEffect(() => {
    setInterval(() => {
      const dateObject = new Date()

      const hour = dateObject.getUTCHours().toString()
      const minute = dateObject.getUTCMinutes().toString()
      const second = dateObject.getUTCSeconds().toString()

      const currentTime =
        hour.padStart(2, '0') + ':' + minute.padStart(2, '0') + ':' + second.padStart(2, '0') + 'Z'

      setTime(currentTime)
    }, 1000)
  }, [])
  return (
    <>
      <h5 className="my-1 mr-md-auto font-weight-normal m-2">{time}</h5>
    </>
  )
}

export default Clock
