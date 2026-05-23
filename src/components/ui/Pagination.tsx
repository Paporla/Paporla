'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
}

export default function Pagination({ currentPage, totalPages, onPageChange, siblingCount = 1 }: PaginationProps) {
  const generatePageNumbers = () => {
    const pages: (number | string)[] = []
    const totalNumbers = siblingCount * 2 + 3
    const totalBlocks = totalNumbers + 2

    if (totalPages <= totalBlocks) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const leftSibling = Math.max(currentPage - siblingCount, 1)
      const rightSibling = Math.min(currentPage + siblingCount, totalPages)
      const showLeftDots = leftSibling > 2
      const showRightDots = rightSibling < totalPages - 1

      if (!showLeftDots && showRightDots) {
        for (let i = 1; i <= totalNumbers - 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (showLeftDots && !showRightDots) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - (totalNumbers - 2); i <= totalPages; i++) {
          pages.push(i)
        }
      } else if (showLeftDots && showRightDots) {
        pages.push(1)
        pages.push('...')
        for (let i = leftSibling; i <= rightSibling; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-lg transition-all duration-300 ${
          currentPage === 1
            ? 'opacity-50 cursor-not-allowed dark:bg-gray-800 bg-gray-200'
            : 'hover:bg-primary/10 dark:text-gray-300 text-gray-700'
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </motion.button>

      <div className="flex gap-2">
        {generatePageNumbers().map((page, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            className={`min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all duration-300 ${
              page === currentPage
                ? 'bg-gradient-to-r from-primary to-primary/80 dark:text-white text-gray-900 shadow-lg shadow-primary/25'
                : page === '...'
                  ? 'cursor-default text-gray-500'
                  : 'hover:bg-primary/10 text-gray-700 dark:text-gray-300'
            }`}
            disabled={page === '...'}
          >
            {page}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-lg transition-all duration-300 ${
          currentPage === totalPages
            ? 'opacity-50 cursor-not-allowed dark:bg-gray-800 bg-gray-200'
            : 'hover:bg-primary/10 dark:text-gray-300 text-gray-700'
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </motion.button>
    </div>
  )
}
