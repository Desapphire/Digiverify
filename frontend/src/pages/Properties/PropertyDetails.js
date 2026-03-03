import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { MapPin, CheckCircle, FileText, AlertTriangle } from 'lucide-react';

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSaleModal, setShowSaleModal] = useState(false);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await propertyService.getProperty(id);
                setProperty(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading details...</div>;
    if (!property) return <div style={{ textAlign: 'center', padding: '3rem' }}>Property not found.</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="text-gradient" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={32} color="var(--primary)" />
                    Property Details
                </h1>
                <Button onClick={() => navigate(-1)} variant="outline">Back</Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                {/* Main Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card>
                        <h2>Location & Details</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>State / District</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{property.state} / {property.district}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Taluka / Village</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{property.taluka} / {property.village}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Survey Number</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{property.surveyNumber}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Area</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{property.area} sq.m</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Market Value</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--accent)' }}>₹{property.marketValue?.toLocaleString()}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Property Type</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500', textTransform: 'capitalize' }}>{property.propertyType}</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h2>Documents</h2>
                        {property.documents && property.documents.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                                {property.documents.map((doc, i) => (
                                    <li key={i} style={{
                                        padding: '1rem',
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        borderRadius: '8px',
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}>
                                        <FileText color="var(--secondary)" />
                                        <div>
                                            <p style={{ margin: 0 }}>{doc.documentType}</p>
                                            <a href={doc.ipfsHash} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>View Document</a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No documents uploaded.</p>
                        )}
                    </Card>
                </div>

                {/* Sidebar Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card style={{ textAlign: 'center' }}>
                        {property.status === 'approved' ? (
                            <CheckCircle size={48} color="var(--accent)" style={{ margin: '0 auto 1rem' }} />
                        ) : property.status === 'disputed' ? (
                            <AlertTriangle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                        ) : (
                            <AlertTriangle size={48} color="var(--warning)" style={{ margin: '0 auto 1rem' }} />
                        )}

                        <h3 style={{ textTransform: 'capitalize', color: property.status === 'approved' ? 'var(--accent)' : 'inherit' }}>
                            Status: {property.status}
                        </h3>

                        {property.hasEncumbrance && (
                            <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px' }}>
                                <strong>Encumbrance Found</strong>
                                <p style={{ fontSize: '0.8rem', margin: 0 }}>{property.encumbranceDetails}</p>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Button style={{ width: '100%' }} onClick={() => setShowSaleModal(true)}>Initiate Sale</Button>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal isOpen={showSaleModal} onClose={() => setShowSaleModal(false)} title="Initiate Sale">
                <p style={{ color: 'var(--text-muted)' }}>Enter the buyer's wallet address and the agreed sale price to initiate a transaction.</p>
                {/* Form will go here */}
                <Button variant="primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setShowSaleModal(false)}>Proceed to Setup</Button>
            </Modal>
        </div>
    );
};

export default PropertyDetails;
