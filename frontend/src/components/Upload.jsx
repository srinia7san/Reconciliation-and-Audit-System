import { useState } from "react";
import api from "../api.js"
import DataTable from "./DataTable.jsx"
import ColumnMapper from "./ColumnMapper.jsx"

export default function Upload({ user, onUploadSuccess }) {
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState([])
    const [file, setFile] = useState(null)
    const [err, seterr] = useState("")
    const [jobId, setJobId] = useState(null)
    const [jobSummary, setJobSummary] = useState(null)
    const [showMapper, setShowMapper] = useState(false)
    const [selectedMapping, setSelectedMapping] = useState(null)

    const handleFileChange = (e) => {
        setFile(e.target.files[0])
        seterr("")
        setShowMapper(true)
        setSelectedMapping(null)
    }

    const handleMappingCancel = () => {
        setShowMapper(false)
        setFile(null)
        setSelectedMapping(null)
    }

    const handleMappingComplete = async (mapping) => {
        if (!file) {
            seterr("Please Upload the file!")
            return
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("columnMapping", JSON.stringify(mapping))

        try {
            setLoading(true)
            seterr("")
            const res = await api.post('/upload', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            setPreview(res.data.preview || [])
            if (res.data.jobId) setJobId(res.data.jobId)
            setShowMapper(false)
            setSelectedMapping(mapping)

            // Redirect to dashboard on success
            if (onUploadSuccess) {
                onUploadSuccess();
            } else {
                alert("Upload Complete! Go to Dashboard to see results.");
            }
        }
        catch (error) {
            console.log(error)
            seterr(error.response?.data?.message || "file upload failed please try again or later")
            setPreview([])
        }
        finally {
            setLoading(false)
        }
    }

    const fetchResults = async (id) => {
        try {
            const res = await api.get(`/upload/results/${id}`)
            setJobSummary(res.data)
        } catch (e) {
            console.error('Failed to fetch job results', e)
            seterr('Failed to fetch results')
        }
    }


    return (
        <>
            <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">Upload & Reconcile</h2>

                {showMapper && file ? (
                    <ColumnMapper
                        file={file}
                        onMappingComplete={handleMappingComplete}
                        onCancel={handleMappingCancel}
                    />
                ) : (
                    <>
                        <div className="mb-4">
                            <input className="p-3 bg-gray-100 border rounded w-full"
                                type="file"
                                accept=".csv,.xls,.xlsx"
                                onChange={handleFileChange}
                                disabled={loading}
                            />
                        </div>

                        {err && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {err}
                            </div>
                        )}
                    </>
                )}

                {jobId && !showMapper && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                        <p className="text-green-800"><strong>Job:</strong> {jobId}</p>
                        {selectedMapping && (
                            <p className="text-sm text-gray-600 mt-2">
                                <strong>Column Mapping:</strong> {selectedMapping.transactionId}, {selectedMapping.amount}, {selectedMapping.referenceNumber}
                            </p>
                        )}
                        <button
                            onClick={() => fetchResults(jobId)}
                            className="mt-2 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded"
                        >
                            View Job Results
                        </button>
                    </div>
                )}

                {jobSummary && (
                    <div className="mt-4 p-4 border border-gray-300 rounded bg-gray-50">
                        <h4 className="font-bold mb-2">Job Summary</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Filename:</strong> {jobSummary.filename}</p>
                            <p><strong>Status:</strong> {jobSummary.status}</p>
                            <p><strong>Total:</strong> {jobSummary.totalRecords}</p>
                            <p><strong>Matched:</strong> {jobSummary.matchedRecords}</p>
                            <p><strong>Partial:</strong> {jobSummary.partialMatches}</p>
                            <p><strong>Unmatched:</strong> {jobSummary.unmatchedRecords}</p>
                            <p><strong>Duplicates:</strong> {jobSummary.duplicates}</p>
                            <p><strong>Accuracy:</strong> {jobSummary.accuracy}%</p>
                        </div>
                    </div>
                )}

                {preview.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-bold mb-2">Preview ({preview.length} rows)</h3>
                        <DataTable data={preview} />
                    </div>
                )}
            </div>
        </>
    )

}