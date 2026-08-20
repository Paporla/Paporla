'use client'

import { Tag } from 'lucide-react'

const CATEGORIES = [
  {
    id: 'panaderia',
    name: 'Panaderia',
    template: {
      title: 'Pack Panaderia Artesanal',
      description: 'Pan recien horneado, croissants y pasteleria',
      price_cents: 3990,
      original_price_cents: 7990,
    },
  },
  {
    id: 'sushi',
    name: 'Sushi',
    template: {
      title: 'Pack Sushi Sorpresa',
      description: 'Sushi variado del dia',
      price_cents: 7990,
      original_price_cents: 15990,
    },
  },
  {
    id: 'pizza',
    name: 'Pizza',
    template: {
      title: 'Pack Pizza Familiar',
      description: 'Pizza grande 4 quesos o pepperoni',
      price_cents: 5990,
      original_price_cents: 12990,
    },
  },
  {
    id: 'cafe',
    name: 'Cafe',
    template: {
      title: 'Pack Cafe de Especialidad',
      description: 'Cafe artesanal + croissant',
      price_cents: 2990,
      original_price_cents: 5990,
    },
  },
  {
    id: 'healthy',
    name: 'Saludable',
    template: {
      title: 'Pack Bowl Vegano',
      description: 'Ensalada fresca con quinoa y vegetales',
      price_cents: 4990,
      original_price_cents: 9990,
    },
  },
]

interface FormData {
  title: string
  description: string
  price_cents: number
  original_price_cents: number
}

interface Props {
  selectedCategory: string | null
  onSelect: (id: string, template: FormData) => void
}

export default function PackCategoryTemplates({ selectedCategory, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-3 flex items-center gap-2">
        <Tag className="w-5 h-5 text-primary" />
        Plantillas rapidas (opcional)
      </label>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id, cat.template)}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              selectedCategory === cat.id
                ? 'bg-primary text-black font-medium'
                : 'dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-600 dark:hover:bg-white/10 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  )
}
