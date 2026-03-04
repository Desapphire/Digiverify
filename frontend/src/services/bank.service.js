import api from './api';

export const bankService = {
    // ── ASBA Fund Blocking ───────────────────────────────────────────
    requestFundBlock: (data) => api.post('/bank/fund-block', data), // { transactionId, blockAmount }
    confirmFundBlock: (id, bankReferenceId) => api.put(`/bank/fund-block/${id}/confirm`, { bankReferenceId }),
    getFundBlocks: (transactionId) => api.get(`/bank/fund-block/transaction/${transactionId}`),
};
