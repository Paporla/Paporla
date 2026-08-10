'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function RouteLoader() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)

  useEffect(() => {
    if (pathname !== prevPath) {
      setIsLoading(true)
      setPrevPath(pathname)
      const timer = setTimeout(() => setIsLoading(false), 500)
      return () => clearTimeout(timer)
    }
  }, [pathname, prevPath])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed top-0 left-0 h-0.5 bg-primary z-[9999]"
        />
      )}
    </AnimatePresence>
  )
}
