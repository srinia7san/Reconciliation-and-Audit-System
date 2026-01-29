export const normalizeRecords = (rows,mapping)=>{
    return rows.map((row)=>{
        return {
            transactionId: row[mapping.transactionId],
            amount: Number(row[mapping.amount]),
            referenceNumber: row[mapping.referenceNumber] || null,
            
        }
    })
}