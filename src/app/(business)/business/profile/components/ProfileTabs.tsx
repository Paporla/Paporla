'use client'

import { Store, Image, MapPin, Clock, Settings } from 'lucide-react'

const iconMap = { Store, Image, MapPin, Clock, Settings }

interface TabType {
  id: 'info' | 'images' | 'location' | 'hours' | 'settings'
  label: string
  icon: keyof typeof iconMap
}

interface ProfileTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: TabType[]
}

export default function ProfileTabs({ activeTab, onTabChange, tabs }: ProfileTabsProps) {
  return (
    <div className="flex gap-1 dark:bg-black/40 bg-gray-100 p-1 rounded-xl overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = iconMap[tab.icon]
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === tab.id
                ? 'dark:bg-black/60 bg-white dark:text-white text-gray-900 shadow-lg dark:border-white/10 border-gray-200 border'
                : 'dark:text-gray-500 text-gray-400 hover:dark:text-gray-300 hover:text-gray-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
