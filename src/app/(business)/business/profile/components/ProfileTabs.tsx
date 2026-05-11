'use client';

import { Store, Image, MapPin, Clock, Settings } from 'lucide-react';

interface TabType {
  id: 'info' | 'images' | 'location' | 'hours' | 'settings';
  label: string;
  icon: string;
}

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  tabs: TabType[];
}

const iconMap = { Store, Image, MapPin, Clock, Settings };

export default function ProfileTabs({ activeTab, onTabChange, tabs }: ProfileTabsProps) {
  return (
    <div className="flex gap-1 bg-black/40 p-1 rounded-xl overflow-x-auto">
      {tabs.map(tab => {
        const Icon = iconMap[tab.icon as keyof typeof iconMap];
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === tab.id ? 'bg-black/60 text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}