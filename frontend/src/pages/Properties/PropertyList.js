import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Search, MapPin } from 'lucide-react';

const PropertyList = ({ type = 'my' }) => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchProperties();
    }, [type]);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            let res;
            if (type === 'my') {
                res = await propertyService.getMyProperties();
            } else {
                res = await propertyService.searchProperties({ query: searchQuery, status: 'approved' });
            }
            setProperties(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (type === 'search') fetchProperties();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="text-gradient" style={{ margin: 0 }}>
                    {type === 'my' ? 'My Properties' : 'Marketplace'}
                </h1>
                {type === 'my' && (
                    <Button onClick={() => navigate('/properties/new')}>Register Property</Button>
                )}
            </div>

            {type === 'search' && (
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            placeholder="Search by survey number, state, or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button type="submit" variant="secondary" style={{ alignSelf: 'flex-start' }}>
                        <Search size={20} /> Search
                    </Button>
                </form>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Loading properties...</div>
            ) : properties.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No properties found.</p>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {properties.map(prop => (
                        <Card key={prop._id} hoverable onClick={() => navigate(`/properties/${prop._id}`)} style={{ cursor: 'pointer' }}>
                            <div style={{
                                height: '150px',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MapPin size={40} color="var(--primary)" opacity={0.5} />
                            </div>
                            <h3 style={{ marginBottom: '0.5rem' }}>{prop.state}, {prop.district}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                Survey No: {prop.surveyNumber} <br />
                                Area: {prop.area} sq.m
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    background: prop.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: prop.status === 'approved' ? 'var(--accent)' : 'var(--warning)',
                                    textTransform: 'capitalize'
                                }}>
                                    {prop.status}
                                </span>
                                <span style={{ fontWeight: '600' }}>₹{prop.marketValue?.toLocaleString()}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PropertyList;
