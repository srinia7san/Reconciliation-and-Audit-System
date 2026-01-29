import { useState, useEffect } from "react";
import api from "../api.js";

function AuditTimeline({ recordId, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAuditLogs();
    }, [recordId]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/audit/record/${recordId}`);
            setLogs(response.data);
        } catch (err) {
            console.error("Error fetching audit logs:", err);
            setError("Failed to load audit history");
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case "create": return "bg-green-500";
            case "edit": case "update": return "bg-yellow-500";
            case "delete": return "bg-red-500";
            case "reconcile": return "bg-blue-500";
            case "upload": return "bg-purple-500";
            default: return "bg-gray-500";
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case "create": return "➕";
            case "edit": case "update": return "✏️";
            case "delete": return "🗑️";
            case "reconcile": return "🔄";
            case "upload": return "📤";
            default: return "📋";
        }
    };

    const formatChange = (oldVal, newVal, field) => {
        if (!oldVal && newVal) return <span className="text-green-600">Added: {JSON.stringify(newVal[field] || newVal)}</span>;
        if (oldVal && !newVal) return <span className="text-red-600">Removed: {JSON.stringify(oldVal[field] || oldVal)}</span>;
        if (oldVal && newVal && field) {
            const oldField = oldVal[field];
            const newField = newVal[field];
            if (oldField !== newField) {
                return (
                    <span>
                        <span className="text-red-600 line-through">{oldField}</span>
                        {" → "}
                        <span className="text-green-600">{newField}</span>
                    </span>
                );
            }
        }
        return null;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 min-w-[400px]">
                    <p className="text-center">Loading audit history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold">Audit Timeline</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {error && (
                        <div className="text-red-600 text-center py-4">{error}</div>
                    )}

                    {!error && logs.length === 0 && (
                        <div className="text-gray-500 text-center py-8">
                            No audit history found for this record.
                        </div>
                    )}

                    {logs.length > 0 && (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                            {/* Timeline items */}
                            <div className="space-y-6">
                                {logs.map((log, index) => (
                                    <div key={log._id || index} className="relative pl-10">
                                        {/* Timeline dot */}
                                        <div className={`absolute left-2 w-5 h-5 rounded-full ${getActionColor(log.action)} flex items-center justify-center text-white text-xs`}>
                                            {getActionIcon(log.action)}
                                        </div>

                                        {/* Content card */}
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold text-white ${getActionColor(log.action)}`}>
                                                    {log.action.toUpperCase()}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-700 mb-2">{log.description}</p>

                                            <div className="text-xs text-gray-500">
                                                By: {log.userId?.name || log.userId?.email || "Unknown"}
                                            </div>

                                            {/* Show field changes for edits */}
                                            {log.action === "edit" && log.oldValue && log.newValue && (
                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-600 mb-2">Changes:</p>
                                                    <div className="space-y-1 text-sm">
                                                        {["transactionId", "amount", "referenceNumber", "matchStatus"].map(field => {
                                                            const change = formatChange(log.oldValue, log.newValue, field);
                                                            return change ? (
                                                                <div key={field} className="flex">
                                                                    <span className="font-medium text-gray-600 w-32">{field}:</span>
                                                                    {change}
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuditTimeline;
