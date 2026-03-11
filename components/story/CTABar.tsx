interface CTABarProps {
  title: string
}

export function CTABar({ title }: CTABarProps) {
  const phone = process.env.NEXT_PUBLIC_PHONE ?? ''
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const encodedMsg = encodeURIComponent(`Hi, I'm interested in: ${title}`)
  const waUrl = `https://wa.me/${whatsapp}?text=${encodedMsg}`

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex gap-2 px-3 pb-4 pt-3
                 bg-gradient-to-t from-black/80 to-transparent"
      onClick={(e) => e.stopPropagation()}
    >
      <a
        href={`tel:${phone}`}
        className="flex-1 rounded-xl bg-white/10 backdrop-blur-sm border
                   border-white/20 py-3 text-center text-sm font-semibold
                   text-white hover:bg-white/20 transition-colors"
      >
        📞 Call
      </a>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 rounded-xl bg-green-600/90 backdrop-blur-sm py-3
                   text-center text-sm font-semibold text-white
                   hover:bg-green-500 transition-colors"
      >
        💬 WhatsApp
      </a>
    </div>
  )
}
