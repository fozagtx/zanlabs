import { Tooltip } from '@base-ui/react/tooltip'
import { AnchoredToasts } from './components/ui/CopyEmail'
import { About } from './sections/About'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { Header } from './sections/Header'
import { Hero } from './sections/Hero'
import { Work } from './sections/Work'

export default function App() {
  return (
    <Tooltip.Provider>
      <Header />
      <main>
        <Hero />
        <Work />
        <About />
        <Contact />
      </main>
      <Footer />
      <AnchoredToasts />
    </Tooltip.Provider>
  )
}
