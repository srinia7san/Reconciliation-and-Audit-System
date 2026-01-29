import { useState, useEffect } from "react"
import api from "../api.js"
import DataTable from "./DataTable.jsx"

export default function ColumnMapper({ file, onMappingComplete, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [columns, setColumns] = useState([])
  const [sampleRows, setSampleRows] = useState([])
  const [mapping, setMapping] = useState({
    transactionId: "",
    amount: "",
    referenceNumber: ""
  })
  const [error, setError] = useState("")
  const [previewColumns, setPreviewColumns] = useState([])

  // Fetch preview on component mount
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true)
        setError("")
        
        const formData = new FormData()
        formData.append("file", file)
        
        const res = await api.post("/upload/preview", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        })
        
        setColumns(res.data.columns)
        setSampleRows(res.data.sampleRows)
        
        // Try auto-detect common column names
        const detectedMapping = { ...mapping }
        res.data.columns.forEach(col => {
          const lower = col.toLowerCase()
          if (lower.includes('transaction') || lower.includes('txn')) {
            detectedMapping.transactionId = col
          } else if (lower.includes('amount') || lower.includes('amt')) {
            detectedMapping.amount = col
          } else if (lower.includes('reference') || lower.includes('ref')) {
            detectedMapping.referenceNumber = col
          }
        })
        setMapping(detectedMapping)
      } catch (err) {
        setError(err.response?.data?.message || "Failed to preview file")
      } finally {
        setLoading(false)
      }
    }
    
    fetchPreview()
  }, [file])

  // Update preview columns when mapping changes
  useEffect(() => {
    if (mapping.transactionId || mapping.amount || mapping.referenceNumber) {
      const cols = []
      if (mapping.transactionId) cols.push(mapping.transactionId)
      if (mapping.amount) cols.push(mapping.amount)
      if (mapping.referenceNumber) cols.push(mapping.referenceNumber)
      setPreviewColumns(cols)
    }
  }, [mapping])

  const handleMappingChange = (field, value) => {
    setMapping(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    if (!mapping.transactionId || !mapping.amount || !mapping.referenceNumber) {
      setError("Please map all three required fields: Transaction ID, Amount, and Reference Number")
      return
    }
    
    if (mapping.transactionId === mapping.amount || 
        mapping.transactionId === mapping.referenceNumber || 
        mapping.amount === mapping.referenceNumber) {
      setError("Each field must map to a different column")
      return
    }
    
    onMappingComplete(mapping)
  }

  const filteredPreview = sampleRows.map(row => {
    const filtered = {}
    if (mapping.transactionId) filtered[mapping.transactionId] = row[mapping.transactionId]
    if (mapping.amount) filtered[mapping.amount] = row[mapping.amount]
    if (mapping.referenceNumber) filtered[mapping.referenceNumber] = row[mapping.referenceNumber]
    return filtered
  })

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">Analyzing file structure...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-lg mb-4">Column Mapping</h3>
        <p className="text-sm text-gray-600 mb-4">
          We detected {columns.length} columns in your file. Please map them to the required fields.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transaction ID Mapping */}
          <div>
            <label className="block text-sm font-semibold mb-2">Transaction ID *</label>
            <select
              value={mapping.transactionId}
              onChange={(e) => handleMappingChange('transactionId', e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Column --</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            {mapping.transactionId && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {mapping.transactionId}</p>
            )}
          </div>

          {/* Amount Mapping */}
          <div>
            <label className="block text-sm font-semibold mb-2">Amount *</label>
            <select
              value={mapping.amount}
              onChange={(e) => handleMappingChange('amount', e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Column --</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            {mapping.amount && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {mapping.amount}</p>
            )}
          </div>

          {/* Reference Number Mapping */}
          <div>
            <label className="block text-sm font-semibold mb-2">Reference Number *</label>
            <select
              value={mapping.referenceNumber}
              onChange={(e) => handleMappingChange('referenceNumber', e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Column --</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            {mapping.referenceNumber && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {mapping.referenceNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {filteredPreview.length > 0 && (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded">
          <h4 className="font-semibold mb-3">Preview (First {filteredPreview.length} rows)</h4>
          <div className="overflow-x-auto">
            <DataTable data={filteredPreview} />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!mapping.transactionId || !mapping.amount || !mapping.referenceNumber}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded font-semibold"
        >
          Confirm Mapping & Upload
        </button>
      </div>
    </div>
  )
}
