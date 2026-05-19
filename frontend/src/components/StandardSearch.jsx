import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import ProductCard from './ProductCard';

const colorMap = {
  'Siyah': '#090d16',
  'Beyaz': '#ffffff',
  'Mavi': '#3b82f6',
  'Kırmızı': '#ef4444',
  'Yeşil': '#10b981',
  'Gri': '#6b7280',
  'Bej': '#d4bda1',
  'Bordo': '#800020',
  'Haki': '#606e57',
  'Kahverengi': '#8b4513',
  'Krem': '#fffdd0',
  'Lacivert': '#1e3a8a',
  'Mor': '#8b5cf6',
  'Pembe': '#ec4899',
  'Sarı': '#eab308',
  'Turuncu': '#f97316',
  'Antrasit': '#374151',
  'Çok Renkli': 'linear-gradient(45deg, #ef4444, #3b82f6, #eab308)'
};

const StandardSearch = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  
  // Filters state
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [color, setColor] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit
      };
      if (query) params.q = query;
      if (category) params.category = category;
      if (gender) params.gender = gender;
      if (color) params.color = color;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      const response = await axios.get('http://localhost:8000/api/products', { params });
      setProducts(response.data.products);
      setTotalPages(response.data.total_pages);
      setTotalCount(response.data.total_count);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, limit, category, gender, color]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handlePriceBlurOrEnter = (e) => {
    if (e.key && e.key !== 'Enter') return;
    setPage(1);
    fetchProducts();
  };

  const handleResetFilters = () => {
    setCategory('');
    setGender('');
    setColor('');
    setMinPrice('');
    setMaxPrice('');
    setQuery('');
    setPage(1);
  };

  return (
    <>
      <div className="sidebar glass">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Filters</h2>
          <button onClick={handleResetFilters} className="reset-btn" title="Reset Filters">
            <RefreshCw size={14} /> Clear
          </button>
        </div>
        
        <div className="filter-section">
          <h3>Category</h3>
          <div className="filter-chips">
            {['', 'Tişörtler', 'Gömlekler', 'Pantolonlar', 'Elbiseler', 'Kotlar', 'Spor Ayakkabılar', 'Günlük Ayakkabılar', 'Topuklu Ayakkabılar', 'Sandaletler', 'Üstler', 'Şortlar', 'El Çantaları', 'Sırt Çantaları', 'Saatler', 'Güneş Gözlükleri'].map(c => (
              <button 
                key={c || 'all'}
                className={`filter-chip ${category === c ? 'active' : ''}`}
                onClick={() => { setCategory(c); setPage(1); }}
              >
                {c || 'All Categories'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3>Gender</h3>
          <div className="filter-chips">
            {['', 'Erkek', 'Kadın', 'Unisex', 'Çocuk Erkek', 'Çocuk Kız'].map(g => (
              <button 
                key={g || 'all'}
                className={`filter-chip ${gender === g ? 'active' : ''}`}
                onClick={() => { setGender(g); setPage(1); }}
              >
                {g || 'All Genders'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3>Color</h3>
          <div className="color-options-grid">
            {['', 'Siyah', 'Beyaz', 'Mavi', 'Kırmızı', 'Yeşil', 'Gri', 'Bej', 'Bordo', 'Haki', 'Kahverengi', 'Krem', 'Lacivert', 'Mor', 'Pembe', 'Sarı', 'Turuncu', 'Antrasit', 'Çok Renkli'].map(c => {
              const bg = colorMap[c];
              return (
                <button 
                  key={c || 'all'}
                  className={`color-option-btn ${color === c ? 'active' : ''}`}
                  onClick={() => { setColor(c); setPage(1); }}
                  title={c || 'All Colors'}
                >
                  {c ? (
                    <span 
                      className="color-dot" 
                      style={{ 
                        background: bg,
                        border: c === 'Beyaz' || c === 'Krem' ? '1px solid rgba(255,255,255,0.4)' : 'none'
                      }}
                    />
                  ) : (
                    <span className="color-dot all-colors-dot" />
                  )}
                  <span className="color-name">{c || 'All'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-section">
          <h3>Price Range (₺)</h3>
          <div className="price-inputs">
            <input 
              type="number" 
              placeholder="Min" 
              className="price-input"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onBlur={handlePriceBlurOrEnter}
              onKeyDown={handlePriceBlurOrEnter}
            />
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
            <input 
              type="number" 
              placeholder="Max" 
              className="price-input"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={handlePriceBlurOrEnter}
              onKeyDown={handlePriceBlurOrEnter}
            />
          </div>
        </div>
      </div>

      <div className="results-area">
        <form className="search-bar-container glass" onSubmit={handleSearch}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={20} className="search-icon-inside" style={{ position: 'absolute', left: '1.25rem', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search for products, brands, styles, tags..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '3rem' }}
            />
          </div>
          <button type="submit" className="btn">
            Search
          </button>
        </form>

        <div className="results-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', color: 'var(--text-secondary)' }}>
          <div>
            Found <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{totalCount}</span> products
          </div>
          {totalPages > 0 && (
            <div>
              Page <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{page}</span> of {totalPages}
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <Loader2 className="spinner" size={40} />
            Loading products...
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="product-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-container glass">
                <button 
                  className="pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  &larr; Prev
                </button>
                
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                      return (
                        <button 
                          key={p}
                          className={`page-num-btn ${page === p ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (p === page - 3 || p === page + 3) {
                      return <span key={p} className="page-dots">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button 
                  className="pagination-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next &rarr;
                </button>

                <div className="limit-selector">
                  <span>Show:</span>
                  <select 
                    value={limit} 
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="limit-dropdown"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="no-results glass">
            No products found matching your criteria.
          </div>
        )}
      </div>
    </>
  );
};

export default StandardSearch;
