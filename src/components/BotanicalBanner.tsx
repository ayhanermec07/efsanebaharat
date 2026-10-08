import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import CategoryArtwork from './CategoryArtwork'
import '../styles/artistic-home.css'

export default function BotanicalBanner({ preview = false }: { preview?: boolean }) {
  const Heading = preview ? 'h2' : 'h1'
  return <div className="botanical-banner">
    <CategoryArtwork theme="spice" part="upper" className="botanical-banner-upper" />
    <CategoryArtwork theme="spice" part="lower" className="botanical-banner-lower" />
    <div className="botanical-banner-copy">
      <p className="botanical-banner-eyebrow">Mutfağınızın vazgeçilmezi</p>
      <Heading>Sofranın sırrı,<br />bir tutam baharat.</Heading>
      {preview ? <span className="botanical-banner-link">Baharatları keşfet <ArrowRight className="h-4 w-4" aria-hidden="true" /></span> : <Link to="/urunler" className="botanical-banner-link">Baharatları keşfet <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
    </div>
  </div>
}
