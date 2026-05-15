import {
  BookOpen,
  Bone,
  Car,
  Cpu,
  Flower2,
  Gem,
  Gift,
  GraduationCap,
  Hammer,
  Package,
  PawPrint,
  Pill,
  Scissors,
  Shirt,
  ShoppingCart,
  Sofa,
  Sparkles,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export const ICONES_CATEGORIA: Record<string, LucideIcon> = {
  'alimentos-bebidas': UtensilsCrossed,
  'vestuario-calcados': Shirt,
  'acessorios-joias': Gem,
  'farmacia-medicamentos': Pill,
  'beleza-cosmeticos': Sparkles,
  'saloes-estetica': Scissors,
  'saude-bem-estar': Stethoscope,
  'pet-shop': PawPrint,
  veterinaria: Bone,
  'eletronicos-tecnologia': Cpu,
  'casa-decoracao': Sofa,
  'construcao-ferramentas': Hammer,
  'papelaria-livraria': BookOpen,
  'brinquedos-presentes': Gift,
  'floricultura-plantas': Flower2,
  automotivo: Car,
  'mercado-conveniencia': ShoppingCart,
  'oficinas-manutencao': Wrench,
  'aulas-cursos': GraduationCap,
  outros: Package,
}

export function iconeDaCategoria(slug: string | null | undefined): LucideIcon {
  if (!slug) return Store
  return ICONES_CATEGORIA[slug] ?? Store
}
