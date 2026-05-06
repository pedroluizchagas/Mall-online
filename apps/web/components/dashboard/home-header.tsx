import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

interface Props {
  ownerName: string
  email: string
}

export function HomeHeader({ ownerName, email }: Props) {
  const firstName = ownerName.split(' ')[0]
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
      <div>
        <h1 className="font-display text-[34px] leading-tight m-0">Olá, {firstName}!</h1>
        <div className="text-[15px] text-ink-3 mt-1.5">
          Aqui está a visão geral do seu negócio.
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
        >
          <Bell className="w-[15px] h-[15px] text-ink-2" />
        </button>
        <div
          className="flex items-center gap-2.5 rounded-full"
          style={{
            padding: '4px 14px 4px 4px',
            border: '1px solid var(--line)',
            background: 'var(--bg)',
          }}
        >
          <Avatar name={ownerName} size={32} />
          <div className="leading-tight">
            <div className="text-xs font-bold">{ownerName}</div>
            <div className="text-[10px] text-ink-3">{email}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
