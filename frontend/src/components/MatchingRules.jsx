import { useEffect, useState } from 'react'
import api from '../api.js'

export default function MatchingRules({ onClose }) {
  const [rule, setRule] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get('/matching-rules')
      setRule(res.data)
    } catch (e) {
      console.error(e)
      setError('Failed to load rules')
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const payload = { amountTolerancePercent: Number(rule.amountTolerancePercent), considerReference: Boolean(rule.considerReference) }
      const res = await api.put('/matching-rules', payload)
      setRule(res.data)
      setSaving(false)
    } catch (e) {
      console.error(e)
      setError('Failed to save')
      setSaving(false)
    }
  }

  if (!rule) return <div>Loading rules...</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Matching Rules (admin)</h3>
        <button onClick={onClose} className="text-sm text-gray-600">Close</button>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="mb-2">
        <label className="block text-sm text-gray-700">Amount tolerance (%)</label>
        <input className="mt-1 px-2 py-1 border" type="number" value={rule.amountTolerancePercent} onChange={(e)=>setRule({...rule, amountTolerancePercent: e.target.value})} />
      </div>

      <div className="mb-4">
        <label className="inline-flex items-center">
          <input type="checkbox" checked={!!rule.considerReference} onChange={(e)=>setRule({...rule, considerReference: e.target.checked})} />
          <span className="ml-2 text-sm text-gray-700">Consider reference number in matching</span>
        </label>
      </div>

      <div className="flex space-x-2">
        <button onClick={save} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded">{saving? 'Saving...' : 'Save'}</button>
        <button onClick={load} className="px-3 py-1 bg-gray-200 rounded">Reload</button>
      </div>
    </div>
  )
}
