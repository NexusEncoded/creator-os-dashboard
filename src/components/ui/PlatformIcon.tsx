import { Instagram, Youtube, Twitch, Music2, Radio } from 'lucide-react'
import type { PlatformId } from '../../types'

const ICON_MAP: Record<PlatformId, typeof Instagram> = {
  'main-tiktok': Music2,
  'clips-tiktok': Music2,
  'main-instagram': Instagram,
  'clips-instagram': Instagram,
  'main-youtube': Youtube,
  'live-youtube': Radio,
  twitch: Twitch,
}

export function PlatformIcon({ platform, size = 18, color }: { platform: PlatformId; size?: number; color?: string }) {
  const Icon = ICON_MAP[platform]
  return <Icon size={size} color={color} strokeWidth={2} />
}
