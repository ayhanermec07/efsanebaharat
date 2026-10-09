import { Link } from 'react-router-dom'
import { ArtDecoration } from './ArtDecoration'
import '../styles/artistic-home.css'

export default function BotanicalBanner({ preview = false }: { preview?: boolean }) {
  const Heading = preview ? 'h2' : 'h1'
  return <div className="botanical-banner">
    <ArtDecoration kind="home-left" className="botanical-banner-upper" />
    <ArtDecoration kind="home-right" className="botanical-banner-lower" />
    <div className="botanical-banner-copy">
      <Heading>Sofranıza<br />her zaman lezzet</Heading>
      {preview ? <span className="botanical-banner-link">Ürünleri keşfet</span> : <Link to="/urunler" className="botanical-banner-link">Ürünleri keşfet</Link>}
    </div>
  </div>
}
