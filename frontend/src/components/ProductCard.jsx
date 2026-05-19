import React from 'react';

const ProductCard = ({ product }) => {
  return (
    <div className="product-card glass">
      {/* Assuming backend serves images at /api/images/{image_path} */}
      <img 
        src={`http://localhost:8000/api/images/${product.image_path}`} 
        alt={product.title} 
        className="product-image"
        onError={(e) => { e.target.src = 'https://via.placeholder.com/250x250?text=No+Image' }}
      />
      <div className="product-info">
        <div className="product-brand">{product.brand}</div>
        <div className="product-title">{product.title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {product.category} • {product.gender}
        </div>
        <div className="product-price">₺{product.price.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default ProductCard;
