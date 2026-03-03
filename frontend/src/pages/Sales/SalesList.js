import React, { useState, useEffect } from 'react';
import { propertyService } from '../../services/property.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { ArrowLeftRight, Check, X } from 'lucide-react';

const SalesList = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const res = await propertyService.getMySales();
                setSales(res.data.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading sales...</div>;

    return (
        <div>
            <h1 className="text-gradient" style={{ marginBottom: '2rem' }}>My Transactions</h1>

            {sales.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No active or past transactions found.</p>
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sales.map(sale => (
                        <Card key={sale._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{
                                    padding: '1rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '50%'
                                }}>
                                    <ArrowLeftRight color="var(--primary)" size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Sale ID: {sale._id.substring(sale._id.length - 8)}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        Sale Price: <strong>₹{sale.saleValue?.toLocaleString()}</strong>
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    textTransform: 'capitalize'
                                }}>
                                    Status: {sale.status}
                                </span>

                                {sale.status === 'initiated' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button variant="outline" style={{ padding: '0.5rem' }} title="Cancel">
                                            <X size={16} color="var(--danger)" />
                                        </Button>
                                        <Button style={{ padding: '0.5rem 1rem' }}>Sign Agreement</Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SalesList;
