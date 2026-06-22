import { useState } from 'react'
import { useAppData } from './hooks/useAppData'
import { BottomNav, type Tab } from './components/BottomNav'
import { GlucoseLogModal } from './components/GlucoseLogModal'
import { HomeScreen } from './screens/HomeScreen'
import { MedsScreen } from './screens/MedsScreen'
import { MealsScreen } from './screens/MealsScreen'
import { ExportScreen } from './screens/ExportScreen'

export default function App() {
  const data = useAppData()
  const [tab, setTab] = useState<Tab>('home')
  const [logging, setLogging] = useState(false)

  return (
    // Phone-first canvas, centered on larger screens.
    <div className="min-h-screen bg-sand-100 flex justify-center">
      <div className="relative w-full max-w-md bg-sand-100 min-h-screen pb-28">
        {data.loading ? (
          <div className="flex h-screen items-center justify-center text-primary-700/50">
            …
          </div>
        ) : (
          <main>
            {tab === 'home' && <HomeScreen data={data} onLog={() => setLogging(true)} />}
            {tab === 'meds' && <MedsScreen data={data} />}
            {tab === 'meals' && <MealsScreen data={data} />}
            {tab === 'export' && <ExportScreen data={data} />}
          </main>
        )}

        <div className="print:hidden">
          <BottomNav active={tab} onChange={setTab} onLog={() => setLogging(true)} />
        </div>

        {logging && (
          <GlucoseLogModal
            readings={data.readings}
            onSave={data.addReading}
            onClose={() => setLogging(false)}
          />
        )}
      </div>
    </div>
  )
}
