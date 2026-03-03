import api from './api';

export const bankService = {
    requestFundBlock: (data) => api.post('/bank/fund-block', data), // { saleId, amount }
    confirmFundBlock: (id, data) => api.put(`/bank/fund-block/${id}/confirm`, data), // { transactionHash }
    releaseFunds: (id) => api.put(`/bank/fund-block/${id}/release`),
    getFundBlocks: (transactionId) => api.get(`/bank/fund-block/transaction/${transactionId}`),
};
