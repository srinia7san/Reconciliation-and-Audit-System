/**
 * Smart Reconciliation Engine
 * Fully dynamic & rule-driven
 */

export function matchTransactions(source, target, rules) {
  const {
    transactionIdField,
    amountField,
    referenceField, // reserved for future enhancement
    amountTolerancePercent
  } = rules;

  const exactMatches = [];
  const partialMatches = [];
  const duplicates = [];
  const unmatched = [];

  const seenTransactionIds = new Set();
  const targetIndex = new Map();

  // Index target records for fast lookup
  target.forEach(record => {
    const txnId = record[transactionIdField];
    if (txnId) {
      targetIndex.set(txnId, record);
    }
  });

  // Compare source records against target
  source.forEach(record => {
    const txnId = record[transactionIdField];
    const amount = Number(record[amountField]);

    // Validation
    if (!txnId || isNaN(amount)) {
      unmatched.push(record);
      return;
    }

    // Duplicate detectionet me examine more file
    if (seenTransactionIds.has(txnId)) {
      duplicates.push(record);
      return;
    }
    seenTransactionIds.add(txnId);

    const targetRecord = targetIndex.get(txnId);

    // No match found
    if (!targetRecord) {
      unmatched.push(record);
      return;
    }

    const targetAmount = Number(targetRecord[amountField]);

    // Exact match
    if (amount === targetAmount) {
      exactMatches.push({
        source: record,
        target: targetRecord
      });
      return;
    }

    // Partial match (amount tolerance)
    const diffPercent =
      (Math.abs(amount - targetAmount) / targetAmount) * 100;

    if (diffPercent <= amountTolerancePercent) {
      partialMatches.push({
        source: record,
        target: targetRecord,
        differencePercent: diffPercent.toFixed(2)
      });
      return;
    }

    // Unmatched fallback
    unmatched.push(record);
  });

  return {
    summary: {
      totalSource: source.length,
      totalTarget: target.length,
      exact: exactMatches.length,
      partial: partialMatches.length,
      duplicate: duplicates.length,
      unmatched: unmatched.length
    },
    exactMatches,
    partialMatches,
    duplicates,
    unmatched
  };
}
