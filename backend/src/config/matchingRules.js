export const MATCHING_RULES = {
    EXACT:{
        fields:["transaction","amount"]
    },
    PARTIAL:{
        referenceField:"referenceNumber",
        amountVariancePercent:2
    },
    DUPLICATE:{
        uniquefield:"transactionId"
    }
}