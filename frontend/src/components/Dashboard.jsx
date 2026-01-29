import { useState, useEffect } from "react";
import api from "../api.js";
import ReconciliationChart from "./ReconciliationChart.jsx";
import DataTable from "./DataTable.jsx";
import MatchingRules from "./MatchingRules.jsx";
import AuditTimeline from "./AuditTimeline.jsx";

function Dashboard({ user }) {
  const [uploadJobs, setUploadJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    processingJobs: 0,
    failedJobs: 0
  });
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [systemRecordFile, setSystemRecordFile] = useState(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemRecordUploads, setSystemRecordUploads] = useState([]);
  const [systemUploadsLoading, setSystemUploadsLoading] = useState(false);
  const [showSystemRecordsModal, setShowSystemRecordsModal] = useState(false);
  const [auditRecordId, setAuditRecordId] = useState(null);


  // Smart polling: only refresh if there are active jobs
  useEffect(() => {
    fetchUploadJobs();
    fetchStats();
    fetchSystemRecordUploads();

    // Check if we need to poll
    const hasActiveJobs = uploadJobs.some(job =>
      job.status === 'Processing' || job.status === 'Queued'
    );

    let interval;
    if (hasActiveJobs) {
      interval = setInterval(() => {
        fetchUploadJobs();
        fetchStats();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadJobs.some(job => job.status === 'Processing' || job.status === 'Queued')]);

  const fetchSystemRecordUploads = async () => {
    try {
      setSystemUploadsLoading(true);
      const response = await api.get('/system-records/uploads');
      setSystemRecordUploads(response.data);
    } catch (error) {
      console.error("Error fetching system record uploads:", error);
      setSystemRecordUploads([]);
    } finally {
      setSystemUploadsLoading(false);
    }
  };

  const deleteSystemRecordBatch = async (uploadId, filename) => {
    if (!window.confirm(`Are you sure you want to delete all records from "${filename}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    try {
      const response = await api.delete(`/system-records/uploads/${uploadId}`);
      alert(`✅ ${response.data.message}`);
      fetchSystemRecordUploads();
    } catch (error) {
      console.error("Error deleting system records:", error);
      alert(`❌ Failed to delete: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchUploadJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/upload-jobs');
      setUploadJobs(response.data);
    } catch (error) {
      console.error("Error fetching upload jobs:", error);
      setUploadJobs([]);
    } finally {
      setLoading(false);
    }
  };



  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "Processing": return "bg-yellow-100 text-yellow-800";
      case "Failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const viewRecords = async (jobId, status = 'all') => {
    try {
      setRecordsLoading(true);
      const res = await api.get(`/upload/records/${jobId}?status=${status}&limit=200`);
      setSelectedRecords(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch records', err);
      setSelectedRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleLoadSystemRecords = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xlsx,.xls';
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setSystemLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/system-records/load-system-records', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        alert(`✅ System records loaded successfully!\n\nLoaded ${response.data.count} records`);
        setSystemRecordFile(null);
        fetchSystemRecordUploads();
      } catch (error) {
        console.error('Failed to load system records:', error);
        alert(`❌ Failed to load system records:\n${error.response?.data?.message || error.message}`);
      } finally {
        setSystemLoading(false);
      }
    };
    fileInput.click();
  };



  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job? All associated records will be deleted.')) return;
    try {
      await api.delete(`/upload/${jobId}`);
      fetchUploadJobs(); // Refresh list
    } catch (err) {
      console.error("Error deleting job:", err);
      alert('Failed to delete job');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reconciliation Dashboard</h2>
        <div className="flex space-x-2">
          {user && user.role === 'admin' && (
            <button onClick={() => setShowRules(true)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Matching Rules</button>
          )}
          {user && (user.role === 'admin' || user.role === 'analyst') && (
            <button
              onClick={() => {
                setShowSystemRecordsModal(true);
                fetchSystemRecordUploads();
              }}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Manage System Records
            </button>
          )}
        </div>
      </div>



      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Total Uploads</h3>
          <p className="text-3xl font-bold">{stats.totalJobs}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Completed</h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.completedJobs}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Processing</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {stats.processingJobs}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Failed</h3>
          <p className="text-3xl font-bold text-red-600">
            {stats.failedJobs}
          </p>
        </div>
      </div>

      {/* Charts */}
      <ReconciliationChart uploadJobs={uploadJobs} />

      {/* System Records Modal would go here - removing inline table */}

      {/* Upload Jobs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Upload Jobs</h3>
        </div>

        {uploadJobs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No upload jobs found. Upload a file to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unmatched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duplicates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accuracy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadJobs.map((job) => (
                  <tr key={job._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.filename}
                      <div className="text-xs text-gray-400">{job.uploadedBy?.name || 'Unknown User'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.totalRecords || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => viewRecords(job._id, 'matched')}
                        className="text-green-600 hover:underline font-bold"
                      >
                        {job.matchedRecords || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => viewRecords(job._id, 'partial')}
                        className="text-yellow-600 hover:underline font-bold"
                      >
                        {job.partialMatches || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => viewRecords(job._id, 'unmatched')}
                        className="text-red-600 hover:underline font-bold"
                      >
                        {job.unmatchedRecords || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => viewRecords(job._id, 'duplicate')}
                        className="text-purple-600 hover:underline font-bold"
                      >
                        {job.duplicates || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.accuracy ? `${job.accuracy}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.processedAt ? new Date(job.processedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className="text-red-500 hover:text-red-700 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected records view */}
      <div className="mt-6">
        {recordsLoading && <div className="p-4 text-gray-600">Loading records...</div>}
        {!recordsLoading && selectedRecords.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Selected Records ({selectedRecords.length})</h3>
            <div className="mb-4 overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Transaction ID</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Reference</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Matched With (System)</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.map((r) => {
                    // Determine row highlighting based on match status
                    const getRowStyle = () => {
                      switch (r.matchStatus) {
                        case 'partial': return 'bg-yellow-50 border-l-4 border-yellow-400';
                        case 'unmatched': return 'bg-red-50 border-l-4 border-red-400';
                        case 'matched': return 'bg-green-50 border-l-4 border-green-400';
                        case 'duplicate': return 'bg-purple-50 border-l-4 border-purple-400';
                        default: return '';
                      }
                    };

                    const getStatusBadge = () => {
                      switch (r.matchStatus) {
                        case 'matched': return 'bg-green-100 text-green-800';
                        case 'partial': return 'bg-yellow-100 text-yellow-800';
                        case 'unmatched': return 'bg-red-100 text-red-800';
                        case 'duplicate': return 'bg-purple-100 text-purple-800';
                        default: return 'bg-gray-100 text-gray-800';
                      }
                    };

                    return (
                      <tr key={r._id} className={`border-b ${getRowStyle()}`}>
                        <td className="px-4 py-2">{r.transactionId}</td>
                        <td className={`px-4 py-2 ${r.matchStatus === 'partial' ? 'text-yellow-700 font-semibold' : ''}`}>
                          {r.amount}
                          {r.matchStatus === 'partial' && r.confidenceScore && (
                            <span className="ml-2 text-xs text-yellow-600">
                              ({r.confidenceScore.toFixed(1)}% diff)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">{r.referenceNumber}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge()}`}>
                            {r.matchStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {r.matchedWith ? (
                            <div>
                              <div><span className="font-semibold">ID:</span> {r.matchedWith.transactionId}</div>
                              <div><span className="font-semibold">Amt:</span> {r.matchedWith.amount}</div>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-2 space-x-1">
                          <button onClick={async () => {
                            const newTx = window.prompt('Transaction ID', r.transactionId)
                            const newAmount = window.prompt('Amount', r.amount)
                            const newRef = window.prompt('Reference', r.referenceNumber)
                            if (newTx === null && newAmount === null && newRef === null) return
                            try {
                              await api.patch(`/records/${r._id}`, { transactionId: newTx, amount: newAmount, referenceNumber: newRef })
                              viewRecords(r.uploadJobId, 'unmatched')
                            } catch (e) { console.error(e); alert('Failed to save') }
                          }} className="px-2 py-1 bg-yellow-400 text-white rounded text-xs">Edit</button>
                          <button onClick={async () => {
                            try {
                              await api.post(`/records/${r._id}/reconcile`)
                              viewRecords(r.uploadJobId, 'unmatched')
                            } catch (e) { console.error(e); alert('Reconcile failed') }
                          }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Reconcile</button>
                          <button
                            onClick={() => setAuditRecordId(r._id)}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                          >History</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showRules && user && user.role === 'admin' && (
          <div className="mt-6">
            <MatchingRules onClose={() => setShowRules(false)} />
          </div>
        )}
      </div>

      {/* System Records Modal */}
      {showSystemRecordsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">System Records Management</h3>
              <button onClick={() => setShowSystemRecordsModal(false)} className="text-gray-500 hover:text-gray-700 font-bold text-xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">
                  These are the "Truth" files loaded into the system. Reconciliations are compared against these records.
                </p>
                <button
                  onClick={handleLoadSystemRecords}
                  disabled={systemLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {systemLoading ? 'Uploading...' : '+ Load New System File'}
                </button>
              </div>

              {systemUploadsLoading ? (
                <div className="text-center py-10 text-gray-500">Loading records...</div>
              ) : systemRecordUploads.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded border border-dashed border-gray-300">
                  <p className="text-gray-500">No system records loaded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {systemRecordUploads.map((upload) => (
                        <tr key={upload._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{upload.filename}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{upload.recordCount || upload.totalRecords}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{upload.uploadedBy?.name || 'Unknown'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(upload.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => deleteSystemRecordBatch(upload._id, upload.filename)}
                              className="text-red-600 hover:text-red-900 border border-red-200 bg-red-50 px-3 py-1 rounded"
                            >
                              Delete Batch
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowSystemRecordsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Timeline Modal */}
      {auditRecordId && (
        <AuditTimeline
          recordId={auditRecordId}
          onClose={() => setAuditRecordId(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;